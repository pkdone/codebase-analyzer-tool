import pRetry, { FailedAttemptError } from "p-retry";
import type {
  LLMFunctionResponse,
  LLMContext,
  BoundLLMFunction,
  LLMGeneratedContent,
} from "../types/llm.types";
import { LLMResponseStatus } from "../types/llm.types";
import type { LLMRetryConfig } from "../providers/llm-provider.types";
import LLMStats from "../tracking/llm-stats";

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
 * Encapsulates retry logic that was previously embedded in LLMRouter.
 */
export class RetryStrategy {
  constructor(private readonly llmStats: LLMStats) {}

  /**
   * Execute an LLM function with retry logic for overloaded or invalid responses.
   *
   * Generic over the response data type T, enabling unified handling of both
   * completions (T = z.infer<S>) and embeddings (T = number[]).
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
    try {
      const result = await pRetry<LLMFunctionResponse<T>>(
        async (): Promise<LLMFunctionResponse<T>> => {
          const response: LLMFunctionResponse<T> = await llmFunction(content, context);

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
      // p-retry throws if all attempts fail - we catch it and return null
      return null;
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
