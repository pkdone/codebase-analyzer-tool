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
          expect(Array.isArray(result.mutationSteps)).toBe(true);
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
          expect(Array.isArray(result.mutationSteps)).toBe(true);
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

    describe("conditional schema fixing transforms", () => {
      it("should NOT apply transforms if validation succeeds on first attempt", () => {
        // Valid JSON that passes validation without needing transforms
        const schema = z.object({ name: z.string(), value: z.string() });
        const json = '{"name": "test", "value": "data"}';
        const completionOptions = {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: schema,
        };
        const result = processJson(json, context, completionOptions);

        expect(result.success).toBe(true);
        if (result.success) {
          // Data should be unchanged (no transforms applied)
          expect(result.data).toEqual({ name: "test", value: "data" });
        }
      });

      it("should apply transforms if validation fails on first attempt", () => {
        // JSON with null value that will fail validation, then transforms will fix it
        const schema = z.object({
          name: z.string(),
          groupId: z.string().optional(), // Does not allow null, only undefined
        });
        const json = '{"name": "test", "groupId": null}';
        const completionOptions = {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: schema,
        };
        const result = processJson(json, context, completionOptions);

        expect(result.success).toBe(true);
        if (result.success) {
          // convertNullToUndefined transform should have been applied
          const data = result.data;
          expect(data.name).toBe("test");
          expect("groupId" in data).toBe(false); // null converted to undefined and omitted
        }
      });

      it("should not apply transforms when no schema is provided", () => {
        // JSON with null value - transforms should NOT be applied without schema
        const json = '{"name": "test", "groupId": null}';
        const completionOptions = { outputFormat: LLMOutputFormat.JSON };
        const result = processJson(json, context, completionOptions);

        expect(result.success).toBe(true);
        if (result.success) {
          // No transforms applied - null should remain as null
          const data = result.data;
          expect(data.name).toBe("test");
          expect("groupId" in data).toBe(true); // null is still present
          expect(data.groupId).toBeNull();
        }
      });

      it("should apply transforms for property name typos when validation fails", () => {
        // JSON with typo that will fail validation, then transforms will fix it
        const schema = z.object({
          name: z.string(),
          type: z.string(), // Expects "type", not "type_"
        });
        const json = '{"name": "test", "type_": "string"}';
        const completionOptions = {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: schema,
        };
        const result = processJson(json, context, completionOptions);

        expect(result.success).toBe(true);
        if (result.success) {
          // fixCommonPropertyNameTypos transform should have been applied
          const data = result.data;
          expect(data.name).toBe("test");
          expect(data.type).toBe("string");
          expect("type_" in data).toBe(false);
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

    describe("type inference", () => {
      it("should infer return type from schema when schema is provided", () => {
        const personSchema = z.object({
          name: z.string(),
          age: z.number(),
        });
        const json = '{"name": "Alice", "age": 25}';
        const completionOptions = {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: personSchema,
        };

        const result = processJson(json, context, completionOptions);

        expect(result.success).toBe(true);
        if (result.success) {
          // Type should be inferred as { name: string; age: number }
          const data: z.infer<typeof personSchema> = result.data;
          expect(data.name).toBe("Alice");
          expect(data.age).toBe(25);
          // TypeScript should know about these properties
          expect(typeof data.name).toBe("string");
          expect(typeof data.age).toBe("number");
        }
      });

      it("should return Record<string, unknown> when no schema is provided", () => {
        const json = '{"key": "value", "number": 42}';
        const completionOptions = { outputFormat: LLMOutputFormat.JSON };

        const result = processJson(json, context, completionOptions);

        expect(result.success).toBe(true);
        if (result.success) {
          // Type should be Record<string, unknown>
          const data: Record<string, unknown> = result.data;
          expect(data.key).toBe("value");
          expect(data.number).toBe(42);
        }
      });

      it("should preserve complex schema types including arrays", () => {
        const itemsSchema = z.object({
          items: z.array(
            z.object({
              id: z.number(),
              name: z.string(),
            }),
          ),
        });
        const json = '{"items": [{"id": 1, "name": "Item1"}, {"id": 2, "name": "Item2"}]}';
        const completionOptions = {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: itemsSchema,
        };

        const result = processJson(json, context, completionOptions);

        expect(result.success).toBe(true);
        if (result.success) {
          // Type should be inferred with array
          const data: z.infer<typeof itemsSchema> = result.data;
          expect(Array.isArray(data.items)).toBe(true);
          expect(data.items.length).toBe(2);
          expect(data.items[0].id).toBe(1);
          expect(data.items[0].name).toBe("Item1");
        }
      });

      it("should handle optional properties in schema", () => {
        const optionalSchema = z.object({
          required: z.string(),
          optional: z.string().optional(),
        });
        const json = '{"required": "value"}';
        const completionOptions = {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: optionalSchema,
        };

        const result = processJson(json, context, completionOptions);

        expect(result.success).toBe(true);
        if (result.success) {
          const data: z.infer<typeof optionalSchema> = result.data;
          expect(data.required).toBe("value");
          expect(data.optional).toBeUndefined();
        }
      });

      it("should infer nested object types from schema", () => {
        const nestedSchema = z.object({
          outer: z.object({
            inner: z.object({
              value: z.string(),
            }),
          }),
        });
        const json = '{"outer": {"inner": {"value": "deep"}}}';
        const completionOptions = {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: nestedSchema,
        };

        const result = processJson(json, context, completionOptions);

        expect(result.success).toBe(true);
        if (result.success) {
          const data: z.infer<typeof nestedSchema> = result.data;
          expect(data.outer.inner.value).toBe("deep");
        }
      });

      it("should correctly type discriminated union results", () => {
        const unionSchema = z.discriminatedUnion("type", [
          z.object({ type: z.literal("a"), aField: z.string() }),
          z.object({ type: z.literal("b"), bField: z.number() }),
        ]);
        const json = '{"type": "a", "aField": "test"}';
        const completionOptions = {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: unionSchema,
        };

        const result = processJson(json, context, completionOptions);

        expect(result.success).toBe(true);
        if (result.success) {
          const data: z.infer<typeof unionSchema> = result.data;
          expect(data.type).toBe("a");
          if (data.type === "a") {
            expect(data.aField).toBe("test");
          }
        }
      });

      it("should type the success case correctly through discriminated union", () => {
        const schema = z.object({ value: z.string() });
        const json = '{"value": "test"}';
        const completionOptions = {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: schema,
        };

        const result = processJson(json, context, completionOptions);

        // Using the discriminated union pattern
        if (result.success) {
          // result.data is available and typed
          expect(result.data.value).toBe("test");
          expect(result.mutationSteps).toBeDefined();
        } else {
          // result.error is available
          expect(result.error).toBeDefined();
        }
      });
    });
  });
});
