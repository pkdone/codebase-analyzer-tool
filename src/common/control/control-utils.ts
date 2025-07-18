import pRetry from "p-retry";
import { RetryFunc, CheckResultThrowIfRetryFunc, LogRetryEventFunc } from "./control.types";

interface FailedAttemptError<TStatus = never> extends Error {
  readonly attemptNumber: number;
  readonly retriesLeft: number;
  readonly status?: TStatus;
}

interface RetryOptions<TStatus = never> {
  retries?: number;
  minTimeout?: number;
  onFailedAttempt?: (error: FailedAttemptError<TStatus>) => void;
}

/**
 * Generic retry mechanism for asynchronous functions using exponential backoff.
 * It wraps the `p-retry` library to provide a consistent retry strategy.
 *
 * @template TArgs The arguments tuple type for the async function
 * @template TReturn The return type of the async function
 * @template TStatus The type of status that can be associated with retry errors
 * @param asyncTryFunc The asynchronous function to retry.
 * @param args Arguments to pass to the async function (now strongly typed).
 * @param checkResultThrowIfRetryFunc A function that takes the result and decides whether to retry.
 * @param logRetryEventFunc Function to call to record the retry event (optional).
 * @param maxAttempts Maximum number of attempts.
 * @param minRetryDelay Minimum delay between retries in milliseconds.
 * @returns The result of the asynchronous function, if successful.
 * @throws {Error} if all retry attempts fail.
 */
export async function withRetry<TArgs extends unknown[], TReturn, TStatus = never>(
  asyncTryFunc: RetryFunc<TArgs, TReturn>,
  args: TArgs,
  checkResultThrowIfRetryFunc: CheckResultThrowIfRetryFunc<TReturn>,
  logRetryEventFunc: LogRetryEventFunc<TStatus> | null = null,
  maxAttempts = 3,
  minRetryDelay = 7000,
): Promise<TReturn | null> {
  try {
    return await pRetry(
      async () => {
        const result = await asyncTryFunc(...args);
        checkResultThrowIfRetryFunc(result);
        return result;
      },
      {
        retries: maxAttempts - 1, // p-retry uses `retries` (number of retries, not total attempts)
        minTimeout: minRetryDelay,
        onFailedAttempt: (error: FailedAttemptError<TStatus>) => {
          if (logRetryEventFunc) logRetryEventFunc(error);
        },
      } as RetryOptions<TStatus>,
    );
  } catch {
    // p-retry throws if all attempts fail - we catch it and return null
    //console.error("All retry attempts failed");
    return null;
  }
}
