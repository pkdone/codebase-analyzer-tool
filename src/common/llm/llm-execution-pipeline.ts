import type { LLMRequestContext, LLMExecutionContext } from "./types/llm-request.types";
import { toExecutionContext } from "./types/llm-request.types";
import type { ResolvedLLMModelMetadata } from "./types/llm-model.types";
import type { ExecutableCandidate } from "./types/llm-function.types";
import type {
  LLMResponsePayload,
  LLMCompletedResponse,
  LLMFunctionResponse,
} from "./types/llm-response.types";
import { isCompletedResponse, isErrorResponse } from "./types/llm-response.types";
import type { LLMRetryConfig } from "./providers/llm-provider.types";
import { RetryStrategy } from "./strategies/retry-strategy";
import { determineNextAction } from "./strategies/fallback-decision";
import { adaptPromptFromResponse } from "./strategies/prompt-adaptation-strategy";
import LLMExecutionStats from "./tracking/llm-execution-stats";
import { hasSignificantRepairs } from "./json-processing";
import { LLMExecutionError } from "./types/llm-execution-error.types";
import type { LLMResult } from "./types/llm-result.types";
import { llmOk, llmErr, createExecutionMetadata } from "./types/llm-result.types";
import { logWarn } from "../utils/logging";

/**
 * Result of executing a single candidate model.
 * Separates success, error, and retry-exhausted outcomes for clear control flow.
 */
interface SingleCandidateResult<T extends LLMResponsePayload> {
  /** The LLM response (may be success, error, or retry-exhausted status) */
  readonly response: LLMFunctionResponse<T> | null;
  /** The execution context used (includes modelKey) */
  readonly executionContext: LLMExecutionContext;
}

/**
 * Result of the fallback chain execution, containing both the response and candidate info.
 * Used to propagate which model actually succeeded for metadata tracking.
 */
interface FallbackChainSuccess<T extends LLMResponsePayload> {
  readonly response: LLMCompletedResponse<T>;
  readonly candidate: ExecutableCandidate<T>;
}

/**
 * Configuration for the LLM execution pipeline.
 * Injected at construction time to avoid passing on every execute() call.
 */
export interface LLMPipelineConfig {
  /** Retry configuration for handling overloaded/invalid responses */
  readonly retryConfig: LLMRetryConfig;
  /** Accessor function to retrieve aggregated model metadata from all providers */
  readonly getModelsMetadata: () => Record<string, ResolvedLLMModelMetadata>;
}

/**
 * Parameters for executing LLM functions with the execution pipeline.
 * Generic over the response data type T, enabling unified handling of both
 * completions (T = z.infer<S>) and embeddings (T = number[]).
 *
 * Uses LLMRequestContext because the specific model is not yet determined -
 * the pipeline will construct LLMExecutionContext when iterating through candidates.
 */
interface LLMExecutionParams<T extends LLMResponsePayload> {
  readonly resourceName: string;
  readonly content: string;
  readonly context: LLMRequestContext;
  /** Unified candidates with bound functions and metadata. For embeddings, pass a single-element array. */
  readonly candidates: ExecutableCandidate<T>[];
  /** Whether to retry on INVALID status. Default true (for completions). Set false for embeddings. */
  readonly retryOnInvalid?: boolean;
  /** Whether to track JSON mutation stats. Default true (for completions). Set false for embeddings. */
  readonly trackJsonMutations?: boolean;
}

/**
 * Parameters for completion execution (subset of full params with completion-specific defaults).
 * Uses LLMRequestContext because the specific model is determined by the fallback chain.
 */
export interface CompletionExecutionParams<T extends LLMResponsePayload> {
  readonly resourceName: string;
  readonly content: string;
  readonly context: LLMRequestContext;
  readonly candidates: ExecutableCandidate<T>[];
}

/**
 * Parameters for embedding execution (subset of full params with embedding-specific defaults).
 * Uses LLMRequestContext because the specific model is determined by the fallback chain.
 */
