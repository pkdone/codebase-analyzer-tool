import { injectable, inject } from "tsyringe";
import pRetry, { FailedAttemptError } from "p-retry";
import type { LLMFunctionResponse, LLMContext, LLMCompletionOptions } from "../types/llm.types";
import { LLMResponseStatus } from "../types/llm.types";
import type { LLMRetryConfig } from "../providers/llm-provider.types";
import LLMStats from "../tracking/llm-stats";
import { llmTokens } from "../../di/tokens";

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
@injectable()
export class RetryStrategy {
  constructor(@inject(llmTokens.LLMStats) private readonly llmStats: LLMStats) {}

  /**
   * Execute an LLM function with retry logic for overloaded or invalid responses.
   */
  async executeWithRetries<T = unknown>(
    llmFunction: (
      content: string,
      context: LLMContext,
      options?: LLMCompletionOptions,
    ) => Promise<LLMFunctionResponse<T>>,
    prompt: string,
    context: LLMContext,
    providerRetryConfig: LLMRetryConfig,
    completionOptions?: LLMCompletionOptions,
  ): Promise<LLMFunctionResponse<T> | null> {
    try {
      return await pRetry(
        async () => {
          const result = await llmFunction(prompt, context, completionOptions);

          if (result.status === LLMResponseStatus.OVERLOADED) {
            throw new RetryableError("LLM is overloaded", LLMResponseStatus.OVERLOADED);
          } else if (result.status === LLMResponseStatus.INVALID) {
            throw new RetryableError("LLM response is invalid", LLMResponseStatus.INVALID);
          }

          return result;
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
        } as pRetry.Options,
      );
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
