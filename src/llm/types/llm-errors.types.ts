/**
 * Abstract error class to represent a generic problem using an LLM implementation.
 */
export abstract class LLMError extends Error {
  /**
   * Constructor.
   */
  constructor(name: string, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = name;
  }

  /**
   * Protected helper method to build consistent error messages with payload information.
   */
  protected static buildMessage(msg: string, payload?: unknown): string {
    const stringifiedPayload = JSON.stringify(payload);
    const suffix = stringifiedPayload ? `: ${stringifiedPayload}` : "";
    return `${msg}${suffix}`;
  }
}

/**
 * Error class to represent a problem with the content received from an LLM implementation.
 */
export class BadResponseContentLLMError extends LLMError {
  /**
   * The content received in the LLM implementation's response.
   */
  readonly content: string;

  /**
   * Constructor.
   */
  constructor(message: string, content?: unknown, options?: ErrorOptions) {
    super(BadResponseContentLLMError.name, LLMError.buildMessage(message, content), options);
    this.content = JSON.stringify(content);
  }
}

/**
 * Error class to represent a problem with the metadata received from an LLM implementation's
 * response.
 */
export class BadResponseMetadataLLMError extends LLMError {
  /**
   * The metadata received from the LLM implementation.
   */
  readonly metadata: string;

  /**
   * Constructor.
   */
  constructor(message: string, metadata?: unknown, options?: ErrorOptions) {
    super(BadResponseMetadataLLMError.name, LLMError.buildMessage(message, metadata), options);
    this.metadata = JSON.stringify(metadata);
  }
}

/**
 * Error class to represent a problem with the configuration used to initialize LLM implementation.
 */
export class BadConfigurationLLMError extends LLMError {
  /**
   * The configuration used to initiatize the LLM implementation.
   */
  readonly config: string;

  /**
   * Constructor.
   */
  constructor(message: string, config?: unknown, options?: ErrorOptions) {
    super(BadConfigurationLLMError.name, LLMError.buildMessage(message, config), options);
    this.config = JSON.stringify(config);
  }
}

/**
 * Error class to indicate that the LLM implementation rejected the request.
 */
export class RejectionResponseLLMError extends LLMError {
  /**
   * The rejection reason received from the LLM implementation.
   */
  readonly reason: string;

  /**
   * Constructor.
   */
  constructor(message: string, reason?: unknown, options?: ErrorOptions) {
    super(RejectionResponseLLMError.name, LLMError.buildMessage(message, reason), options);
    this.reason = JSON.stringify(reason);
  }
}

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

/**
 * Error class to represent a problem during JSON processing and sanitization.
 * This error provides rich debugging context including the original content,
 * the sanitized result, the list of sanitization steps that were applied,
 * and the type of error (parse vs validation) to enable programmatic error handling.
 */
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
