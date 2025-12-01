import { injectable, inject } from "tsyringe";
import {
  LLMContext,
  LLMFunction,
  LLMResponseStatus,
  LLMGeneratedContent,
  ResolvedLLMModelMetadata,
  LLMCompletionOptions,
  LLMCandidateFunction,
  LLMFunctionResponse,
} from "./types/llm.types";
import type { LLMRetryConfig } from "./providers/llm-provider.types";
import { RetryStrategy } from "./strategies/retry-strategy";
import { FallbackStrategy } from "./strategies/fallback-strategy";
import { PromptAdaptationStrategy } from "./strategies/prompt-adaptation-strategy";
import LLMStats from "./tracking/llm-stats";
import { llmTokens } from "../di/tokens";
import { hasSignificantSanitizationSteps } from "./json-processing/sanitizers";
import type { LLMExecutionResult } from "./types/llm-execution-result.types";
import { LLMExecutionError } from "./types/llm-execution-result.types";
import { logOneLineWarning } from "../common/utils/logging";

/**
 * Encapsulates the complex orchestration logic for executing LLM functions with retries,
 * fallbacks, and prompt adaptation. This class was extracted from LLMRouter to improve
 * separation of concerns and testability.
 */
@injectable()
export class LLMExecutionPipeline {
  constructor(
    private readonly retryStrategy: RetryStrategy,
    private readonly fallbackStrategy: FallbackStrategy,
    private readonly promptAdaptationStrategy: PromptAdaptationStrategy,
    @inject(llmTokens.LLMStats) private readonly llmStats: LLMStats,
  ) {}

  /**
   * Executes an LLM function applying a series of before and after non-functional aspects
   * (e.g. retries, switching LLM qualities, truncating large prompts).
   *
   * Context is just an optional object of key value pairs which will be retained with the LLM
   * request and subsequent response for convenient debugging and error logging context.
   */
  async execute<T = LLMGeneratedContent>(
    resourceName: string,
    prompt: string,
    context: LLMContext,
    llmFunctions: LLMFunction[],
    providerRetryConfig: LLMRetryConfig,
    modelsMetadata: Record<string, ResolvedLLMModelMetadata>,
    candidateModels?: LLMCandidateFunction[],
    completionOptions?: LLMCompletionOptions,
  ): Promise<LLMExecutionResult<T>> {
    try {
      const result = await this.iterateOverLLMFunctions(
        resourceName,
        prompt,
        context,
        llmFunctions,
        providerRetryConfig,
        modelsMetadata,
        candidateModels,
        completionOptions,
      );

      if (result) {
        if (hasSignificantSanitizationSteps(result.mutationSteps)) {
          this.llmStats.recordJsonMutated();
        }
        // result.generated has already been validated by JsonProcessor in the LLM function
        // against the Zod schema. The type assertion to T is safe as long as the caller
        // ensures the generic type T matches the Zod schema used in the LLM function.
        // If the schema and T drift out of sync, this will cause runtime errors.
        // The caller is responsible for ensuring type alignment between the schema and T.
        return {
          success: true,
          data: result.generated as T,
        };
      }

      logOneLineWarning(
        `Given-up on trying to fulfill the current prompt with an LLM for the following resource: '${resourceName}'`,
        context,
      );

      this.llmStats.recordFailure();
      return {
        success: false,
        error: new LLMExecutionError(
          `Failed to fulfill prompt for resource: '${resourceName}' after exhausting all retry and fallback strategies`,
          resourceName,
          context as unknown as Record<string, unknown>,
        ),
      };
    } catch (error: unknown) {
      logOneLineWarning(
        `Unable to process the following resource with an LLM due to a non-recoverable error for the following resource: '${resourceName}'`,
        { ...context, error },
      );

      this.llmStats.recordFailure();
      return {
        success: false,
        error: new LLMExecutionError(
          `Non-recoverable error while processing resource: '${resourceName}'`,
          resourceName,
          context as unknown as Record<string, unknown>,
          error,
        ),
      };
    }
  }

  /**
   * Iterates through available LLM functions, attempting each until successful completion
   * or all options are exhausted.
   */
  private async iterateOverLLMFunctions(
    resourceName: string,
    initialPrompt: string,
    context: LLMContext,
    llmFunctions: LLMFunction[],
    providerRetryConfig: LLMRetryConfig,
    modelsMetadata: Record<string, ResolvedLLMModelMetadata>,
    candidateModels?: LLMCandidateFunction[],
    completionOptions?: LLMCompletionOptions,
  ): Promise<LLMFunctionResponse | null> {
    let currentPrompt = initialPrompt;
    let llmFunctionIndex = 0;

    // Don't want to increment 'llmFuncIndex' before looping again, if going to crop prompt
    // (to enable us to try cropped prompt with same size LLM as last iteration)
    while (llmFunctionIndex < llmFunctions.length) {
      const llmResponse = await this.retryStrategy.executeWithRetries(
        llmFunctions[llmFunctionIndex],
        currentPrompt,
        context,
        providerRetryConfig,
        completionOptions,
      );

      if (llmResponse?.status === LLMResponseStatus.COMPLETED) {
        this.llmStats.recordSuccess();
        return llmResponse;
      } else if (llmResponse?.status === LLMResponseStatus.ERRORED) {
        logOneLineWarning("LLM Error for resource", { ...context, error: llmResponse.error });
        break;
      }

      const nextAction = this.fallbackStrategy.determineNextAction(
        llmResponse,
        llmFunctionIndex,
        llmFunctions.length,
        context,
        resourceName,
      );
      if (nextAction.shouldTerminate) break;

      if (nextAction.shouldCropPrompt && llmResponse) {
        currentPrompt = this.promptAdaptationStrategy.adaptPromptFromResponse(
          currentPrompt,
          llmResponse,
          modelsMetadata,
        );
        this.llmStats.recordCrop();

        if (currentPrompt.trim() === "") {
          logOneLineWarning(
            `Prompt became empty after cropping for resource '${resourceName}', terminating attempts.`,
            context,
          );
          break;
        }

        continue; // Try again with same LLM function but cropped prompt
      }

      if (nextAction.shouldSwitchToNextLLM) {
        if (candidateModels && llmFunctionIndex + 1 < candidateModels.length) {
          context.modelQuality = candidateModels[llmFunctionIndex + 1].modelQuality;
        }

        this.llmStats.recordSwitch();
        llmFunctionIndex++;
      }
    }

    return null;
  }
}
