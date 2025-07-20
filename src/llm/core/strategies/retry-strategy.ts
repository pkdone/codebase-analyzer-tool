import { injectable } from "tsyringe";
import pRetry, { FailedAttemptError } from "p-retry";
import type {
  LLMFunction,
  LLMFunctionResponse,
  LLMContext,
  LLMCompletionOptions,
} from "../../llm.types";
import { LLMResponseStatus } from "../../llm.types";
import type { LLMRetryConfig } from "../../providers/llm-provider.types";
import { llmConfig } from "../../llm.config";
import type LLMStats from "../../processing/routerTracking/llm-stats";

// Custom error class with status field
export class RetryStatusError extends Error {
  constructor(
    message: string,
    readonly status: LLMResponseStatus.OVERLOADED | LLMResponseStatus.INVALID,
  ) {
    super(message);
    this.name = "RetryStatusError";
  }
}

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
          this.checkResultThrowIfRetryFunc(result);
          return result;
        },
        {
          retries: retryConfig.maxAttempts - 1, // p-retry uses `retries` (number of retries, not total attempts)
          minTimeout: retryConfig.minRetryDelayMillis,
          onFailedAttempt: (error: FailedAttemptError) => {
            this.logRetryOrInvalidEvent(
              error as FailedAttemptError & {
                status?: LLMResponseStatus.OVERLOADED | LLMResponseStatus.INVALID;
              },
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
   * Check the result and throw an error if the LLM is overloaded or the response is invalid
   */
  private checkResultThrowIfRetryFunc(result: LLMFunctionResponse) {
    if (result.status === LLMResponseStatus.OVERLOADED)
      throw new RetryStatusError("LLM is overloaded", LLMResponseStatus.OVERLOADED);
    if (result.status === LLMResponseStatus.INVALID)
      throw new RetryStatusError("LLM response is invalid", LLMResponseStatus.INVALID);
  }

  /**
   * Log retry events with status-specific handling
   */
  private logRetryOrInvalidEvent(
    error: FailedAttemptError & {
      status?: LLMResponseStatus.OVERLOADED | LLMResponseStatus.INVALID;
    },
  ) {
    if (error.status === LLMResponseStatus.INVALID) {
      this.llmStats.recordInvalidRetry();
    } else {
      this.llmStats.recordOverloadRetry();
    }
  }
}
