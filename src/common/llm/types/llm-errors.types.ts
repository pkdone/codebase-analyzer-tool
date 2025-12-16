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
