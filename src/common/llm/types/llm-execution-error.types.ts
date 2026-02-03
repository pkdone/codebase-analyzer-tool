import type { LLMRequestContext } from "./llm-request.types";

/**
 * Error class for LLM execution pipeline failures.
 * Contains detailed context about the failure including the resource being processed,
 * the LLM context at the time of failure, and the underlying error cause if any.
 *
 * Uses LLMRequestContext because the error may be created before a specific model
 * is selected (e.g., when no candidates are available).
 */
export class LLMExecutionError extends Error {
  readonly resourceName: string;
  readonly context?: LLMRequestContext;
  readonly errorCause?: unknown;

  constructor(message: string, resourceName: string, context?: LLMRequestContext, cause?: unknown) {
    super(message);
    this.resourceName = resourceName;
    this.context = context;
    this.errorCause = cause;
  }
}
