/** Contextual error types introduced in Phase 1. */
export class JsonProcessingBaseError extends Error {
  readonly resourceName: string;
  readonly phase: string;
  constructor(message: string, resourceName: string, phase: string) {
    super(message);
    this.resourceName = resourceName;
    this.phase = phase;
  }
}

export class JsonFastPathError extends JsonProcessingBaseError {
  constructor(message: string, resourceName: string) {
    super(message, resourceName, "fast-path");
  }
}

export class JsonProgressiveStrategyError extends JsonProcessingBaseError {
  readonly strategy: string;
  constructor(message: string, resourceName: string, strategy: string) {
    super(message, resourceName, "progressive-strategy");
    this.strategy = strategy;
  }
}

export class JsonSchemaValidationError extends JsonProcessingBaseError {
  readonly issues: unknown;
  constructor(message: string, resourceName: string, issues: unknown) {
    super(message, resourceName, "schema-validation");
    this.issues = issues;
  }
}
