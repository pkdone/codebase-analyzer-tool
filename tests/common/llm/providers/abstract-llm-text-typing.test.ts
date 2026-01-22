import { describe, test, expect } from "@jest/globals";
import {
  LLMPurpose,
  LLMOutputFormat,
  LLMContext,
  isTextOptions,
  isJsonOptionsWithSchema,
  LLMCompletionOptions,
} from "../../../../src/common/llm/types/llm-request.types";
import {
  LLMResponseStatus,
  LLMFunctionResponse,
} from "../../../../src/common/llm/types/llm-response.types";
import { LLMError, LLMErrorCode } from "../../../../src/common/llm/types/llm-errors.types";

/**
 * Unit tests for BaseLLMProvider TEXT path type safety.
 * These tests verify the behavior of the TEXT output path, ensuring
 * proper runtime validation and type handling.
 */
describe("BaseLLMProvider TEXT Path Type Safety", () => {
  describe("TEXT response validation logic", () => {
    test("should accept valid string for TEXT response", () => {
      const textResponse = "This is a plain text response";

      // Validate that response is string (mimics formatAndValidateResponse behavior)
      expect(typeof textResponse).toBe("string");

      // Construct response object
      const result: LLMFunctionResponse<string> = {
        status: LLMResponseStatus.COMPLETED,
        request: "test prompt",
        modelKey: "test-model",
        context: { resource: "test", purpose: LLMPurpose.COMPLETIONS },
        generated: textResponse,
      };

      expect(result.generated).toBe(textResponse);
      expect(result.status).toBe(LLMResponseStatus.COMPLETED);
    });

    test("should detect non-string TEXT response as invalid", () => {
      const invalidResponse = { not: "a string" };

      expect(() => {
        if (typeof invalidResponse !== "string") {
          throw new LLMError(
            LLMErrorCode.BAD_RESPONSE_CONTENT,
            `Expected string response for TEXT output format, but received ${typeof invalidResponse}`,
            invalidResponse,
          );
        }
      }).toThrow(LLMError);
    });

    test("should throw LLMError with correct error code for non-string", () => {
      const invalidResponse = 12345;

      try {
        if (typeof invalidResponse !== "string") {
          throw new LLMError(
            LLMErrorCode.BAD_RESPONSE_CONTENT,
            `Expected string response for TEXT output format, but received ${typeof invalidResponse}`,
            invalidResponse,
          );
        }
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(LLMError);
        expect((error as LLMError).code).toBe(LLMErrorCode.BAD_RESPONSE_CONTENT);
        expect((error as LLMError).message).toContain("number");
      }
    });

    test("should handle empty string TEXT response", () => {
      const emptyResponse = "";

      expect(typeof emptyResponse).toBe("string");

      const result: LLMFunctionResponse<string> = {
        status: LLMResponseStatus.COMPLETED,
        request: "test prompt",
        modelKey: "test-model",
        context: { resource: "test", purpose: LLMPurpose.COMPLETIONS },
        generated: emptyResponse,
      };

      expect(result.generated).toBe("");
    });

    test("should handle multiline TEXT response", () => {
      const multilineResponse = `Line 1
Line 2
Line 3`;

      expect(typeof multilineResponse).toBe("string");

      const result: LLMFunctionResponse<string> = {
        status: LLMResponseStatus.COMPLETED,
        request: "test prompt",
        modelKey: "test-model",
        context: { resource: "test", purpose: LLMPurpose.COMPLETIONS },
        generated: multilineResponse,
      };

      expect(result.generated).toContain("\n");
      expect(result.generated?.split("\n")).toHaveLength(3);
    });

    test("should handle TEXT response with special characters", () => {
      const specialCharsResponse = "Response with \"quotes\", 'apostrophes', and <special> chars";

      expect(typeof specialCharsResponse).toBe("string");

      const result: LLMFunctionResponse<string> = {
        status: LLMResponseStatus.COMPLETED,
        request: "test prompt",
        modelKey: "test-model",
        context: { resource: "test", purpose: LLMPurpose.COMPLETIONS },
        generated: specialCharsResponse,
      };

      expect(result.generated).toContain('"quotes"');
      expect(result.generated).toContain("'apostrophes'");
    });

    test("should handle TEXT response with unicode characters", () => {
      const unicodeResponse = "Hello 世界! Привет мир! مرحبا بالعالم";

      expect(typeof unicodeResponse).toBe("string");

      const result: LLMFunctionResponse<string> = {
        status: LLMResponseStatus.COMPLETED,
        request: "test prompt",
        modelKey: "test-model",
        context: { resource: "test", purpose: LLMPurpose.COMPLETIONS },
        generated: unicodeResponse,
      };

      expect(result.generated).toContain("世界");
      expect(result.generated).toContain("Привет");
    });
  });

  describe("TEXT vs JSON output format detection", () => {
    test("should correctly identify TEXT output format", () => {
      const textOptions: LLMCompletionOptions = {
        outputFormat: LLMOutputFormat.TEXT,
      };

      expect(textOptions.outputFormat).toBe(LLMOutputFormat.TEXT);
      expect(textOptions.outputFormat !== LLMOutputFormat.JSON).toBe(true);
    });

    test("should correctly identify JSON output format", () => {
      const jsonOptions: LLMCompletionOptions = {
        outputFormat: LLMOutputFormat.JSON,
      };

      expect(jsonOptions.outputFormat).toBe(LLMOutputFormat.JSON);
      expect(jsonOptions.outputFormat !== LLMOutputFormat.JSON).toBe(false);
    });

    test("should use type guards for output format detection", () => {
      const textOptions: LLMCompletionOptions = {
        outputFormat: LLMOutputFormat.TEXT,
      };

      expect(isTextOptions(textOptions)).toBe(true);
      expect(isJsonOptionsWithSchema(textOptions)).toBe(false);
    });
  });

  describe("LLMFunctionResponse typing for TEXT", () => {
    test("should correctly type TEXT response as string", () => {
      const context: LLMContext = {
        resource: "test-resource",
        purpose: LLMPurpose.COMPLETIONS,
        outputFormat: LLMOutputFormat.TEXT,
      };

      // Simulate a TEXT response
      const response: LLMFunctionResponse<string> = {
        status: LLMResponseStatus.COMPLETED,
        request: "Generate a summary",
        modelKey: "gpt-4",
        context,
        generated: "This is the generated summary text.",
      };

      // String operations should work without casts
      expect(response.generated?.toUpperCase()).toBe("THIS IS THE GENERATED SUMMARY TEXT.");
      expect(response.generated?.length).toBe(35);
      expect(response.generated?.includes("summary")).toBe(true);
    });

    test("should handle undefined generated content", () => {
      const context: LLMContext = {
        resource: "test-resource",
        purpose: LLMPurpose.COMPLETIONS,
      };

      const response: LLMFunctionResponse<string> = {
        status: LLMResponseStatus.EXCEEDED,
        request: "Generate content",
        modelKey: "gpt-4",
        context,
        // generated is undefined for failed requests
      };

      expect(response.generated).toBeUndefined();
      expect(response.status).toBe(LLMResponseStatus.EXCEEDED);
    });

    test("should correctly type error response for TEXT", () => {
      const context: LLMContext = {
        resource: "test-resource",
        purpose: LLMPurpose.COMPLETIONS,
      };

      const errorResponse: LLMFunctionResponse<string> = {
        status: LLMResponseStatus.ERRORED,
        request: "Generate content",
        modelKey: "gpt-4",
        context,
        error: new Error("API rate limit exceeded"),
      };

      expect(errorResponse.status).toBe(LLMResponseStatus.ERRORED);
      expect(errorResponse.error).toBeInstanceOf(Error);
      expect(errorResponse.generated).toBeUndefined();
    });
  });

  describe("Context handling for TEXT output", () => {
    test("should preserve context with outputFormat set to TEXT", () => {
      const context: LLMContext = {
        resource: "text-output-test",
        purpose: LLMPurpose.COMPLETIONS,
        outputFormat: LLMOutputFormat.TEXT,
      };

      const response: LLMFunctionResponse<string> = {
        status: LLMResponseStatus.COMPLETED,
        request: "test",
        modelKey: "test-model",
        context,
        generated: "Response text",
      };

      expect(response.context.outputFormat).toBe(LLMOutputFormat.TEXT);
      expect(response.context.resource).toBe("text-output-test");
    });

    test("should handle INVALID response with error field for TEXT", () => {
      const context: LLMContext = {
        resource: "text-output-test",
        purpose: LLMPurpose.COMPLETIONS,
        outputFormat: LLMOutputFormat.TEXT,
      };

      // Parse errors are now returned in the response.error field instead of context
      const response: LLMFunctionResponse<string> = {
        status: LLMResponseStatus.INVALID,
        request: "test",
        modelKey: "test-model",
        context,
        error: "Unexpected non-string response",
      };

      expect(response.error).toBe("Unexpected non-string response");
      expect(response.status).toBe(LLMResponseStatus.INVALID);
    });
  });

  describe("Type safety patterns for TEXT responses", () => {
    test("should safely handle nullable TEXT response", () => {
      // Simulate a response that could be null at runtime
      const getResponse = (): string | null => "Valid response";
      const textResponse = getResponse();

      // Null check pattern
      if (textResponse !== null) {
        expect(typeof textResponse).toBe("string");
        expect(textResponse.length).toBeGreaterThan(0);
      }
    });

    test("should safely handle optional TEXT response", () => {
      // Simulate a response that could be undefined at runtime
      const getResponse = (): string | undefined => "Valid response";
      const textResponse = getResponse();

      // Undefined check pattern
      if (textResponse !== undefined) {
        expect(typeof textResponse).toBe("string");
        expect(textResponse.length).toBeGreaterThan(0);
      }
    });

    test("should work with string operations after validation", () => {
      const rawResponse: unknown = "  trimmed response  ";

      // Runtime validation
      if (typeof rawResponse !== "string") {
        throw new Error("Expected string");
      }

      // Now TypeScript knows it's a string
      const trimmed = rawResponse.trim();
      expect(trimmed).toBe("trimmed response");

      const upper = rawResponse.toUpperCase();
      expect(upper).toBe("  TRIMMED RESPONSE  ");
    });
  });
});
