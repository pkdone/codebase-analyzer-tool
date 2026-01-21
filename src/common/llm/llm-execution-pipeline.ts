import type { LLMContext } from "./types/llm-request.types";
import type { ResolvedLLMModelMetadata } from "./types/llm-model.types";
import type { LLMCandidateFunction, BoundLLMFunction } from "./types/llm-function.types";
import type { LLMFunctionResponse, LLMGeneratedContent } from "./types/llm-response.types";
import { LLMResponseStatus } from "./types/llm-response.types";
import type { LLMRetryConfig } from "./providers/llm-provider.types";
import { RetryStrategy } from "./strategies/retry-strategy";
import { determineNextAction } from "./strategies/fallback-decision";
import { adaptPromptFromResponse } from "./strategies/prompt-adaptation-strategy";
import LLMExecutionStats from "./tracking/llm-execution-stats";
import { hasSignificantRepairs } from "./json-processing/sanitizers";
import type { LLMExecutionResult } from "./types/llm-execution-result.types";
import { LLMExecutionError } from "./types/llm-execution-result.types";
import { logWarn } from "../utils/logging";

/**
 * Parameters for executing LLM functions with the execution pipeline.
 * Generic over the response data type T, enabling unified handling of both
 * completions (T = z.infer<S>) and embeddings (T = number[]).
 */
interface LLMExecutionParams<T extends LLMGeneratedContent> {
  readonly resourceName: string;
  readonly content: string;
  readonly context: LLMContext;
  /** Bound functions ready for execution. For embeddings, pass a single-element array. */
  readonly llmFunctions: BoundLLMFunction<T>[];
  readonly providerRetryConfig: LLMRetryConfig;
  readonly modelsMetadata: Record<string, ResolvedLLMModelMetadata>;
  /** Candidate models for tracking model switches. Optional for embeddings. */
  readonly candidateModels?: LLMCandidateFunction[];
  /** Whether to retry on INVALID status. Default true (for completions). Set false for embeddings. */
  readonly retryOnInvalid?: boolean;
  /** Whether to track JSON mutation stats. Default true (for completions). Set false for embeddings. */
  readonly trackJsonMutations?: boolean;
}

/**
 * Encapsulates the complex orchestration logic for executing LLM functions with retries,
 * fallbacks, and prompt adaptation.
 *
 * Handles both completions and embeddings through a unified code path:
 * - Completions: Pass multiple bound functions for fallback support
 * - Embeddings: Pass a single-element array (no fallback, but still gets retries and cropping)
 */
export class LLMExecutionPipeline {
  constructor(
    private readonly retryStrategy: RetryStrategy,
    private readonly llmStats: LLMExecutionStats,
  ) {}

  /**
   * Executes LLM functions applying a series of before and after non-functional aspects
   * (e.g. retries, switching between models in the fallback chain, truncating large prompts).
   *
   * This unified method handles both completions and embeddings:
   * - For completions: Pass bound functions with options, set retryOnInvalid=true
   * - For embeddings: Pass single function in array, set retryOnInvalid=false
   *
   * Generic over the response data type T for type-safe results.
   */
  async execute<T extends LLMGeneratedContent>(
    params: LLMExecutionParams<T>,
  ): Promise<LLMExecutionResult<T>> {
    const {
      resourceName,
      content,
      context,
      llmFunctions,
      providerRetryConfig,
      modelsMetadata,
      candidateModels,
      retryOnInvalid = true,
      trackJsonMutations = true,
    } = params;

    try {
      const result = await this.tryFallbackChain(
        resourceName,
        content,
        context,
        llmFunctions,
        providerRetryConfig,
        modelsMetadata,
        candidateModels,
        retryOnInvalid,
      );

      if (result) {
        if (trackJsonMutations && hasSignificantRepairs(result.repairs)) {
          this.llmStats.recordJsonMutated();
        }

        // Check for undefined specifically to distinguish between "no content generated"
        // (undefined) and "content is null" (valid response type in LLMGeneratedContent)
        if (result.generated === undefined) {
          logWarn(
            `LLM response has COMPLETED status but generated no content for resource: '${resourceName}'`,
            context,
          );
          return {
            success: false,
            error: new LLMExecutionError(
              `LLM response has COMPLETED status but generated no content for resource: '${resourceName}'`,
              resourceName,
              context,
            ),
          };
        }

        return {
          success: true,
          data: result.generated,
        };
      }

      logWarn(
        `Given-up on trying to fulfill the current prompt with an LLM for the following resource: '${resourceName}'`,
        context,
      );

      this.llmStats.recordFailure();
      return {
        success: false,
        error: new LLMExecutionError(
          `Failed to fulfill prompt for resource: '${resourceName}' after exhausting all retry and fallback strategies`,
          resourceName,
          context,
        ),
      };
    } catch (error: unknown) {
      logWarn(
        `Unable to process the following resource with an LLM due to a non-recoverable error for the following resource: '${resourceName}'`,
        { ...context, error },
      );

      this.llmStats.recordFailure();
      return {
        success: false,
        error: new LLMExecutionError(
          `Non-recoverable error while processing resource: '${resourceName}'`,
          resourceName,
          context,
          error,
        ),
      };
    }
  }

  /**
   * Tries each LLM function in the fallback chain until one succeeds or all are exhausted.
   *
   * This unified method works for both completions and embeddings:
   * - Completions with multiple functions: Full fallback support across N models
   * - Embeddings with single function: No fallback (naturally handled by array length check)
   *
   * Generic over the response data type T.
   */
  private async tryFallbackChain<T extends LLMGeneratedContent>(
    resourceName: string,
    initialContent: string,
    context: LLMContext,
    llmFunctions: BoundLLMFunction<T>[],
    providerRetryConfig: LLMRetryConfig,
    modelsMetadata: Record<string, ResolvedLLMModelMetadata>,
    candidateModels?: LLMCandidateFunction[],
    retryOnInvalid = true,
  ): Promise<LLMFunctionResponse<T> | null> {
    let currentContent = initialContent;
    let llmFunctionIndex = 0;

    // Loop through all available LLM functions in priority order
    // Don't increment index before looping again if going to crop prompt
    // (to enable trying cropped prompt with same model as last iteration)
    while (llmFunctionIndex < llmFunctions.length) {
      const llmResponse = await this.retryStrategy.executeWithRetries(
        llmFunctions[llmFunctionIndex],
        currentContent,
        context,
        providerRetryConfig,
        retryOnInvalid,
      );

      if (llmResponse?.status === LLMResponseStatus.COMPLETED) {
        this.llmStats.recordSuccess();
        return llmResponse;
      } else if (llmResponse?.status === LLMResponseStatus.ERRORED) {
        logWarn("LLM Error for resource", { ...context, error: llmResponse.error });
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
        currentContent = adaptPromptFromResponse(currentContent, llmResponse, modelsMetadata);
        this.llmStats.recordCrop();

        if (currentContent.trim() === "") {
          logWarn(
            `Prompt became empty after cropping for resource '${resourceName}', terminating attempts.`,
            context,
          );
          break;
        }

        continue; // Try again with same LLM function but cropped prompt
      }

      if (nextAction.shouldSwitchToNextLLM) {
        // Update context with next model's key for logging purposes
        if (candidateModels && llmFunctionIndex + 1 < candidateModels.length) {
          context.modelKey = candidateModels[llmFunctionIndex + 1].modelKey;
        }

        this.llmStats.recordSwitch();
        llmFunctionIndex++;
      }
    }

    return null;
  }
}
