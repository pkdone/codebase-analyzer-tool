import { describe, test, expect } from "@jest/globals";
import { LLMExecutionError } from "../../../../src/common/llm/types/llm-execution-result.types";
import {
  LLMContext,
  LLMPurpose,
  LLMOutputFormat,
} from "../../../../src/common/llm/types/llm-request.types";
import { LLMModelTier } from "../../../../src/common/llm/types/llm-model.types";

describe("LLMExecutionError", () => {
  describe("constructor", () => {
    test("should create error with all parameters", () => {
      const context: LLMContext = {
        resource: "test-resource",
        purpose: LLMPurpose.COMPLETIONS,
        modelTier: LLMModelTier.PRIMARY,
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
      const context: LLMContext = {
        resource: "test-resource",
        purpose: LLMPurpose.EMBEDDINGS,
      };

      const error = new LLMExecutionError("Test error message", "test-resource", context);

      expect(error.message).toBe("Test error message");
      expect(error.resourceName).toBe("test-resource");
      expect(error.context).toEqual(context);
      expect(error.errorCause).toBeUndefined();
    });

    test("should preserve all LLMContext properties", () => {
      const context: LLMContext = {
        resource: "test-resource",
        purpose: LLMPurpose.COMPLETIONS,
        modelTier: LLMModelTier.SECONDARY,
        outputFormat: LLMOutputFormat.TEXT,
        responseContentParseError: "Failed to parse JSON",
      };

      const error = new LLMExecutionError("Test error message", "test-resource", context);

      expect(error.context).toEqual(context);
      expect(error.context?.resource).toBe("test-resource");
      expect(error.context?.purpose).toBe(LLMPurpose.COMPLETIONS);
      expect(error.context?.modelTier).toBe(LLMModelTier.SECONDARY);
      expect(error.context?.outputFormat).toBe(LLMOutputFormat.TEXT);
      expect(error.context?.responseContentParseError).toBe("Failed to parse JSON");
    });
  });

  describe("type safety", () => {
    test("should provide type-safe access to context properties", () => {
      const context: LLMContext = {
        resource: "test-resource",
        purpose: LLMPurpose.COMPLETIONS,
        modelTier: LLMModelTier.PRIMARY,
      };

      const error = new LLMExecutionError("Test error message", "test-resource", context);

      // These should be type-safe without casting
      if (error.context) {
        const resource: string = error.context.resource;
        const purpose: LLMPurpose = error.context.purpose;
        const modelTier: LLMModelTier | undefined = error.context.modelTier;

        expect(resource).toBe("test-resource");
        expect(purpose).toBe(LLMPurpose.COMPLETIONS);
        expect(modelTier).toBe(LLMModelTier.PRIMARY);
      }
    });

    test("should handle minimal LLMContext with only required fields", () => {
      const context: LLMContext = {
        resource: "minimal-resource",
        purpose: LLMPurpose.EMBEDDINGS,
      };

      const error = new LLMExecutionError("Test error message", "minimal-resource", context);

      expect(error.context?.resource).toBe("minimal-resource");
      expect(error.context?.purpose).toBe(LLMPurpose.EMBEDDINGS);
      expect(error.context?.modelTier).toBeUndefined();
      expect(error.context?.outputFormat).toBeUndefined();
      expect(error.context?.responseContentParseError).toBeUndefined();
    });
  });

  describe("error properties immutability", () => {
    test("should have readonly properties", () => {
      const context: LLMContext = {
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
      const context: LLMContext = {
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
      const context: LLMContext = {
        resource: "test-resource",
        purpose: LLMPurpose.COMPLETIONS,
      };
      const customCause = { code: "CUSTOM_ERROR", details: "Some details" };

      const error = new LLMExecutionError("Wrapped error", "test-resource", context, customCause);

      expect(error.errorCause).toEqual(customCause);
    });

    test("should preserve primitive values as cause", () => {
      const context: LLMContext = {
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

  describe("integration with LLMExecutionResult", () => {
    test("should work correctly in failure result", () => {
      const context: LLMContext = {
        resource: "test-resource",
        purpose: LLMPurpose.COMPLETIONS,
        modelTier: LLMModelTier.PRIMARY,
      };

      const error = new LLMExecutionError("Execution failed", "test-resource", context);

      const result = {
        success: false as const,
        error,
      };

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(LLMExecutionError);
      expect(result.error.context?.resource).toBe("test-resource");
      expect(result.error.context?.purpose).toBe(LLMPurpose.COMPLETIONS);
    });
  });
});
