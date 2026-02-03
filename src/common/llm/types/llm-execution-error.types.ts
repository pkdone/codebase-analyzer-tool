import type { LLMContext } from "./llm-request.types";

/**
 * Error class for LLM execution pipeline failures.
 * Contains detailed context about the failure including the resource being processed,
 * the LLM context at the time of failure, and the underlying error cause if any.
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
