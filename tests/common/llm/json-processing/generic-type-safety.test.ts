import "reflect-metadata";
import { describe, test, expect } from "@jest/globals";
import { z } from "zod";
import { LLMOutputFormat, LLMPurpose } from "../../../../src/common/llm/types/llm.types";
import { processJson } from "../../../../src/common/llm/json-processing/core/json-processing";

// Mock dependencies
jest.mock("../../../../src/common/utils/logging", () => ({
  logOneLineWarning: jest.fn(),
  logError: jest.fn(),
  logErrorMsg: jest.fn(),
}));

/**
 * Test suite for generic type safety in processJson.
 * Validates that schema types flow correctly through the JSON processing pipeline.
 */
describe("Generic Type Safety in processJson", () => {
  const mockContext = {
    resource: "test-resource",
    purpose: LLMPurpose.COMPLETIONS,
  };

  describe("Schema Type Propagation", () => {
    test("should preserve simple schema type through validation", () => {
      const simpleSchema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const jsonContent = '{"name": "Alice", "age": 30}';

      const result = processJson(
        jsonContent,
        mockContext,
        {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: simpleSchema,
        },
        false,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        // Type should be inferred as { name: string; age: number }
        expect(result.data.name).toBe("Alice");
        expect(result.data.age).toBe(30);
        // Compile-time check: these properties should exist and be correctly typed
        const _nameCheck: string = result.data.name;
        const _ageCheck: number = result.data.age;
        expect(_nameCheck).toBeDefined();
        expect(_ageCheck).toBeDefined();
      }
    });

    test("should handle complex nested schema types", () => {
      const nestedSchema = z.object({
        user: z.object({
          id: z.number(),
          profile: z.object({
            email: z.string(),
            verified: z.boolean(),
          }),
        }),
        metadata: z.object({
          created: z.string(),
          tags: z.array(z.string()),
        }),
      });

      const jsonContent = JSON.stringify({
        user: {
          id: 1,
          profile: {
            email: "test@example.com",
            verified: true,
          },
        },
        metadata: {
          created: "2024-01-01",
          tags: ["test", "example"],
        },
      });

      const result = processJson(
        jsonContent,
        mockContext,
        {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: nestedSchema,
        },
        false,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.user.id).toBe(1);
        expect(result.data.user.profile.email).toBe("test@example.com");
        expect(result.data.metadata.tags).toEqual(["test", "example"]);
      }
    });

    test("should handle array schema types", () => {
      const arraySchema = z.array(
        z.object({
          id: z.string(),
          value: z.number(),
        }),
      );

      const jsonContent = JSON.stringify([
        { id: "a", value: 1 },
        { id: "b", value: 2 },
      ]);

      const result = processJson(
        jsonContent,
        mockContext,
        {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: arraySchema,
        },
        false,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
        expect(result.data[0].id).toBe("a");
        expect(result.data[1].value).toBe(2);
      }
    });

    test("should handle union types in schemas", () => {
      const unionSchema = z.union([
        z.object({ type: z.literal("text"), content: z.string() }),
        z.object({ type: z.literal("number"), value: z.number() }),
      ]);

      const jsonContent1 = '{"type": "text", "content": "hello"}';
      const result1 = processJson(
        jsonContent1,
        mockContext,
        {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: unionSchema,
        },
        false,
      );

      expect(result1.success).toBe(true);
      if (result1.success) {
        expect(result1.data.type).toBe("text");
        if (result1.data.type === "text") {
          expect(result1.data.content).toBe("hello");
        }
      }

      const jsonContent2 = '{"type": "number", "value": 42}';
      const result2 = processJson(
        jsonContent2,
        mockContext,
        {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: unionSchema,
        },
        false,
      );

      expect(result2.success).toBe(true);
      if (result2.success) {
        expect(result2.data.type).toBe("number");
        if (result2.data.type === "number") {
          expect(result2.data.value).toBe(42);
        }
      }
    });

    test("should handle optional and nullable fields", () => {
      const optionalSchema = z.object({
        required: z.string(),
        optional: z.string().optional(),
        nullable: z.string().nullable(),
        both: z.string().optional().nullable(),
      });

      const jsonContent = JSON.stringify({
        required: "present",
        nullable: null,
      });

      const result = processJson(
        jsonContent,
        mockContext,
        {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: optionalSchema,
        },
        false,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.required).toBe("present");
        expect(result.data.optional).toBeUndefined();
        expect(result.data.nullable).toBeNull();
        expect(result.data.both).toBeUndefined();
      }
    });
  });

  describe("Schema Validation", () => {
    test("should fail validation when data doesn't match schema", () => {
      const strictSchema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const invalidJson = '{"name": "Bob", "age": "not a number"}';

      const result = processJson(
        invalidJson,
        mockContext,
        {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: strictSchema,
        },
        false,
      );

      expect(result.success).toBe(false);
    });

    test("should fail validation when required fields are missing", () => {
      const requiredSchema = z.object({
        id: z.number(),
        name: z.string(),
      });

      const missingFieldJson = '{"id": 1}';

      const result = processJson(
        missingFieldJson,
        mockContext,
        {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: requiredSchema,
        },
        false,
      );

      expect(result.success).toBe(false);
    });

    test("should validate with transforms when needed", () => {
      const schema = z.object({
        count: z.number(),
        items: z.array(z.string()),
      });

      // Test with a transform scenario (e.g., coercion)
      const jsonWithTypos = '{"count": 5, "items": []}';

      const result = processJson(
        jsonWithTypos,
        mockContext,
        {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: schema,
        },
        false,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.count).toBe(5);
        expect(result.data.items).toEqual([]);
      }
    });
  });

  describe("Edge Cases", () => {
    test("should handle no schema provided - defaults to Record<string, unknown>", () => {
      const jsonContent = '{"arbitrary": "data", "nested": {"value": 123}}';

      const result = processJson(
        jsonContent,
        mockContext,
        {
          outputFormat: LLMOutputFormat.JSON,
        },
        false,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        // Without schema, should return Record<string, unknown>
        expect(result.data).toEqual({ arbitrary: "data", nested: { value: 123 } });
      }
    });

    test("should fail on non-JSON string content", () => {
      const notJson = "This is not JSON";

      const result = processJson(
        notJson,
        mockContext,
        {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: z.object({ test: z.string() }),
        },
        false,
      );

      expect(result.success).toBe(false);
    });

    test("should handle schema with all optional fields", () => {
      const optionalSchema = z.object({
        optionalField: z.string().optional(),
        anotherOptional: z.number().optional(),
      });

      // Note: Empty objects are rejected by validateJsonWithTransforms early check
      // So we test with at least one field present
      const jsonContent = '{"optionalField": "value"}';

      const result = processJson(
        jsonContent,
        mockContext,
        {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: optionalSchema,
        },
        false,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.optionalField).toBe("value");
        expect(result.data.anotherOptional).toBeUndefined();
      }
    });
  });

  describe("Type Inference Verification", () => {
    test("should infer correct types at compile time", () => {
      const testSchema = z.object({
        stringField: z.string(),
        numberField: z.number(),
        boolField: z.boolean(),
        arrayField: z.array(z.string()),
        objectField: z.object({
          nested: z.string(),
        }),
      });

      const jsonContent = JSON.stringify({
        stringField: "test",
        numberField: 42,
        boolField: true,
        arrayField: ["a", "b"],
        objectField: { nested: "value" },
      });

      const result = processJson(
        jsonContent,
        mockContext,
        {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: testSchema,
        },
        false,
      );

      if (result.success) {
        // These assignments verify compile-time type inference
        const _s: string = result.data.stringField;
        const _n: number = result.data.numberField;
        const _b: boolean = result.data.boolField;
        const _a: string[] = result.data.arrayField;
        const _o: { nested: string } = result.data.objectField;

        // Runtime verification
        expect(_s).toBe("test");
        expect(_n).toBe(42);
        expect(_b).toBe(true);
        expect(_a).toEqual(["a", "b"]);
        expect(_o.nested).toBe("value");
      } else {
        fail("Expected successful validation");
      }
    });
  });
});
