import { injectable, inject } from "tsyringe";
import {
  LLMContext,
  LLMFunction,
  LLMResponseStatus,
  LLMGeneratedContent,
  ResolvedLLMModelMetadata,
  LLMCompletionOptions,
  LLMCandidateFunction,
  LLMOutputFormat,
} from "../types/llm.types";
import type { LLMRetryConfig } from "../providers/llm-provider.types";
import { RetryStrategy } from "./strategies/retry-strategy";
import { FallbackStrategy } from "./strategies/fallback-strategy";
import { PromptAdaptationStrategy } from "./strategies/prompt-adaptation-strategy";
import { JsonValidator } from "../json-processing/json-validator";
import { log, logErrorWithContext, logWithContext } from "./tracking/llm-context-logging";
import LLMStats from "./tracking/llm-stats";
import { TOKENS } from "../../di/tokens";

/**
 * Encapsulates the complex orchestration logic for executing LLM functions with retries,
 * fallbacks, and prompt adaptation. This class was extracted from LLMRouter to improve
 * separation of concerns and testability.
 */
@injectable()
export class LLMExecutionPipeline {
  private readonly jsonValidator = new JsonValidator();

  constructor(
    private readonly retryStrategy: RetryStrategy,
    private readonly fallbackStrategy: FallbackStrategy,
    private readonly promptAdaptationStrategy: PromptAdaptationStrategy,
    @inject(TOKENS.LLMStats) private readonly llmStats: LLMStats,
  ) {}

  /**
   * Executes an LLM function applying a series of before and after non-functional aspects
   * (e.g. retries, switching LLM qualities, truncating large prompts).
   *
   * Context is just an optional object of key value pairs which will be retained with the LLM
   * request and subsequent response for convenient debugging and error logging context.
   */
  async executeWithPipeline<T = LLMGeneratedContent>(
    resourceName: string,
    prompt: string,
    context: LLMContext,
    llmFunctions: LLMFunction[],
    providerRetryConfig: LLMRetryConfig,
    modelsMetadata: Record<string, ResolvedLLMModelMetadata>,
    candidateModels?: LLMCandidateFunction[],
    completionOptions?: LLMCompletionOptions,
  ): Promise<T | null> {
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
        const defaultOptions: LLMCompletionOptions = { outputFormat: LLMOutputFormat.TEXT };
        const validationResult = this.jsonValidator.validate(
          result,
          completionOptions ?? defaultOptions,
          resourceName,
        );

        if (validationResult.success) {
          return validationResult.data as T;
        }
        // Validation failed after successful LLM response
        log(
          `Validation failed for resource '${resourceName}': ${JSON.stringify(validationResult.issues)}`,
        );
      }

      log(
        `Given-up on trying to fulfill the current prompt with an LLM for the following resource: '${resourceName}'`,
      );
    } catch (error: unknown) {
      log(
        `Unable to process the following resource with an LLM due to a non-recoverable error for the following resource: '${resourceName}'`,
      );
      logErrorWithContext(error, context);
    }

    this.llmStats.recordFailure();
    return null;
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
  ): Promise<LLMGeneratedContent | null> {
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
        return llmResponse.generated ?? null;
      } else if (llmResponse?.status === LLMResponseStatus.ERRORED) {
        logErrorWithContext(llmResponse.error, context);
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
          logWithContext(
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
