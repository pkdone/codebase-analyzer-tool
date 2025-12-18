/**
 * Error class to represent a problem during JSON processing and sanitization.
 * This error provides essential information for programmatic error handling:
 * the type of error (parse vs validation) and the underlying cause.
 * Rich contextual information (original content, sanitization steps, etc.) is logged
 * when the error is created rather than stored in the error object.
 */
import { LLMError, LLMErrorCode } from "../../types/llm-errors.types";

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
   * Constructor.
   */
  constructor(type: JsonProcessingErrorType, message: string, cause?: Error) {
    super(LLMErrorCode.BAD_RESPONSE_CONTENT, message, undefined, { cause });
    this.name = "JsonProcessingError";
    this.type = type;
  }
}
