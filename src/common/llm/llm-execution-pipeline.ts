import {
  LLMContext,
  LLMResponseStatus,
  ResolvedLLMModelMetadata,
  LLMCompletionOptions,
  LLMCandidateFunction,
  LLMFunctionResponse,
  LLMFunction,
  InferResponseType,
} from "./types/llm.types";
import type { LLMRetryConfig } from "./providers/llm-provider.types";
import { RetryStrategy } from "./strategies/retry-strategy";
import { determineNextAction } from "./strategies/fallback-strategy";
import { adaptPromptFromResponse } from "./strategies/prompt-adaptation-strategy";
import LLMStats from "./tracking/llm-stats";
import { hasSignificantSanitizationSteps } from "./json-processing/sanitizers";
import type { LLMExecutionResult } from "./types/llm-execution-result.types";
import { LLMExecutionError } from "./types/llm-execution-result.types";
import { logOneLineWarning } from "../utils/logging";

/**
 * Parameters for executing an LLM function with the execution pipeline.
 * Groups all execution parameters into a single object for better maintainability.
 */
export interface LLMExecutionParams<TOptions extends LLMCompletionOptions = LLMCompletionOptions> {
  readonly resourceName: string;
  readonly prompt: string;
  readonly context: LLMContext;
  readonly llmFunctions: LLMFunction[];
  readonly providerRetryConfig: LLMRetryConfig;
  readonly modelsMetadata: Record<string, ResolvedLLMModelMetadata>;
  readonly candidateModels?: LLMCandidateFunction[];
  readonly completionOptions?: TOptions;
}

/**
 * Encapsulates the complex orchestration logic for executing LLM functions with retries,
 * fallbacks, and prompt adaptation. This class was extracted from LLMRouter to improve
 * separation of concerns and testability.
 */
export class LLMExecutionPipeline {
  constructor(
    private readonly retryStrategy: RetryStrategy,
    private readonly llmStats: LLMStats,
  ) {}

  /**
   * Executes an LLM function applying a series of before and after non-functional aspects
   * (e.g. retries, switching LLM qualities, truncating large prompts).
   *
   * Context is just an optional object of key value pairs which will be retained with the LLM
   * request and subsequent response for convenient debugging and error logging context.
   *
   * The return type is inferred from completionOptions.jsonSchema, enabling end-to-end
   * type safety through the LLM call chain without requiring unsafe casts.
   */
  async execute<TOptions extends LLMCompletionOptions = LLMCompletionOptions>(
    params: LLMExecutionParams<TOptions>,
  ): Promise<LLMExecutionResult<InferResponseType<TOptions>>> {
    const {
      resourceName,
      prompt,
      context,
      llmFunctions,
      providerRetryConfig,
      modelsMetadata,
      candidateModels,
      completionOptions,
    } = params;

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
        // result.generated is now correctly typed based on TOptions.
        // Type safety is guaranteed at compile time through the InferResponseType helper.
        // The return type is inferred from the Zod schema provided in completionOptions.
        if (result.generated === undefined) {
          logOneLineWarning(
            `LLM response has COMPLETED status but generated content is undefined for resource: '${resourceName}'`,
            context,
          );
          return {
            success: false,
            error: new LLMExecutionError(
              `LLM response has COMPLETED status but generated content is undefined for resource: '${resourceName}'`,
              resourceName,
              context as unknown as Record<string, unknown>,
            ),
          };
        }
        // No unsafe cast needed - type flows through from TOptions
        return {
          success: true,
          data: result.generated,
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
   *
   * The return type is inferred from completionOptions.jsonSchema via TOptions.
   */
  private async iterateOverLLMFunctions<
    TOptions extends LLMCompletionOptions = LLMCompletionOptions,
  >(
    resourceName: string,
    initialPrompt: string,
    context: LLMContext,
    llmFunctions: LLMFunction[],
    providerRetryConfig: LLMRetryConfig,
    modelsMetadata: Record<string, ResolvedLLMModelMetadata>,
    candidateModels?: LLMCandidateFunction[],
    completionOptions?: TOptions,
  ): Promise<LLMFunctionResponse<InferResponseType<TOptions>> | null> {
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

      const nextAction = determineNextAction(
        llmResponse,
        llmFunctionIndex,
        llmFunctions.length,
        context,
        resourceName,
      );
      if (nextAction.shouldTerminate) break;

      if (nextAction.shouldCropPrompt && llmResponse) {
        currentPrompt = adaptPromptFromResponse(currentPrompt, llmResponse, modelsMetadata);
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