export interface EmbeddingExecutionParams {
  readonly resourceName: string;
  readonly content: string;
  readonly context: LLMRequestContext;
  readonly candidates: ExecutableCandidate<number[]>[];
}

/**
 * Encapsulates the complex orchestration logic for executing LLM functions with retries,
 * fallbacks, and prompt adaptation.
 *
 * Handles both completions and embeddings through a unified code path:
 * - Completions: Use executeCompletion() for retry-on-invalid and JSON mutation tracking
 * - Embeddings: Use executeEmbedding() for simpler execution without JSON features
 */
export class LLMExecutionPipeline {
  constructor(
    private readonly retryStrategy: RetryStrategy,
    private readonly llmStats: LLMExecutionStats,
    private readonly pipelineConfig: LLMPipelineConfig,
  ) {}

  /**
   * Execute a completion request with completion-appropriate settings.
   * Enables retry on invalid JSON and tracks JSON mutations.
   *
   * @param params Completion execution parameters
   * @returns LLMResult with the generated content and execution metadata, or an error
   */
  async executeCompletion<T extends LLMResponsePayload>(
    params: CompletionExecutionParams<T>,
  ): Promise<LLMResult<T>> {
    return this.execute({
      ...params,
      retryOnInvalid: true,
      trackJsonMutations: true,
    });
  }

  /**
   * Execute an embedding request with embedding-appropriate settings.
   * Disables retry on invalid (embeddings don't have JSON parsing) and JSON mutation tracking.
   *
   * @param params Embedding execution parameters
   * @returns LLMResult with the embedding vector and execution metadata, or an error
   */
  async executeEmbedding(params: EmbeddingExecutionParams): Promise<LLMResult<number[]>> {
    return this.execute({
      ...params,
      retryOnInvalid: false,
      trackJsonMutations: false,
    });
  }

  /**
   * Executes LLM functions applying a series of before and after non-functional aspects
   * (e.g. retries, switching between models in the fallback chain, truncating large prompts).
   *
   * This unified method handles both completions and embeddings:
   * - For completions: Pass bound functions with options, set retryOnInvalid=true
   * - For embeddings: Pass single function in array, set retryOnInvalid=false
   *
   * Generic over the response data type T for type-safe results.
   * Returns LLMResult with execution metadata identifying which model actually succeeded.
   */
  async execute<T extends LLMResponsePayload>(
    params: LLMExecutionParams<T>,
  ): Promise<LLMResult<T>> {
    const {
      resourceName,
      content,
      context,
      candidates,
      retryOnInvalid = true,
      trackJsonMutations = true,
    } = params;

    try {
      const result = await this.tryFallbackChain(
        resourceName,
        content,
        context,
        candidates,
        retryOnInvalid,
      );

      if (result) {
        // With discriminated union, we know completed responses have `generated` field
        if (trackJsonMutations && hasSignificantRepairs(result.response.repairs)) {
          this.llmStats.recordJsonMutated();
        }

        // Return success with metadata about which model actually executed
        return llmOk(
          result.response.generated,
          createExecutionMetadata(result.response.modelKey, result.candidate.providerFamily),
        );
      }

      logWarn(
        `Given-up on trying to fulfill the current prompt with an LLM for the following resource: '${resourceName}'`,
        context,
      );

      this.llmStats.recordFailure();
      return llmErr(
        new LLMExecutionError(
          `Failed to fulfill prompt for resource: '${resourceName}' after exhausting all retry and fallback strategies`,
          resourceName,
          context,
        ),
      );
    } catch (error: unknown) {
      logWarn(
        `Unable to process the following resource with an LLM due to a non-recoverable error for the following resource: '${resourceName}'`,
        { ...context, error },
      );

      this.llmStats.recordFailure();
      return llmErr(
        new LLMExecutionError(
          `Non-recoverable error while processing resource: '${resourceName}'`,
          resourceName,
          context,
          error,
        ),
      );
    }
  }

