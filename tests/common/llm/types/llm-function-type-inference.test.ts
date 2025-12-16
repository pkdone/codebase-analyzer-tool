import "reflect-metadata";
import { describe, test, expect } from "@jest/globals";
import { z } from "zod";
import {
  LLMCompletionOptions,
  LLMOutputFormat,
  InferResponseType,
} from "../../../../src/common/llm/types/llm.types";

/**
 * Tests for compile-time type inference of InferResponseType.
 *
 * These tests verify that the InferResponseType helper correctly infers
 * return types from the jsonSchema in LLMCompletionOptions.
 */
describe("InferResponseType Helper Type", () => {
  describe("Schema-based type inference", () => {
    test("should infer type from Zod schema when jsonSchema is provided", () => {
      // Define a test schema - prefixed with _ since only used as type
      const _testSchema = z.object({
        name: z.string(),
        age: z.number(),
      });

      // Create options type with the schema
      interface OptionsWithSchema {
        outputFormat: LLMOutputFormat.JSON;
        jsonSchema: typeof _testSchema;
      }

      // Type assertion - if this compiles, the type inference is working
      type InferredType = InferResponseType<OptionsWithSchema>;

      // This should be { name: string; age: number }
      // We verify with a compile-time assignability check
      const testValue: InferredType = { name: "test", age: 25 };
      expect(testValue).toEqual({ name: "test", age: 25 });
    });

    test("should infer string when outputFormat is TEXT", () => {
      type OptionsWithTextFormat = LLMCompletionOptions & {
        outputFormat: LLMOutputFormat.TEXT;
      };

      type InferredType = InferResponseType<OptionsWithTextFormat>;

      // InferredType should be string (not LLMGeneratedContent)
      const stringValue: InferredType = "string value";

      expect(stringValue).toBe("string value");

      // The following would be compile-time errors (uncomment to verify):
      // const recordValue: InferredType = { key: "value" };
      // const nullValue: InferredType = null;
    });
  });

  describe("Type safety through call chain", () => {
    test("should preserve type information when schema is provided", () => {
      // This test verifies that the type flows correctly through the call chain
      const _summarySchema = z.object({
        purpose: z.string(),
        implementation: z.string(),
        complexity: z.number().optional(),
      });

      type SummaryType = z.infer<typeof _summarySchema>;

      // Compile-time check: InferResponseType should produce the same type as z.infer
      type InferredFromOptions = InferResponseType<{
        outputFormat: LLMOutputFormat.JSON;
        jsonSchema: typeof _summarySchema;
      }>;

      // These types should be compatible
      const summaryValue: SummaryType = {
        purpose: "test purpose",
        implementation: "test implementation",
      };

      // This assignment should work if types are compatible
      const inferredValue: InferredFromOptions = summaryValue;

      expect(inferredValue).toEqual(summaryValue);
    });

    test("should handle complex nested schemas", () => {
      const _complexSchema = z.object({
        metadata: z.object({
          version: z.number(),
          tags: z.array(z.string()),
        }),
        items: z.array(
          z.object({
            id: z.string(),
            value: z.unknown(),
          }),
        ),
      });

      type ComplexType = z.infer<typeof _complexSchema>;
      type InferredType = InferResponseType<{
        outputFormat: LLMOutputFormat.JSON;
        jsonSchema: typeof _complexSchema;
      }>;

      // Create a test value
      const testValue: ComplexType = {
        metadata: {
          version: 1,
          tags: ["tag1", "tag2"],
        },
        items: [{ id: "1", value: "test" }],
      };

      // This should compile without errors
      const inferred: InferredType = testValue;
      expect(inferred).toEqual(testValue);
    });

    test("should work with optional schema properties", () => {
      const _optionalSchema = z.object({
        required: z.string(),
        optional: z.string().optional(),
        nullable: z.string().nullable(),
      });

      type InferredType = InferResponseType<{
        outputFormat: LLMOutputFormat.JSON;
        jsonSchema: typeof _optionalSchema;
      }>;

      // Test with all properties
      const fullValue: InferredType = {
        required: "required",
        optional: "optional",
        nullable: null,
      };

      // Test with only required properties
      const minimalValue: InferredType = {
        required: "required",
        nullable: "not null",
      };

      expect(fullValue.required).toBe("required");
      expect(minimalValue.optional).toBeUndefined();
    });
  });

  describe("Edge cases", () => {
    test("should handle empty options", () => {
      // Empty options should resolve to LLMGeneratedContent
      type InferredType = InferResponseType<LLMCompletionOptions>;

      // Should accept string, record, number array, or null
      const stringVal: InferredType = "test";
      const recordVal: InferredType = { test: "value" };
      const arrayVal: InferredType = [1, 2, 3];
      const nullVal: InferredType = null;

      expect(stringVal).toBe("test");
      expect(recordVal).toEqual({ test: "value" });
      expect(arrayVal).toEqual([1, 2, 3]);
      expect(nullVal).toBeNull();
    });

    test("should handle union types in schema", () => {
      const _unionSchema = z.union([
        z.object({ type: z.literal("a"), value: z.string() }),
        z.object({ type: z.literal("b"), count: z.number() }),
      ]);

      type InferredType = InferResponseType<{
        outputFormat: LLMOutputFormat.JSON;
        jsonSchema: typeof _unionSchema;
      }>;

      const valueA: InferredType = { type: "a", value: "test" };
      const valueB: InferredType = { type: "b", count: 42 };

      expect(valueA.type).toBe("a");
      expect(valueB.type).toBe("b");
    });
  });
});
