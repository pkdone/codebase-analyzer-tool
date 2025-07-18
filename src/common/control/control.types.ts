import { FailedAttemptError } from "p-retry";

/**
 * Type to define the retry function with improved type safety using generics
 */
export type RetryFunc<TArgs extends unknown[], TReturn> = (...args: TArgs) => Promise<TReturn>;

/**
 * Type to define the check result function
 */
export type CheckResultThrowIfRetryFunc<T> = (result: T) => void;

/**
 * Type to define the log retry event function with status support
 * @template TStatus The type of status that can be associated with retry errors
 */
export type LogRetryEventFunc<TStatus = never> = (
  error: FailedAttemptError & { status?: TStatus },
) => void;