  /**
   * Tries each candidate in the fallback chain until one succeeds or all are exhausted.
   *
   * This unified method works for both completions and embeddings:
   * - Completions with multiple candidates: Full fallback support across N models
   * - Embeddings with single candidate: No fallback (naturally handled by array length check)
   *
   * Accepts LLMRequestContext (without modelKey) and constructs LLMExecutionContext
   * for each candidate by adding the candidate's modelKey.
   *
   * Returns both the response and the candidate that succeeded, enabling callers to
   * access the providerFamily for metadata tracking.
   *
   * Generic over the response data type T.
   */
  private async tryFallbackChain<T extends LLMResponsePayload>(
    resourceName: string,
    initialContent: string,
    requestContext: LLMRequestContext,
    candidates: ExecutableCandidate<T>[],
    retryOnInvalid = true,
  ): Promise<FallbackChainSuccess<T> | null> {
    let currentContent = initialContent;
    let candidateIndex = 0;

    // Loop through all available candidates in priority order
    // Don't increment index before looping again if going to crop prompt
    // (to enable trying cropped prompt with same model as last iteration)
    while (candidateIndex < candidates.length) {
      const candidate = candidates[candidateIndex];

      // Execute single candidate with retry logic
      const { response: llmResponse, executionContext } = await this.executeSingleCandidate(
        candidate,
        currentContent,
        requestContext,
        retryOnInvalid,
      );

      // Handle success - return both response and candidate for metadata
      if (llmResponse && isCompletedResponse(llmResponse)) {
        this.llmStats.recordSuccess();
        return { response: llmResponse, candidate };
      }

      // Handle explicit error (non-retryable)
      if (llmResponse && isErrorResponse(llmResponse)) {
        logWarn("LLM Error for resource", { ...executionContext, error: llmResponse.error });
        break;
      }

      // Determine next action for unsuccessful response
      const nextAction = determineNextAction(
        llmResponse,
        candidateIndex,
        candidates.length,
        executionContext,
        resourceName,
      );

      if (nextAction.shouldTerminate) break;

      if (nextAction.shouldCropPrompt && llmResponse) {
        currentContent = adaptPromptFromResponse(
          currentContent,
          llmResponse,
          this.pipelineConfig.getModelsMetadata(),
        );
        this.llmStats.recordCrop();

        if (currentContent.trim() === "") {
          logWarn(
            `Prompt became empty after cropping for resource '${resourceName}', terminating attempts.`,
            executionContext,
          );
          break;
        }

        continue; // Try again with same candidate but cropped prompt
      }

      if (nextAction.shouldSwitchToNextLLM) {
        this.llmStats.recordSwitch();
        candidateIndex++;
      }
    }

    return null;
  }

  /**
   * Executes a single candidate model with retry logic.
   * Separates the retry invocation from the fallback iteration logic.
   *
   * @param candidate The executable candidate to try
   * @param content The prompt content to send
   * @param requestContext The request context (without modelKey)
   * @param retryOnInvalid Whether to retry on INVALID status
   * @returns The response and execution context for further processing
   */
  private async executeSingleCandidate<T extends LLMResponsePayload>(
    candidate: ExecutableCandidate<T>,
    content: string,
    requestContext: LLMRequestContext,
    retryOnInvalid: boolean,
  ): Promise<SingleCandidateResult<T>> {
    // Construct execution context with mandatory modelKey from candidate
    const executionContext: LLMExecutionContext = toExecutionContext(
      requestContext,
      candidate.modelKey,
    );

    // Execute with retry strategy
    const response = await this.retryStrategy.executeWithRetries(
      candidate.execute,
      content,
      executionContext,
      this.pipelineConfig.retryConfig,
      retryOnInvalid,
    );

    return { response, executionContext };
  }
}
