import { describe, test, expect } from "@jest/globals";
import { LLMExecutionError } from "../../../../src/common/llm/types/llm-execution-error.types";
import {
  LLMRequestContext,
  LLMPurpose,
  LLMOutputFormat,
} from "../../../../src/common/llm/types/llm-request.types";
import { err, isErr } from "../../../../src/common/types/result.types";

describe("LLMExecutionError", () => {
  describe("constructor", () => {
    test("should create error with all parameters", () => {
      const context: LLMRequestContext = {
        resource: "test-resource",
        purpose: LLMPurpose.COMPLETIONS,
        outputFormat: LLMOutputFormat.JSON,
      };
      const cause = new Error("Original error");

      const error = new LLMExecutionError("Test error message", "test-resource", context, cause);

      expect(error.message).toBe("Test error message");
      expect(error.resourceName).toBe("test-resource");
      expect(error.context).toEqual(context);
      expect(error.errorCause).toBe(cause);
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(LLMExecutionError);
    });

    test("should create error without optional context", () => {
      const error = new LLMExecutionError("Test error message", "test-resource");

      expect(error.message).toBe("Test error message");
      expect(error.resourceName).toBe("test-resource");
      expect(error.context).toBeUndefined();
      expect(error.errorCause).toBeUndefined();
    });

    test("should create error without optional cause", () => {
      const context: LLMRequestContext = {
        resource: "test-resource",
        purpose: LLMPurpose.EMBEDDINGS,
      };

      const error = new LLMExecutionError("Test error message", "test-resource", context);

      expect(error.message).toBe("Test error message");
      expect(error.resourceName).toBe("test-resource");
      expect(error.context).toEqual(context);
      expect(error.errorCause).toBeUndefined();
    });

    test("should preserve all LLMRequestContext properties", () => {
      const context: LLMRequestContext = {
        resource: "test-resource",
        purpose: LLMPurpose.COMPLETIONS,
        outputFormat: LLMOutputFormat.TEXT,
      };

      const error = new LLMExecutionError("Test error message", "test-resource", context);

      expect(error.context).toEqual(context);
      expect(error.context?.resource).toBe("test-resource");
      expect(error.context?.purpose).toBe(LLMPurpose.COMPLETIONS);
      expect(error.context?.outputFormat).toBe(LLMOutputFormat.TEXT);
    });
  });

  describe("type safety", () => {
    test("should provide type-safe access to context properties", () => {
      const context: LLMRequestContext = {
        resource: "test-resource",
        purpose: LLMPurpose.COMPLETIONS,
      };

      const error = new LLMExecutionError("Test error message", "test-resource", context);

      // These should be type-safe without casting
      if (error.context) {
        const resource: string = error.context.resource;
        const purpose: LLMPurpose = error.context.purpose;

        expect(resource).toBe("test-resource");
        expect(purpose).toBe(LLMPurpose.COMPLETIONS);
      }
    });

    test("should handle minimal LLMRequestContext with only required fields", () => {
      const context: LLMRequestContext = {
        resource: "minimal-resource",
        purpose: LLMPurpose.EMBEDDINGS,
      };

      const error = new LLMExecutionError("Test error message", "minimal-resource", context);

      expect(error.context?.resource).toBe("minimal-resource");
      expect(error.context?.purpose).toBe(LLMPurpose.EMBEDDINGS);
      expect(error.context?.outputFormat).toBeUndefined();
    });
  });

  describe("error properties immutability", () => {
    test("should have readonly properties", () => {
      const context: LLMRequestContext = {
        resource: "test-resource",
        purpose: LLMPurpose.COMPLETIONS,
      };

      const error = new LLMExecutionError("Test error message", "test-resource", context);

      // TypeScript should prevent these assignments at compile time
      // Runtime test to verify the properties are set correctly
      expect(error.resourceName).toBe("test-resource");
      expect(error.context).toEqual(context);
    });
  });

  describe("error cause handling", () => {
    test("should preserve Error objects as cause", () => {
      const context: LLMRequestContext = {
        resource: "test-resource",
        purpose: LLMPurpose.COMPLETIONS,
      };
      const originalError = new Error("Original error");
      originalError.stack = "Original stack trace";

      const error = new LLMExecutionError("Wrapped error", "test-resource", context, originalError);

      expect(error.errorCause).toBe(originalError);
      expect((error.errorCause as Error).message).toBe("Original error");
      expect((error.errorCause as Error).stack).toBe("Original stack trace");
    });

    test("should preserve non-Error objects as cause", () => {
      const context: LLMRequestContext = {
        resource: "test-resource",
        purpose: LLMPurpose.COMPLETIONS,
      };
      const customCause = { code: "CUSTOM_ERROR", details: "Some details" };

      const error = new LLMExecutionError("Wrapped error", "test-resource", context, customCause);

      expect(error.errorCause).toEqual(customCause);
    });

    test("should preserve primitive values as cause", () => {
      const context: LLMRequestContext = {
        resource: "test-resource",
        purpose: LLMPurpose.COMPLETIONS,
      };

      const errorWithString = new LLMExecutionError(
        "Error message",
        "test-resource",
        context,
        "string cause",
      );
      expect(errorWithString.errorCause).toBe("string cause");

      const errorWithNumber = new LLMExecutionError("Error message", "test-resource", context, 42);
      expect(errorWithNumber.errorCause).toBe(42);
    });
  });

  describe("integration with Result type", () => {
    test("should work correctly in ErrResult", () => {
      const context: LLMRequestContext = {
        resource: "test-resource",
        purpose: LLMPurpose.COMPLETIONS,
      };

      const error = new LLMExecutionError("Execution failed", "test-resource", context);
      const result = err(error);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBeInstanceOf(LLMExecutionError);
        expect(result.error.context?.resource).toBe("test-resource");
        expect(result.error.context?.purpose).toBe(LLMPurpose.COMPLETIONS);
      }
    });
  });
});
