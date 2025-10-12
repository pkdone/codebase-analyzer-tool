import { JsonProcessor } from "../../../src/llm/json-processing/core/json-processor";
import { LLMOutputFormat } from "../../../src/llm/types/llm.types";
import { JsonProcessingError } from "../../../src/llm/types/llm-errors.types";
import { z } from "zod";

/**
 * Tests for enhanced error reporting in JsonProcessor.
 * Verifies that errors have the correct type field to distinguish
 * between parse errors and validation errors.
 */
describe("JsonProcessor - Enhanced Error Reporting", () => {
  let jsonProcessor: JsonProcessor;

  beforeEach(() => {
    jsonProcessor = new JsonProcessor(false); // Disable logging for tests
  });

  describe("parse error type", () => {
    it("should return parse error for invalid JSON syntax", () => {
      const invalidJson = '{"key": invalid}';
      const result = jsonProcessor.parseAndValidate(invalidJson, "test-resource", {
        outputFormat: LLMOutputFormat.JSON,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(JsonProcessingError);
        expect(result.error.type).toBe("parse");
        expect(result.error.message).toContain("cannot be parsed to JSON");
      }
    });

    it("should return parse error for non-string content", () => {
      const result = jsonProcessor.parseAndValidate(123 as any, "test-resource", {
        outputFormat: LLMOutputFormat.JSON,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(JsonProcessingError);
        expect(result.error.type).toBe("parse");
        expect(result.error.message).toContain("is not a string");
      }
    });

    it("should return parse error when all sanitizers are exhausted", () => {
      const malformedJson = "definitely not json at all";
      const result = jsonProcessor.parseAndValidate(malformedJson, "test-resource", {
        outputFormat: LLMOutputFormat.JSON,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(JsonProcessingError);
        expect(result.error.type).toBe("parse");
        expect(result.error.message).toContain("after all sanitization attempts");
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

      const result = jsonProcessor.parseAndValidate(validJson, "test-resource", {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      });

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

      const result = jsonProcessor.parseAndValidate(validJson, "test-resource", {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      });

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

      const result = jsonProcessor.parseAndValidate(jsonWithIssues, "test-resource", {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(JsonProcessingError);
        expect(result.error.type).toBe("validation");
        expect(result.error.message).toContain("schema validation");
        expect(result.error.appliedSanitizers.length).toBeGreaterThan(0);
      }
    });
  });

  describe("error type consistency", () => {
    it("should enable programmatic error handling based on type", () => {
      const cases = [
        { input: '{"invalid": json}', expectedType: "parse" as const },
        { input: '{"valid": "json"}', expectedType: "validation" as const },
      ];

      const schema = z.object({ name: z.string() }); // Will fail validation for second case

      cases.forEach(({ input, expectedType }) => {
        const result = jsonProcessor.parseAndValidate(input, "test", {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: schema,
        });

        if (!result.success) {
          expect(result.error.type).toBe(expectedType);

          // Demonstrate type-based handling
          switch (result.error.type) {
            case "parse":
              // Parse errors might be retried with more aggressive sanitization
              expect(result.error.message).toMatch(/parse|string/i);
              break;
            case "validation":
              // Validation errors might need prompt adjustment
              expect(result.error.message).toContain("schema validation");
              break;
          }
        }
      });
    });

    it("should provide different debugging info for parse vs validation errors", () => {
      const parseError = jsonProcessor.parseAndValidate("invalid", "test", {
        outputFormat: LLMOutputFormat.JSON,
      });

      const validationError = jsonProcessor.parseAndValidate('{"wrong": "fields"}', "test", {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: z.object({ correct: z.string() }),
      });

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
      const result = jsonProcessor.parseAndValidate(validJson, "test", {
        outputFormat: LLMOutputFormat.JSON,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ name: "John" });
        expect("error" in result).toBe(false);
      }
    });
  });
});
