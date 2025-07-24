import { injectable } from "tsyringe";
import pRetry, { FailedAttemptError } from "p-retry";
import type {
  LLMFunction,
  LLMFunctionResponse,
  LLMContext,
  LLMCompletionOptions,
} from "../../types/llm.types";
import { LLMResponseStatus } from "../../types/llm.types";
import type { LLMRetryConfig } from "../../providers/llm-provider.types";
import { llmConfig } from "../../llm.config";
import type LLMStats from "../utils/routerTracking/llm-stats";

/**
 * Strategy class responsible for handling LLM function retries.
 * Encapsulates retry logic that was previously embedded in LLMRouter.
 */
@injectable()
export class RetryStrategy {
  constructor(private readonly llmStats: LLMStats) {}

  /**
   * Execute an LLM function with retry logic for overloaded or invalid responses.
   */
  async executeWithRetries(
    llmFunction: LLMFunction,
    prompt: string,
    context: LLMContext,
    providerRetryConfig: LLMRetryConfig,
    completionOptions?: LLMCompletionOptions,
  ): Promise<LLMFunctionResponse | null> {
    const retryConfig = this.getRetryConfiguration(providerRetryConfig);

    try {
      return await pRetry(
        async () => {
          const result = await llmFunction(prompt, context, completionOptions);

          if (result.status === LLMResponseStatus.OVERLOADED) {
            const error = new Error("LLM is overloaded") as Error & {
              retryableStatus: LLMResponseStatus;
            };
            error.retryableStatus = LLMResponseStatus.OVERLOADED;
            throw error;
          } else if (result.status === LLMResponseStatus.INVALID) {
            const error = new Error("LLM response is invalid") as Error & {
              retryableStatus: LLMResponseStatus;
            };
            error.retryableStatus = LLMResponseStatus.INVALID;
            throw error;
          }

          return result;
        },
        {
          retries: retryConfig.maxAttempts - 1, // p-retry uses `retries` (number of retries, not total attempts)
          minTimeout: retryConfig.minRetryDelayMillis,
          onFailedAttempt: (error: FailedAttemptError) => {
            this.logRetryOrInvalidEvent(
              error as FailedAttemptError & { retryableStatus?: LLMResponseStatus },
            );
          },
        } as pRetry.Options,
      );
    } catch {
      // p-retry throws if all attempts fail - we catch it and return null
      return null;
    }
  }

  /**
   * Get retry configuration from provider-specific config with fallbacks to global config.
   */
  private getRetryConfiguration(providerRetryConfig: LLMRetryConfig) {
    return {
      maxAttempts:
        providerRetryConfig.maxRetryAttempts ?? llmConfig.DEFAULT_INVOKE_LLM_NUM_ATTEMPTS,
      minRetryDelayMillis:
        providerRetryConfig.minRetryDelayMillis ?? llmConfig.DEFAULT_MIN_RETRY_DELAY_MILLIS,
      maxRetryAdditionalDelayMillis:
        providerRetryConfig.maxRetryAdditionalDelayMillis ??
        llmConfig.DEFAULT_MAX_RETRY_ADDITIONAL_MILLIS,
      requestTimeoutMillis:
        providerRetryConfig.requestTimeoutMillis ?? llmConfig.DEFAULT_REQUEST_WAIT_TIMEOUT_MILLIS,
    };
  }

  /**
   * Log retry events with status-specific handling
   */
  private logRetryOrInvalidEvent(
    error: FailedAttemptError & { retryableStatus?: LLMResponseStatus },
  ) {
    if (error.retryableStatus === LLMResponseStatus.INVALID) {
      this.llmStats.recordHopefulRetry();
    } else if (error.retryableStatus === LLMResponseStatus.OVERLOADED) {
      this.llmStats.recordOverloadRetry();
    }
    // For other errors (non-retryable status errors), we don't log specific retry types
  }
}
