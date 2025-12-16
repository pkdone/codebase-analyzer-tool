import { processJson } from "../../../../src/common/llm/json-processing/core/json-processing";
import { LLMOutputFormat, LLMPurpose } from "../../../../src/common/llm/types/llm.types";
import {
  JsonProcessingError,
  JsonProcessingErrorType,
} from "../../../../src/common/llm/json-processing/types/json-processing.errors";
import { z } from "zod";

/**
 * Tests for enhanced error reporting in JsonProcessor.
 * Verifies that errors have the correct type field to distinguish
 * between parse errors and validation errors.
 */
describe("JsonProcessor - Enhanced Error Reporting", () => {
  beforeEach(() => {});

  describe("parse error type", () => {
    it("should return parse error for invalid JSON syntax", () => {
      // Use invalid JSON that can't be auto-fixed (malformed structure)
      const invalidJson = '{"key": {unclosed}';
      const result = processJson(
        invalidJson,
        { resource: "test-resource", purpose: LLMPurpose.COMPLETIONS },
        {
          outputFormat: LLMOutputFormat.JSON,
        },
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(JsonProcessingError);
        expect(result.error.type).toBe("parse");
        expect(result.error.message).toContain("cannot be parsed to JSON");
      }
    });

    it("should return parse error for non-string content", () => {
      const result = processJson(
        123 as any,
        { resource: "test-resource", purpose: LLMPurpose.COMPLETIONS },
        {
          outputFormat: LLMOutputFormat.JSON,
        },
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(JsonProcessingError);
        expect(result.error.type).toBe("parse");
        expect(result.error.message).toContain("is not a string");
      }
    });

    it("should return parse error when all sanitizers are exhausted", () => {
      const malformedJson = "definitely not json at all";
      const result = processJson(
        malformedJson,
        { resource: "test-resource", purpose: LLMPurpose.COMPLETIONS },
        {
          outputFormat: LLMOutputFormat.JSON,
        },
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(JsonProcessingError);
        expect(result.error.type).toBe("parse");
        // Plain text without JSON structure now gets a clearer error message
        expect(result.error.message).toMatch(
          /contains no JSON structure|after all sanitization attempts/,
        );
      }
    });
  });

  describe("validation error type", () => {
    it("should return validation error for valid JSON that fails schema validation", () => {
      const validJson = '{"name": "John", "age": "not a number"}';
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const result = processJson(
        validJson,
        { resource: "test-resource", purpose: LLMPurpose.COMPLETIONS },
        {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: schema,
        },
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(JsonProcessingError);
        expect(result.error.type).toBe("validation");
        expect(result.error.message).toContain("failed schema validation");
      }
    });

    it("should return validation error with clear message", () => {
      const validJson = '{"field": "value"}';
      const schema = z.object({
        differentField: z.string(),
      });

      const result = processJson(
        validJson,
        { resource: "test-resource", purpose: LLMPurpose.COMPLETIONS },
        {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: schema,
        },
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(JsonProcessingError);
        expect(result.error.type).toBe("validation");
        expect(result.error.message).toContain("parsed successfully");
        expect(result.error.message).toContain("failed schema validation");
      }
    });

    it("should return validation error with applied sanitizers", () => {
      const jsonWithIssues = '```json\n{"name": "John", "age": "thirty"}\n```';
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const result = processJson(
        jsonWithIssues,
        { resource: "test-resource", purpose: LLMPurpose.COMPLETIONS },
        {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: schema,
        },
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(JsonProcessingError);
        expect(result.error.type).toBe("validation");
        expect(result.error.message).toContain("schema validation");
        expect(result.error.type).toBe(JsonProcessingErrorType.VALIDATION);
      }
    });
  });

  describe("error type consistency", () => {
    it("should enable programmatic error handling based on type", () => {
      const cases = [
        { input: '{"invalid": {unclosed}', expectedType: "parse" as const },
        { input: '{"valid": "json"}', expectedType: "validation" as const },
      ];

      const schema = z.object({ name: z.string() }); // Will fail validation for second case

      cases.forEach(({ input, expectedType }) => {
        const result = processJson(
          input,
          { resource: "test", purpose: LLMPurpose.COMPLETIONS },
          {
            outputFormat: LLMOutputFormat.JSON,
            jsonSchema: schema,
          },
        );

        if (!result.success) {
          expect(result.error.type).toBe(expectedType);

          // Demonstrate type-based handling
          switch (result.error.type) {
            case JsonProcessingErrorType.PARSE:
              // Parse errors might be retried with more aggressive sanitization
              expect(result.error.message).toMatch(/parse|string/i);
              break;
            case JsonProcessingErrorType.VALIDATION:
              // Validation errors might need prompt adjustment
              expect(result.error.message).toContain("schema validation");
              break;
          }
        }
      });
    });

    it("should provide different debugging info for parse vs validation errors", () => {
      const parseError = processJson(
        "invalid",
        { resource: "test", purpose: LLMPurpose.COMPLETIONS },
        {
          outputFormat: LLMOutputFormat.JSON,
        },
      );

      const validationError = processJson(
        '{"wrong": "fields"}',
        { resource: "test", purpose: LLMPurpose.COMPLETIONS },
        {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: z.object({ correct: z.string() }),
        },
      );

      expect(parseError.success).toBe(false);
      expect(validationError.success).toBe(false);

      if (!parseError.success && !validationError.success) {
        // Parse error should have tried sanitizers
        expect(parseError.error.type).toBe("parse");

        // Validation error indicates JSON was successfully parsed
        expect(validationError.error.type).toBe("validation");
        expect(validationError.error.message).toContain("parsed successfully");
      }
    });
  });

  describe("successful parsing", () => {
    it("should not include error type in successful results", () => {
      const validJson = '{"name": "John"}';
      const result = processJson(
        validJson,
        { resource: "test", purpose: LLMPurpose.COMPLETIONS },
        {
          outputFormat: LLMOutputFormat.JSON,
        },
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ name: "John" });
        expect("error" in result).toBe(false);
      }
    });
  });
});
