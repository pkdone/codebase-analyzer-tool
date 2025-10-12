import {
  LLMError,
  BadResponseContentLLMError,
  BadResponseMetadataLLMError,
  BadConfigurationLLMError,
  RejectionResponseLLMError,
  JsonProcessingError,
} from "../../../src/llm/types/llm-errors.types";

/**
 * Tests for LLM error classes, specifically testing the ES2022 error cause feature.
 * These tests verify that errors can be properly chained using the cause property.
 */
describe("LLM Error Classes - ES2022 Error Cause Support", () => {
  describe("BadResponseContentLLMError", () => {
    it("should create error without cause", () => {
      const error = new BadResponseContentLLMError("Bad content", { data: "test" });

      expect(error.name).toBe("BadResponseContentLLMError");
      expect(error.message).toContain("Bad content");
      expect(error.content).toContain("test");
      expect(error.cause).toBeUndefined();
    });

    it("should create error with cause", () => {
      const originalError = new Error("Original error");
      const error = new BadResponseContentLLMError(
        "Bad content",
        { data: "test" },
        { cause: originalError },
      );

      expect(error.cause).toBe(originalError);
      expect(error.message).toContain("Bad content");
    });

    it("should preserve error cause in error chain", () => {
      const rootCause = new TypeError("Type mismatch");
      const error = new BadResponseContentLLMError(
        "Invalid response structure",
        { received: "null" },
        { cause: rootCause },
      );

      expect(error.cause).toBe(rootCause);
      expect((error.cause as Error).message).toBe("Type mismatch");
      expect((error.cause as Error).name).toBe("TypeError");
    });
  });

  describe("BadResponseMetadataLLMError", () => {
    it("should create error without cause", () => {
      const error = new BadResponseMetadataLLMError("Bad metadata", { tokens: -1 });

      expect(error.name).toBe("BadResponseMetadataLLMError");
      expect(error.message).toContain("Bad metadata");
      expect(error.metadata).toContain("-1");
      expect(error.cause).toBeUndefined();
    });

    it("should create error with cause", () => {
      const originalError = new Error("Metadata parsing failed");
      const error = new BadResponseMetadataLLMError(
        "Invalid metadata",
        { tokens: null },
        { cause: originalError },
      );

      expect(error.cause).toBe(originalError);
      expect(error.message).toContain("Invalid metadata");
    });

    it("should support error chaining for debugging", () => {
      const parseError = new SyntaxError("Unexpected token");
      const wrappedError = new BadResponseMetadataLLMError(
        "Failed to extract metadata",
        { raw: "{invalid" },
        { cause: parseError },
      );

      expect(wrappedError.cause).toBe(parseError);
      expect((wrappedError.cause as SyntaxError).message).toBe("Unexpected token");
    });
  });

  describe("BadConfigurationLLMError", () => {
    it("should create error without cause", () => {
      const error = new BadConfigurationLLMError("Invalid config", { apiKey: null });

      expect(error.name).toBe("BadConfigurationLLMError");
      expect(error.message).toContain("Invalid config");
      expect(error.config).toContain("null");
      expect(error.cause).toBeUndefined();
    });

    it("should create error with cause", () => {
      const validationError = new Error("API key missing");
      const error = new BadConfigurationLLMError(
        "Configuration validation failed",
        { apiKey: undefined },
        { cause: validationError },
      );

      expect(error.cause).toBe(validationError);
      expect(error.message).toContain("Configuration validation failed");
    });

    it("should allow tracing configuration errors through cause chain", () => {
      const envError = new Error("Environment variable not set");
      const configError = new BadConfigurationLLMError(
        "Missing required configuration",
        { provider: "OpenAI" },
        { cause: envError },
      );

      expect(configError.cause).toBe(envError);
      expect((configError.cause as Error).message).toBe("Environment variable not set");
    });
  });

  describe("RejectionResponseLLMError", () => {
    it("should create error without cause", () => {
      const error = new RejectionResponseLLMError("Request rejected", { reason: "content_filter" });

      expect(error.name).toBe("RejectionResponseLLMError");
      expect(error.message).toContain("Request rejected");
      expect(error.reason).toContain("content_filter");
      expect(error.cause).toBeUndefined();
    });

    it("should create error with cause", () => {
      const apiError = new Error("Content policy violation");
      const error = new RejectionResponseLLMError(
        "LLM rejected request",
        { filter: "safety" },
        { cause: apiError },
      );

      expect(error.cause).toBe(apiError);
      expect(error.message).toContain("LLM rejected request");
    });

    it("should preserve API error details in cause", () => {
      const apiError = new Error("Rate limit exceeded");
      const rejectionError = new RejectionResponseLLMError(
        "Request throttled",
        { retryAfter: 60 },
        { cause: apiError },
      );

      expect(rejectionError.cause).toBe(apiError);
      expect((rejectionError.cause as Error).message).toBe("Rate limit exceeded");
    });
  });

  describe("JsonProcessingError", () => {
    it("should automatically chain underlying error as cause", () => {
      const parseError = new SyntaxError("Unexpected token } in JSON at position 42");
      const error = new JsonProcessingError(
        "parse",
        "Failed to parse JSON",
        '{"invalid": }',
        '{"invalid": null}',
        ["removeTrailingCommas"],
        parseError,
      );

      expect(error.cause).toBe(parseError);
      expect(error.underlyingError).toBe(parseError);
      expect((error.cause as SyntaxError).message).toContain("Unexpected token");
    });

    it("should handle undefined underlying error gracefully", () => {
      const error = new JsonProcessingError(
        "validation",
        "Schema validation failed",
        '{"valid": "json"}',
        '{"valid": "json"}',
        [],
      );

      expect(error.cause).toBeUndefined();
      expect(error.underlyingError).toBeUndefined();
    });

    it("should preserve full error chain for debugging", () => {
      const rootCause = new Error("Invalid JSON structure");
      const error = new JsonProcessingError(
        "parse",
        "JSON sanitization failed",
        '{"broken": json}',
        '{"broken": "json"}',
        ["fixQuotes", "removeTrailingCommas"],
        rootCause,
      );

      expect(error.cause).toBe(rootCause);
      expect(error.type).toBe("parse");
      expect(error.appliedSanitizers).toEqual(["fixQuotes", "removeTrailingCommas"]);
    });
  });

  describe("Error cause debugging benefits", () => {
    it("should allow walking the error chain", () => {
      const level1 = new Error("Database connection failed");
      const level2 = new BadConfigurationLLMError(
        "Config error",
        { db: "unavailable" },
        { cause: level1 },
      );
      const level3 = new BadResponseContentLLMError(
        "LLM unreachable",
        { status: "error" },
        { cause: level2 },
      );

      expect(level3.cause).toBe(level2);
      expect((level3.cause as LLMError).cause).toBe(level1);
    });

    it("should maintain stack traces through cause chain", () => {
      const originalError = new Error("Network timeout");
      const wrappedError = new BadResponseContentLLMError(
        "Request failed",
        { timeout: true },
        { cause: originalError },
      );

      expect(wrappedError.stack).toBeDefined();
      expect(originalError.stack).toBeDefined();
      expect(wrappedError.cause).toBe(originalError);
    });

    it("should support error.cause pattern for modern error handling", () => {
      // Simulate a typical error handling scenario
      const apiError = new TypeError("Invalid response format");
      const llmError = new BadResponseMetadataLLMError(
        "Failed to parse token count",
        { tokens: "not_a_number" },
        { cause: apiError },
      );

      // Modern error handling can check the cause
      if (llmError.cause instanceof TypeError) {
        expect(llmError.cause.message).toBe("Invalid response format");
      }
    });
  });

  describe("Backward compatibility", () => {
    it("should work without passing cause option (backward compatible)", () => {
      // All error classes should work without the cause parameter
      const error1 = new BadResponseContentLLMError("error", { data: "test" });
      const error2 = new BadResponseMetadataLLMError("error", { meta: "test" });
      const error3 = new BadConfigurationLLMError("error", { config: "test" });
      const error4 = new RejectionResponseLLMError("error", { reason: "test" });

      expect(error1.cause).toBeUndefined();
      expect(error2.cause).toBeUndefined();
      expect(error3.cause).toBeUndefined();
      expect(error4.cause).toBeUndefined();
    });

    it("should maintain all original error properties", () => {
      const error = new BadResponseContentLLMError(
        "Content error",
        { response: "invalid" },
        { cause: new Error("Original") },
      );

      expect(error.name).toBe("BadResponseContentLLMError");
      expect(error.message).toContain("Content error");
      expect(error.content).toBeDefined();
      expect(error.cause).toBeDefined();
    });
  });
});
