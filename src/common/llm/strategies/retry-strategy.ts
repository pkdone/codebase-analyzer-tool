import pRetry, { FailedAttemptError } from "p-retry";
import type { LLMContext } from "../types/llm-request.types";
import type { LLMFunctionResponse, LLMGeneratedContent } from "../types/llm-response.types";
import type { BoundLLMFunction } from "../types/llm-function.types";
import { LLMResponseStatus } from "../types/llm-response.types";
import type { LLMRetryConfig } from "../providers/llm-provider.types";
import LLMExecutionStats from "../tracking/llm-execution-stats";

/**
 * Custom error class for retryable LLM operations
 */
class RetryableError extends Error {
  readonly retryableStatus: LLMResponseStatus;

  constructor(message: string, retryableStatus: LLMResponseStatus) {
    super(message);
    this.name = "RetryableError";
    this.retryableStatus = retryableStatus;
  }
}

// Type guard to check for retryable errors
function isRetryableError(error: unknown): error is RetryableError {
  return error instanceof RetryableError;
}

/**
 * Strategy class responsible for handling LLM function retries.
 */
export class RetryStrategy {
  constructor(private readonly llmStats: LLMExecutionStats) {}

  /**
   * Execute an LLM function with retry logic for overloaded or invalid responses.
   *
   * Generic over the response data type T, enabling unified handling of both
   * completions (T = z.infer<S>) and embeddings (T = number[]).
   *
   * When retries are exhausted due to OVERLOADED or INVALID responses, returns the last
   * response so the caller can see the actual failure reason. Returns null only when an
   * unexpected exception occurs and no valid response was ever received.
   *
   * @param llmFunction - A bound function ready for execution
   * @param content - The content/prompt to send to the LLM
   * @param context - The LLM context for logging and tracking
   * @param providerRetryConfig - Retry configuration from the provider
   * @param retryOnInvalid - Whether to retry on INVALID status (true for completions, false for embeddings)
   */
  async executeWithRetries<T extends LLMGeneratedContent>(
    llmFunction: BoundLLMFunction<T>,
    content: string,
    context: LLMContext,
    providerRetryConfig: LLMRetryConfig,
    retryOnInvalid = true,
  ): Promise<LLMFunctionResponse<T> | null> {
    let lastResponse: LLMFunctionResponse<T> | null = null;

    try {
      const result = await pRetry<LLMFunctionResponse<T>>(
        async (): Promise<LLMFunctionResponse<T>> => {
          const response: LLMFunctionResponse<T> = await llmFunction(content, context);
          lastResponse = response; // Capture before potentially throwing

          if (response.status === LLMResponseStatus.OVERLOADED) {
            throw new RetryableError("LLM is overloaded", LLMResponseStatus.OVERLOADED);
          } else if (retryOnInvalid && response.status === LLMResponseStatus.INVALID) {
            throw new RetryableError("LLM response is invalid", LLMResponseStatus.INVALID);
          }

          return response;
        },
        {
          retries: providerRetryConfig.maxRetryAttempts - 1, // p-retry uses `retries` (number of retries, not total attempts)
          minTimeout: providerRetryConfig.minRetryDelayMillis,
          maxTimeout: providerRetryConfig.maxRetryDelayMillis,
          randomize: true,
          onFailedAttempt: (error: FailedAttemptError) => {
            if (isRetryableError(error)) {
              this.classifyAndRecordRetry(error);
            }
          },
        },
      );
      return result;
    } catch {
      // Return the last response if we have one (retries exhausted for OVERLOADED/INVALID).
      // Return null only for unexpected exceptions where we never got a valid response.
      return lastResponse;
    }
  }

  /**
   * Classify retry error type and record appropriate retry statistics
   */
  private classifyAndRecordRetry(error: RetryableError) {
    if (error.retryableStatus === LLMResponseStatus.INVALID) {
      this.llmStats.recordHopefulRetry();
    } else if (error.retryableStatus === LLMResponseStatus.OVERLOADED) {
      this.llmStats.recordOverloadRetry();
    }
    // For other errors (non-retryable status errors), we don't log specific retry types
  }
}
