/**
 * Error codes for different types of LLM errors.
 */
export enum LLMErrorCode {
  BAD_RESPONSE_CONTENT = "BAD_RESPONSE_CONTENT",
  BAD_RESPONSE_METADATA = "BAD_RESPONSE_METADATA",
  BAD_CONFIGURATION = "BAD_CONFIGURATION",
  REJECTION_RESPONSE = "REJECTION_RESPONSE",
}

/**
 * Error class to represent a problem using an LLM implementation.
 * Uses a code enum to differentiate error types instead of separate classes.
 */
export class LLMError extends Error {
  /**
   * The error code indicating the type of error.
   */
  readonly code: LLMErrorCode;

  /**
   * Optional details about the error (content, metadata, config, reason, etc.).
   */
  readonly details?: string;

  /**
   * Constructor.
   */
  constructor(code: LLMErrorCode, message: string, details?: unknown, options?: ErrorOptions) {
    const stringifiedDetails = details !== undefined ? JSON.stringify(details) : undefined;
    const fullMessage = stringifiedDetails ? `${message}: ${stringifiedDetails}` : message;
    super(fullMessage, options);
    this.name = "LLMError";
    this.code = code;
    this.details = stringifiedDetails;
  }
}
