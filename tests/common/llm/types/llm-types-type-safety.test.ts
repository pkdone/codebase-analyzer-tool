import { z } from "zod";
import { describe, test, expect } from "@jest/globals";
import {
  LLMOutputFormat,
  LLMCompletionOptions,
  isJsonOptionsWithSchema,
  isTextOptions,
  JsonCompletionOptions,
  TextCompletionOptions,
} from "../../../../src/common/llm/types/llm-request.types";
import { InferResponseType } from "../../../../src/common/llm/types/llm-response.types";

/**
 * Unit tests for LLM type safety utilities.
 * These tests verify that type guards and inference types work correctly
 * for both JSON and TEXT completion options.
 */
describe("LLM Types Type Safety", () => {
  describe("InferResponseType helper type", () => {
    test("should infer correct type for JSON with schema at compile time", () => {
      const schema = z.object({ name: z.string(), age: z.number() });
      // Use the schema both as a value (for validation) and as a type
      const options: LLMCompletionOptions<typeof schema> = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      };
      // Verify schema is used
      expect(options.jsonSchema).toBe(schema);

      // InferResponseType should infer the correct type from options
      const testValue: InferResponseType<typeof options> = { name: "test", age: 25 };
      expect(testValue.name).toBe("test");
      expect(testValue.age).toBe(25);
    });

    test("should infer string for TEXT format at compile time", () => {
      const options: LLMCompletionOptions = {
        outputFormat: LLMOutputFormat.TEXT,
      };
      expect(options.outputFormat).toBe(LLMOutputFormat.TEXT);

      // InferResponseType should infer string for TEXT output
      const testValue: InferResponseType<typeof options> = "test string";
      expect(typeof testValue).toBe("string");
    });

    test("should infer Record for JSON without schema at compile time", () => {
      const options: LLMCompletionOptions = {
        outputFormat: LLMOutputFormat.JSON,
      };
      expect(options.outputFormat).toBe(LLMOutputFormat.JSON);

      // Without schema, should be Record<string, unknown> or LLMGeneratedContent
      const testValue: InferResponseType<typeof options> = { anyKey: "anyValue" };
      expect(testValue).toBeDefined();
    });
  });

  describe("isJsonOptionsWithSchema type guard", () => {
    test("should return true for JSON options with schema", () => {
      const schema = z.object({ value: z.string() });
      const jsonOptions: LLMCompletionOptions<typeof schema> = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      };

      expect(isJsonOptionsWithSchema(jsonOptions)).toBe(true);
    });

    test("should return false for JSON options without schema", () => {
      const jsonOptionsNoSchema: LLMCompletionOptions = {
        outputFormat: LLMOutputFormat.JSON,
      };

      expect(isJsonOptionsWithSchema(jsonOptionsNoSchema)).toBe(false);
    });

    test("should return false for TEXT options", () => {
      const textOptions: LLMCompletionOptions = {
        outputFormat: LLMOutputFormat.TEXT,
      };

      expect(isJsonOptionsWithSchema(textOptions)).toBe(false);
    });

    test("should return false for undefined options", () => {
      expect(isJsonOptionsWithSchema(undefined)).toBe(false);
    });

    test("should narrow type correctly when guard returns true", () => {
      const schema = z.object({ id: z.number(), name: z.string() });
      const options: LLMCompletionOptions<typeof schema> = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      };

      if (isJsonOptionsWithSchema(options)) {
        // TypeScript should know options.jsonSchema exists and is the schema type
        const validated = options.jsonSchema.parse({ id: 1, name: "test" });
        expect(validated.id).toBe(1);
        expect(validated.name).toBe("test");
      } else {
        // This branch should not execute
        expect(true).toBe(false);
      }
    });

    test("should work with complex nested schemas", () => {
      const complexSchema = z.object({
        user: z.object({
          profile: z.object({
            firstName: z.string(),
            lastName: z.string(),
          }),
        }),
        metadata: z.record(z.string()),
      });

      const options: LLMCompletionOptions<typeof complexSchema> = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: complexSchema,
      };

      expect(isJsonOptionsWithSchema(options)).toBe(true);

      if (isJsonOptionsWithSchema(options)) {
        const testData = {
          user: { profile: { firstName: "John", lastName: "Doe" } },
          metadata: { key: "value" },
        };
        const validated = options.jsonSchema.parse(testData);
        expect(validated.user.profile.firstName).toBe("John");
      }
    });
  });

  describe("isTextOptions type guard", () => {
    test("should return true for TEXT options", () => {
      const textOptions: LLMCompletionOptions = {
        outputFormat: LLMOutputFormat.TEXT,
      };

      expect(isTextOptions(textOptions)).toBe(true);
    });

    test("should return false for JSON options", () => {
      const schema = z.object({ value: z.string() });
      const jsonOptions: LLMCompletionOptions<typeof schema> = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      };

      expect(isTextOptions(jsonOptions)).toBe(false);
    });

    test("should return false for JSON options without schema", () => {
      const jsonOptionsNoSchema: LLMCompletionOptions = {
        outputFormat: LLMOutputFormat.JSON,
      };

      expect(isTextOptions(jsonOptionsNoSchema)).toBe(false);
    });

    test("should return false for undefined options", () => {
      expect(isTextOptions(undefined)).toBe(false);
    });

    test("should narrow type correctly when guard returns true", () => {
      const options: LLMCompletionOptions = {
        outputFormat: LLMOutputFormat.TEXT,
      };

      if (isTextOptions(options)) {
        // TypeScript should know this is TEXT output
        expect(options.outputFormat).toBe(LLMOutputFormat.TEXT);
        // jsonSchema should be undefined for TEXT options
        expect(options.jsonSchema).toBeUndefined();
      } else {
        // This branch should not execute
        expect(true).toBe(false);
      }
    });

    test("should work with additional options like hasComplexSchema", () => {
      const textOptions: LLMCompletionOptions = {
        outputFormat: LLMOutputFormat.TEXT,
        hasComplexSchema: false,
      };

      expect(isTextOptions(textOptions)).toBe(true);

      if (isTextOptions(textOptions)) {
        expect(textOptions.hasComplexSchema).toBe(false);
      }
    });
  });

  describe("JsonCompletionOptions interface", () => {
    test("should accept valid JSON options with schema", () => {
      const schema = z.object({ value: z.string() });
      const options: JsonCompletionOptions<typeof schema> = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      };

      expect(options.outputFormat).toBe(LLMOutputFormat.JSON);
      expect(options.jsonSchema).toBe(schema);
    });

    test("should work with optional fields", () => {
      const schema = z.object({ count: z.number() });
      const options: JsonCompletionOptions<typeof schema> = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
        hasComplexSchema: true,
        sanitizerConfig: { numericProperties: ["count"] },
      };

      expect(options.hasComplexSchema).toBe(true);
      expect(options.sanitizerConfig?.numericProperties).toContain("count");
    });
  });

  describe("TextCompletionOptions interface", () => {
    test("should accept valid TEXT options", () => {
      const options: TextCompletionOptions = {
        outputFormat: LLMOutputFormat.TEXT,
      };

      expect(options.outputFormat).toBe(LLMOutputFormat.TEXT);
    });

    test("should work with optional fields", () => {
      const options: TextCompletionOptions = {
        outputFormat: LLMOutputFormat.TEXT,
        hasComplexSchema: false,
      };

      expect(options.hasComplexSchema).toBe(false);
    });
  });

  describe("Type guard combinations", () => {
    test("should correctly identify JSON vs TEXT using both guards", () => {
      const schema = z.object({ data: z.string() });
      const jsonOptions: LLMCompletionOptions<typeof schema> = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      };
      const textOptions: LLMCompletionOptions = {
        outputFormat: LLMOutputFormat.TEXT,
      };

      // JSON with schema
      expect(isJsonOptionsWithSchema(jsonOptions)).toBe(true);
      expect(isTextOptions(jsonOptions)).toBe(false);

      // TEXT
      expect(isJsonOptionsWithSchema(textOptions)).toBe(false);
      expect(isTextOptions(textOptions)).toBe(true);
    });

    test("should handle JSON without schema correctly", () => {
      const jsonNoSchema: LLMCompletionOptions = {
        outputFormat: LLMOutputFormat.JSON,
      };

      // Neither guard should return true for JSON without schema
      expect(isJsonOptionsWithSchema(jsonNoSchema)).toBe(false);
      expect(isTextOptions(jsonNoSchema)).toBe(false);
    });

    test("should use guards in conditional logic pattern", () => {
      const schema = z.object({ result: z.boolean() });
      const options: LLMCompletionOptions<typeof schema> | undefined = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      };

      let handledCorrectly = false;

      if (isJsonOptionsWithSchema(options)) {
        // JSON with schema path
        const parsed = options.jsonSchema.safeParse({ result: true });
        expect(parsed.success).toBe(true);
        handledCorrectly = true;
      } else if (isTextOptions(options)) {
        // TEXT path - should not execute
        expect(true).toBe(false);
      }

      expect(handledCorrectly).toBe(true);
    });
  });

  describe("Edge cases", () => {
    test("should handle array schemas", () => {
      const arraySchema = z.array(z.object({ id: z.number() }));
      const options: LLMCompletionOptions<typeof arraySchema> = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: arraySchema,
      };

      expect(isJsonOptionsWithSchema(options)).toBe(true);

      if (isJsonOptionsWithSchema(options)) {
        const validated = options.jsonSchema.parse([{ id: 1 }, { id: 2 }]);
        expect(validated).toHaveLength(2);
      }
    });

    test("should handle union schemas", () => {
      const unionSchema = z.union([
        z.object({ type: z.literal("a"), value: z.string() }),
        z.object({ type: z.literal("b"), count: z.number() }),
      ]);
      const options: LLMCompletionOptions<typeof unionSchema> = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: unionSchema,
      };

      expect(isJsonOptionsWithSchema(options)).toBe(true);
    });

    test("should handle discriminated union schemas", () => {
      const discriminatedSchema = z.discriminatedUnion("kind", [
        z.object({ kind: z.literal("circle"), radius: z.number() }),
        z.object({ kind: z.literal("square"), side: z.number() }),
      ]);
      const options: LLMCompletionOptions<typeof discriminatedSchema> = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: discriminatedSchema,
      };

      expect(isJsonOptionsWithSchema(options)).toBe(true);

      if (isJsonOptionsWithSchema(options)) {
        const validated = options.jsonSchema.parse({ kind: "circle", radius: 5 });
        expect(validated.kind).toBe("circle");
      }
    });
  });
});
