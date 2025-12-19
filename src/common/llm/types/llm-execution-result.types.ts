import type { LLMContext } from "./llm.types";

/**
 * Error class for LLM execution pipeline failures
 */
export class LLMExecutionError extends Error {
  readonly resourceName: string;
  readonly context?: LLMContext;
  readonly errorCause?: unknown;

  constructor(message: string, resourceName: string, context?: LLMContext, cause?: unknown) {
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
