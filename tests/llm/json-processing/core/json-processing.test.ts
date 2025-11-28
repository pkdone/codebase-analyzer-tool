import { processJson } from "../../../../src/llm/json-processing/core/json-processing";
import { LLMOutputFormat, LLMPurpose } from "../../../../src/llm/types/llm.types";
import {
  JsonProcessingError,
  JsonProcessingErrorType,
} from "../../../../src/llm/json-processing/types/json-processing.errors";
import { z } from "zod";

describe("json-processing", () => {
  const context = { resource: "test-resource", purpose: LLMPurpose.COMPLETIONS };

  describe("processJson", () => {
    describe("successful parse and validation flow", () => {
      it("should parse and validate valid JSON string", () => {
        const json = '{"key": "value", "number": 42}';
        const completionOptions = { outputFormat: LLMOutputFormat.JSON };
        const result = processJson(json, context, completionOptions);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual({ key: "value", number: 42 });
          expect(Array.isArray(result.steps)).toBe(true);
        }
      });

      it("should parse and validate valid JSON with schema", () => {
        const schema = z.object({ name: z.string(), age: z.number() });
        const json = '{"name": "John", "age": 30}';
        const completionOptions = {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: schema,
        };
        const result = processJson(json, context, completionOptions);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual({ name: "John", age: 30 });
        }
      });

      it("should include sanitization steps in success result", () => {
        const json = '```json\n{"key": "value"}\n```';
        const completionOptions = { outputFormat: LLMOutputFormat.JSON };
        const result = processJson(json, context, completionOptions);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(Array.isArray(result.steps)).toBe(true);
        }
      });
    });

    describe("parse failure scenarios", () => {
      it("should return failure result for non-string content", () => {
        const nonString = 12345 as any;
        const completionOptions = { outputFormat: LLMOutputFormat.JSON };
        const result = processJson(nonString, context, completionOptions);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBeInstanceOf(JsonProcessingError);
          expect(result.error.type).toBe(JsonProcessingErrorType.PARSE);
        }
      });

      it("should return parse error for completely invalid JSON", () => {
        const invalid = "not valid json at all";
        const completionOptions = { outputFormat: LLMOutputFormat.JSON };
        const result = processJson(invalid, context, completionOptions);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBeInstanceOf(JsonProcessingError);
          expect(result.error.type).toBe(JsonProcessingErrorType.PARSE);
        }
      });

      it("should detect non-JSON responses without braces or brackets", () => {
        const plainText = "This is plain text";
        const completionOptions = { outputFormat: LLMOutputFormat.JSON };
        const result = processJson(plainText, context, completionOptions);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.message).toContain("contains no JSON structure");
          expect(result.error.type).toBe(JsonProcessingErrorType.PARSE);
        }
      });

      it("should include resource name in error message", () => {
        const invalid = "not valid json";
        const completionOptions = { outputFormat: LLMOutputFormat.JSON };
        const customContext = { resource: "my-resource", purpose: LLMPurpose.COMPLETIONS };
        const result = processJson(invalid, customContext, completionOptions);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.message).toMatch(/my-resource/);
        }
      });
    });

    describe("validation failure scenarios", () => {
      it("should return validation error when schema validation fails", () => {
        const schema = z.object({ name: z.string(), age: z.number() });
        const json = '{"name": "John", "age": "thirty"}'; // Invalid age type
        const completionOptions = {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: schema,
        };
        const result = processJson(json, context, completionOptions);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBeInstanceOf(JsonProcessingError);
          expect(result.error.type).toBe(JsonProcessingErrorType.VALIDATION);
        }
      });

      it("should include resource name in validation error message", () => {
        const schema = z.object({ name: z.string() });
        const json = '{"name": 123}'; // Invalid type
        const completionOptions = {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: schema,
        };
        const customContext = { resource: "validation-resource", purpose: LLMPurpose.COMPLETIONS };
        const result = processJson(json, customContext, completionOptions);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.message).toMatch(/validation-resource/);
          expect(result.error.type).toBe(JsonProcessingErrorType.VALIDATION);
        }
      });
    });

    describe("logging behavior", () => {
      it("should log sanitization steps when loggingEnabled is true and steps are significant", () => {
        const json = '```json\n{"key": "value"}\n```';
        const completionOptions = { outputFormat: LLMOutputFormat.JSON };
        const result = processJson(json, context, completionOptions, true);

        expect(result.success).toBe(true);
        // Logging is tested indirectly - if it throws, the test would fail
      });

      it("should work when loggingEnabled is false", () => {
        const json = '{"key": "value"}';
        const completionOptions = { outputFormat: LLMOutputFormat.JSON };
        const result = processJson(json, context, completionOptions, false);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual({ key: "value" });
        }
      });
    });

    describe("context propagation", () => {
      it("should use context resource in error messages", () => {
        const invalid = "not valid json";
        const completionOptions = { outputFormat: LLMOutputFormat.JSON };
        const customContext = { resource: "custom-resource", purpose: LLMPurpose.COMPLETIONS };
        const result = processJson(invalid, customContext, completionOptions);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.message).toContain("custom-resource");
        }
      });
    });

    describe("edge cases", () => {
      it("should handle empty string", () => {
        const empty = "";
        const completionOptions = { outputFormat: LLMOutputFormat.JSON };
        const result = processJson(empty, context, completionOptions);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.type).toBe(JsonProcessingErrorType.PARSE);
        }
      });

      it("should handle whitespace-only string", () => {
        const whitespace = "   \n\t  ";
        const completionOptions = { outputFormat: LLMOutputFormat.JSON };
        const result = processJson(whitespace, context, completionOptions);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.type).toBe(JsonProcessingErrorType.PARSE);
        }
      });

      it("should handle JSON with surrounding text", () => {
        const textWithJson = 'Some text before {"key": "value"} some text after';
        const completionOptions = { outputFormat: LLMOutputFormat.JSON };
        const result = processJson(textWithJson, context, completionOptions);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual({ key: "value" });
        }
      });
    });
  });
});
