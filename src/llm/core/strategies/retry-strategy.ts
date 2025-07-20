import { injectable } from "tsyringe";
import { withRetry } from "../../../common/control/control-utils";
import { RetryFunc } from "../../../common/control/control.types";
import type {
  LLMFunction,
  LLMFunctionResponse,
  LLMContext,
  LLMCompletionOptions,
} from "../../llm.types";
import { LLMResponseStatus } from "../../llm.types";
import type { LLMRetryConfig } from "../../providers/llm-provider.types";
import { getRetryConfiguration } from "../../processing/msgProcessing/request-configurer";
import { FailedAttemptError } from "p-retry";
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
    const retryConfig = getRetryConfiguration(providerRetryConfig);

    const result = await withRetry<
      [string, LLMContext, LLMCompletionOptions?],
      LLMFunctionResponse,
      LLMResponseStatus.OVERLOADED | LLMResponseStatus.INVALID
    >(
      llmFunction as RetryFunc<[string, LLMContext, LLMCompletionOptions?], LLMFunctionResponse>,
      [prompt, context, completionOptions],
      this.checkResultThrowIfRetryFunc.bind(this),
      this.logRetryOrInvalidEvent.bind(this),
      retryConfig.maxAttempts,
      retryConfig.minRetryDelayMillis,
    );

    return result;
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
