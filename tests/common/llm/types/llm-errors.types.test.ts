import { LLMError, LLMErrorCode } from "../../../../src/common/llm/types/llm-errors.types";
import { AppError } from "../../../../src/common/errors/app-error";

/**
 * Tests for LLM error class, specifically testing the unified error hierarchy with code enum.
 * LLMError now extends AppError for consistent error handling across the application.
 * These tests verify that errors can be properly created with different codes and chained using the cause property.
 */
describe("LLM Error Class - Unified Error Hierarchy", () => {
  describe("LLMError with BAD_RESPONSE_CONTENT code", () => {
    it("should create error without cause", () => {
      const error = new LLMError(LLMErrorCode.BAD_RESPONSE_CONTENT, "Bad content", {
        data: "test",
      });

      expect(error.name).toBe("LLMError");
      expect(error.code).toBe(LLMErrorCode.BAD_RESPONSE_CONTENT);
      expect(error.message).toContain("Bad content");
      expect(error.details).toContain("test");
      expect(error.cause).toBeUndefined();
    });

    it("should create error with cause", () => {
      const originalError = new Error("Original error");
      const error = new LLMError(
        LLMErrorCode.BAD_RESPONSE_CONTENT,
        "Bad content",
        { data: "test" },
        { cause: originalError },
      );

      expect(error.cause).toBe(originalError);
      expect(error.message).toContain("Bad content");
      expect(error.code).toBe(LLMErrorCode.BAD_RESPONSE_CONTENT);
    });

    it("should preserve error cause in error chain", () => {
      const rootCause = new TypeError("Type mismatch");
      const error = new LLMError(
        LLMErrorCode.BAD_RESPONSE_CONTENT,
        "Invalid response structure",
        { received: "null" },
        { cause: rootCause },
      );

      expect(error.cause).toBe(rootCause);
      expect((error.cause as Error).message).toBe("Type mismatch");
      expect((error.cause as Error).name).toBe("TypeError");
    });
  });

  describe("LLMError with BAD_RESPONSE_METADATA code", () => {
    it("should create error without cause", () => {
      const error = new LLMError(LLMErrorCode.BAD_RESPONSE_METADATA, "Bad metadata", {
        tokens: -1,
      });

      expect(error.name).toBe("LLMError");
      expect(error.code).toBe(LLMErrorCode.BAD_RESPONSE_METADATA);
      expect(error.message).toContain("Bad metadata");
      expect(error.details).toContain("-1");
      expect(error.cause).toBeUndefined();
    });

    it("should create error with cause", () => {
      const originalError = new Error("Metadata parsing failed");
      const error = new LLMError(
        LLMErrorCode.BAD_RESPONSE_METADATA,
        "Invalid metadata",
        { tokens: null },
        { cause: originalError },
      );

      expect(error.cause).toBe(originalError);
      expect(error.message).toContain("Invalid metadata");
      expect(error.code).toBe(LLMErrorCode.BAD_RESPONSE_METADATA);
    });

    it("should support error chaining for debugging", () => {
      const parseError = new SyntaxError("Unexpected token");
      const wrappedError = new LLMError(
        LLMErrorCode.BAD_RESPONSE_METADATA,
        "Failed to extract metadata",
        { raw: "{invalid" },
        { cause: parseError },
      );

      expect(wrappedError.cause).toBe(parseError);
      expect((wrappedError.cause as SyntaxError).message).toBe("Unexpected token");
    });
  });

  describe("LLMError with BAD_CONFIGURATION code", () => {
    it("should create error without cause", () => {
      const error = new LLMError(LLMErrorCode.BAD_CONFIGURATION, "Invalid config", {
        apiKey: null,
      });

      expect(error.name).toBe("LLMError");
      expect(error.code).toBe(LLMErrorCode.BAD_CONFIGURATION);
      expect(error.message).toContain("Invalid config");
      expect(error.details).toContain("null");
      expect(error.cause).toBeUndefined();
    });

    it("should create error with cause", () => {
      const validationError = new Error("API key missing");
      const error = new LLMError(
        LLMErrorCode.BAD_CONFIGURATION,
        "Configuration validation failed",
        { apiKey: undefined },
        { cause: validationError },
      );

      expect(error.cause).toBe(validationError);
      expect(error.message).toContain("Configuration validation failed");
      expect(error.code).toBe(LLMErrorCode.BAD_CONFIGURATION);
    });

    it("should allow tracing configuration errors through cause chain", () => {
      const envError = new Error("Environment variable not set");
      const configError = new LLMError(
        LLMErrorCode.BAD_CONFIGURATION,
        "Missing required configuration",
        { provider: "OpenAI" },
        { cause: envError },
      );

      expect(configError.cause).toBe(envError);
      expect((configError.cause as Error).message).toBe("Environment variable not set");
    });
  });

  describe("LLMError with REJECTION_RESPONSE code", () => {
    it("should create error without cause", () => {
      const error = new LLMError(LLMErrorCode.REJECTION_RESPONSE, "Request rejected", {
        reason: "content_filter",
      });

      expect(error.name).toBe("LLMError");
      expect(error.code).toBe(LLMErrorCode.REJECTION_RESPONSE);
      expect(error.message).toContain("Request rejected");
      expect(error.details).toContain("content_filter");
      expect(error.cause).toBeUndefined();
    });

    it("should create error with cause", () => {
      const apiError = new Error("Content policy violation");
      const error = new LLMError(
        LLMErrorCode.REJECTION_RESPONSE,
        "LLM rejected request",
        { filter: "safety" },
        { cause: apiError },
      );

      expect(error.cause).toBe(apiError);
      expect(error.message).toContain("LLM rejected request");
      expect(error.code).toBe(LLMErrorCode.REJECTION_RESPONSE);
    });

    it("should preserve API error details in cause", () => {
      const apiError = new Error("Rate limit exceeded");
      const rejectionError = new LLMError(
        LLMErrorCode.REJECTION_RESPONSE,
        "Request throttled",
        { retryAfter: 60 },
        { cause: apiError },
      );

      expect(rejectionError.cause).toBe(apiError);
      expect((rejectionError.cause as Error).message).toBe("Rate limit exceeded");
    });
  });

  describe("Error code enum", () => {
    it("should have all expected error codes", () => {
      expect(LLMErrorCode.BAD_RESPONSE_CONTENT).toBe("BAD_RESPONSE_CONTENT");
      expect(LLMErrorCode.BAD_RESPONSE_METADATA).toBe("BAD_RESPONSE_METADATA");
      expect(LLMErrorCode.BAD_CONFIGURATION).toBe("BAD_CONFIGURATION");
      expect(LLMErrorCode.REJECTION_RESPONSE).toBe("REJECTION_RESPONSE");
    });

    it("should allow checking error type by code", () => {
      const error = new LLMError(LLMErrorCode.BAD_RESPONSE_CONTENT, "Test error");

      expect(error.code === LLMErrorCode.BAD_RESPONSE_CONTENT).toBe(true);
      expect(error.code === LLMErrorCode.BAD_CONFIGURATION).toBe(false);
    });
  });

  describe("Error cause debugging benefits", () => {
    it("should allow walking the error chain", () => {
      const level1 = new Error("Database connection failed");
      const level2 = new LLMError(
        LLMErrorCode.BAD_CONFIGURATION,
        "Config error",
        { db: "unavailable" },
        { cause: level1 },
      );
      const level3 = new LLMError(
        LLMErrorCode.BAD_RESPONSE_CONTENT,
        "LLM unreachable",
        { status: "error" },
        { cause: level2 },
      );

      expect(level3.cause).toBe(level2);
      expect((level3.cause as LLMError).cause).toBe(level1);
    });

    it("should maintain stack traces through cause chain", () => {
      const originalError = new Error("Network timeout");
      const wrappedError = new LLMError(
        LLMErrorCode.BAD_RESPONSE_CONTENT,
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
      const llmError = new LLMError(
        LLMErrorCode.BAD_RESPONSE_METADATA,
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

  describe("Error details property", () => {
    it("should include details in message when provided", () => {
      const error = new LLMError(LLMErrorCode.BAD_RESPONSE_CONTENT, "Test error", {
        key: "value",
      });

      expect(error.message).toContain("Test error");
      expect(error.message).toContain('"key":"value"');
      expect(error.details).toBe('{"key":"value"}');
    });

    it("should handle undefined details", () => {
      const error = new LLMError(LLMErrorCode.BAD_RESPONSE_CONTENT, "Test error");

      expect(error.message).toBe("Test error");
      expect(error.details).toBeUndefined();
    });

    it("should handle null details", () => {
      const error = new LLMError(LLMErrorCode.BAD_RESPONSE_CONTENT, "Test error", null);

      expect(error.message).toContain("Test error");
      expect(error.message).toContain("null");
      expect(error.details).toBe("null");
    });
  });

  describe("Error type checking", () => {
    it("should allow instanceof checks for LLMError", () => {
      const error = new LLMError(LLMErrorCode.BAD_RESPONSE_CONTENT, "Test error");

      expect(error instanceof LLMError).toBe(true);
      expect(error instanceof Error).toBe(true);
    });

    it("should allow code-based error type checking", () => {
      const contentError = new LLMError(LLMErrorCode.BAD_RESPONSE_CONTENT, "Content error");
      const configError = new LLMError(LLMErrorCode.BAD_CONFIGURATION, "Config error");

      expect(contentError.code === LLMErrorCode.BAD_RESPONSE_CONTENT).toBe(true);
      expect(configError.code === LLMErrorCode.BAD_CONFIGURATION).toBe(true);
      expect(contentError.code === LLMErrorCode.BAD_CONFIGURATION).toBe(false);
    });
  });

  describe("AppError inheritance", () => {
    it("should extend AppError for unified error hierarchy", () => {
      const error = new LLMError(LLMErrorCode.BAD_RESPONSE_CONTENT, "Test error");

      expect(error instanceof AppError).toBe(true);
      expect(error instanceof Error).toBe(true);
    });

    it("should have proper stack trace through AppError", () => {
      const error = new LLMError(LLMErrorCode.BAD_CONFIGURATION, "Config error");

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain("LLMError");
    });

    it("should maintain error name as LLMError", () => {
      const error = new LLMError(LLMErrorCode.BAD_RESPONSE_CONTENT, "Test error");

      // AppError sets name to constructor.name
      expect(error.name).toBe("LLMError");
    });

    it("should support cause property through AppError", () => {
      const originalError = new Error("Original error");
      const llmError = new LLMError(
        LLMErrorCode.BAD_RESPONSE_CONTENT,
        "Wrapped error",
        { data: "test" },
        { cause: originalError },
      );

      expect(llmError.cause).toBe(originalError);
    });

    it("should be part of the same hierarchy as DatabaseError", () => {
      // Both LLMError and DatabaseError extend AppError, creating a unified hierarchy
      const error = new LLMError(LLMErrorCode.BAD_CONFIGURATION, "Config error");

      expect(error instanceof AppError).toBe(true);
    });
  });
});
