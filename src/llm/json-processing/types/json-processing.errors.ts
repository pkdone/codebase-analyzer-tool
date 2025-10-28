/**
 * Error class to represent a problem during JSON processing and sanitization.
 * This error provides rich debugging context including the original content,
 * the sanitized result, the list of sanitization steps that were applied,
 * and the type of error (parse vs validation) to enable programmatic error handling.
 */
import { LLMError } from "../../types/llm-errors.types";

/**
 * Enum defining the types of errors that can occur during JSON processing.
 * Used to distinguish between syntax errors (parse) and schema validation errors.
 */
export enum JsonProcessingErrorType {
  /** JSON syntax error - malformed JSON string */
  PARSE = "parse",
  /** Schema validation error - valid JSON but doesn't match expected schema */
  VALIDATION = "validation",
}

export class JsonProcessingError extends LLMError {
  /**
   * The type of error that occurred (parse or validation).
   */
  readonly type: JsonProcessingErrorType;

  /**
   * The original malformed JSON string received from the LLM.
   */
  readonly originalContent: string;

  /**
   * The content after all sanitization attempts were applied.
   */
  readonly sanitizedContent: string;

  /**
   * List of sanitization steps that were successfully applied.
   */
  readonly appliedSanitizers: readonly string[];

  /**
   * The underlying parsing or validation error that occurred.
   */
  readonly underlyingError?: Error;

  /**
   * Optional: the description of the last sanitizer that was applied before final failure.
   * Helps debugging which transformation still produced invalid JSON.
   */
  readonly lastSanitizer?: string;

  /**
   * Optional diagnostics collected from sanitizers (fine-grained repair notes)
   */
  readonly diagnostics?: readonly string[];

  /**
   * Constructor.
   */
  constructor(
    type: JsonProcessingErrorType,
    message: string,
    originalContent: string,
    sanitizedContent: string,
    appliedSanitizers: string[],
    underlyingError?: Error,
    lastSanitizer?: string,
    diagnostics?: readonly string[],
  ) {
    const context = {
      type,
      originalLength: originalContent.length,
      sanitizedLength: sanitizedContent.length,
      appliedSanitizers,
      underlyingError: underlyingError?.message,
      lastSanitizer,
      diagnosticsCount: diagnostics?.length ?? 0,
    };
    super(JsonProcessingError.name, LLMError.buildMessage(message, context), {
      cause: underlyingError,
    });
    this.type = type;
    this.originalContent = originalContent;
    this.sanitizedContent = sanitizedContent;
    this.appliedSanitizers = appliedSanitizers;
    this.underlyingError = underlyingError;
    this.lastSanitizer = lastSanitizer;
    this.diagnostics = diagnostics;
  }
}
