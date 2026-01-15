import { AppError } from "../../errors/app-error";

/**
 * Error codes for different types of LLM errors.
 */
export enum LLMErrorCode {
  BAD_RESPONSE_CONTENT = "BAD_RESPONSE_CONTENT",
  BAD_RESPONSE_METADATA = "BAD_RESPONSE_METADATA",
  BAD_CONFIGURATION = "BAD_CONFIGURATION",
  REJECTION_RESPONSE = "REJECTION_RESPONSE",
  PROVIDER_ERROR = "PROVIDER_ERROR",
}

/**
 * Error class to represent a problem using an LLM implementation.
 * Extends AppError for consistent error handling and proper stack trace capture
 * across the application. Uses a code enum to differentiate error types instead
 * of separate classes.
 */
export class LLMError extends AppError {
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
   * @param code - The error code indicating the type of LLM error
   * @param message - The error message
   * @param details - Optional details about the error (will be JSON stringified)
   * @param options - Optional ErrorOptions containing cause for error chaining
   */
  constructor(code: LLMErrorCode, message: string, details?: unknown, options?: ErrorOptions) {
    const stringifiedDetails = details !== undefined ? JSON.stringify(details) : undefined;
    const fullMessage = stringifiedDetails ? `${message}: ${stringifiedDetails}` : message;
    // Extract cause from options and pass to AppError
    const cause = options?.cause instanceof Error ? options.cause : undefined;
    super(fullMessage, cause);
    this.code = code;
    this.details = stringifiedDetails;
  }
}
