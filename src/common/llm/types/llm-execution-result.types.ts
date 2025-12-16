/**
 * Error class for LLM execution pipeline failures
 */
export class LLMExecutionError extends Error {
  readonly resourceName: string;
  readonly context?: Record<string, unknown>;
  readonly errorCause?: unknown;

  constructor(
    message: string,
    resourceName: string,
    context?: Record<string, unknown>,
    cause?: unknown,
  ) {
    super(message);
    this.resourceName = resourceName;
    this.context = context;
    this.errorCause = cause;
  }
}

/**
 * Discriminated union result type for LLM execution pipeline operations
 */
export type LLMExecutionResult<T> =
  | { success: true; data: T }
  | { success: false; error: LLMExecutionError };
