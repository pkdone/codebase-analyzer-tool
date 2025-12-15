import "reflect-metadata";
import { describe, test, expect } from "@jest/globals";
import { z } from "zod";
import {
  LLMCompletionOptions,
  LLMOutputFormat,
  InferResponseType,
} from "../../../src/llm/types/llm.types";

/**
 * Comprehensive test suite for TEXT output format type safety improvements.
 *
 * These tests verify that:
 * 1. InferResponseType correctly infers 'string' for TEXT format
 * 2. Type inference works without unsafe type assertions
 * 3. The type system prevents common type errors at compile time
 */
describe("TEXT Format Type Safety", () => {
  describe("InferResponseType for TEXT format", () => {
    test("should infer string type when outputFormat is TEXT", () => {
      // Define options with TEXT format
      interface TextOptions {
        outputFormat: LLMOutputFormat.TEXT;
      }

      // Type should be inferred as string
      type InferredType = InferResponseType<TextOptions>;

      // Compile-time test: string should be assignable to InferredType
      const textValue: InferredType = "sample text response";
      expect(textValue).toBe("sample text response");

      // TypeScript should allow string operations without casting
      const upperCase: string = textValue.toUpperCase();
      expect(upperCase).toBe("SAMPLE TEXT RESPONSE");
    });

    test("should infer string for TEXT format even when jsonSchema property is absent", () => {
      interface TextOnlyOptions {
        outputFormat: LLMOutputFormat.TEXT;
        // No jsonSchema property
      }

      type InferredType = InferResponseType<TextOnlyOptions>;

      // Should be string, not LLMGeneratedContent
      const result: InferredType = "text result";
      expect(typeof result).toBe("string");
    });

    test("should handle TEXT format with hasComplexSchema option", () => {
      interface TextWithComplexFlag {
        outputFormat: LLMOutputFormat.TEXT;
        hasComplexSchema?: boolean;
      }

      type InferredType = InferResponseType<TextWithComplexFlag>;

      const result: InferredType = "complex text";
      expect(result).toBe("complex text");
    });
  });

  describe("InferResponseType for JSON format", () => {
    test("should infer schema type when outputFormat is JSON with schema", () => {
      const _testSchema = z.object({
        title: z.string(),
        count: z.number(),
      });

      interface JsonWithSchemaOptions {
        outputFormat: LLMOutputFormat.JSON;
        jsonSchema: typeof _testSchema;
      }

      type InferredType = InferResponseType<JsonWithSchemaOptions>;

      // Should infer the schema type
      const result: InferredType = {
        title: "test",
        count: 42,
      };

      expect(result.title).toBe("test");
      expect(result.count).toBe(42);
    });

    test("should infer Record<string, unknown> when outputFormat is JSON without schema", () => {
      interface JsonWithoutSchemaOptions {
        outputFormat: LLMOutputFormat.JSON;
        // No jsonSchema
      }

      type InferredType = InferResponseType<JsonWithoutSchemaOptions>;

      // Should be Record<string, unknown>
      const result: InferredType = {
        anyKey: "anyValue",
        anotherKey: 123,
      };

      expect(result).toEqual({ anyKey: "anyValue", anotherKey: 123 });
    });
  });

  describe("Type safety comparisons", () => {
    test("TEXT format should NOT accept Record types without casting", () => {
      interface TextOptions {
        outputFormat: LLMOutputFormat.TEXT;
      }

      type TextType = InferResponseType<TextOptions>;

      // This should compile (string is assignable)
      const validText: TextType = "valid string";
      expect(validText).toBe("valid string");

      // The following would be a compile-time error (uncomment to verify):
      // const invalidRecord: TextType = { key: "value" };
    });

    test("JSON format with schema should NOT accept arbitrary objects", () => {
      const _strictSchema = z.object({
        id: z.number(),
        name: z.string(),
      });

      interface StrictJsonOptions {
        outputFormat: LLMOutputFormat.JSON;
        jsonSchema: typeof _strictSchema;
      }

      type StrictType = InferResponseType<StrictJsonOptions>;

      // This should compile
      const valid: StrictType = { id: 1, name: "test" };
      expect(valid).toEqual({ id: 1, name: "test" });

      // The following would be compile-time errors (uncomment to verify):
      // const wrongShape: StrictType = { wrongKey: "value" };
      // const wrongType: StrictType = { id: "string", name: "test" };
    });

    test("should differentiate between TEXT and JSON output formats", () => {
      interface TextOptions {
        outputFormat: LLMOutputFormat.TEXT;
      }

      interface JsonOptions {
        outputFormat: LLMOutputFormat.JSON;
      }

      type TextType = InferResponseType<TextOptions>;
      type JsonType = InferResponseType<JsonOptions>;

      // TEXT should be string
      const textResult: TextType = "text";
      expect(typeof textResult).toBe("string");

      // JSON without schema should be Record<string, unknown>
      const jsonResult: JsonType = { key: "value" };
      expect(typeof jsonResult).toBe("object");
    });
  });

  describe("Edge cases and fallbacks", () => {
    test("should default to LLMGeneratedContent when format is not specified", () => {
      // Options without outputFormat should fall back to LLMGeneratedContent
      type MinimalOptions = LLMCompletionOptions;

      type InferredType = InferResponseType<MinimalOptions>;

      // Should accept any LLMGeneratedContent value
      const stringVal: InferredType = "string";
      const recordVal: InferredType = { key: "value" };
      const arrayVal: InferredType = [1, 2, 3];
      const nullVal: InferredType = null;

      expect(stringVal).toBe("string");
      expect(recordVal).toEqual({ key: "value" });
      expect(arrayVal).toEqual([1, 2, 3]);
      expect(nullVal).toBeNull();
    });

    test("should handle empty string responses for TEXT format", () => {
      interface TextOptions {
        outputFormat: LLMOutputFormat.TEXT;
      }

      type InferredType = InferResponseType<TextOptions>;

      // Empty string should be valid
      const emptyResult: InferredType = "";
      expect(emptyResult).toBe("");
      expect(emptyResult.length).toBe(0);
    });

    test("should handle multiline text responses", () => {
      interface TextOptions {
        outputFormat: LLMOutputFormat.TEXT;
      }

      type InferredType = InferResponseType<TextOptions>;

      const multilineText: InferredType = `Line 1
Line 2
Line 3`;

      expect(multilineText).toContain("Line 1");
      expect(multilineText).toContain("Line 2");
      expect(multilineText).toContain("Line 3");
    });

    test("should handle text with special characters", () => {
      interface TextOptions {
        outputFormat: LLMOutputFormat.TEXT;
      }

      type InferredType = InferResponseType<TextOptions>;

      const specialText: InferredType = "Text with\ttabs\nand\r\nnewlines";
      expect(specialText).toContain("\t");
      expect(specialText).toContain("\n");
    });
  });

  describe("Type inference through function signatures", () => {
    test("should infer return type from options parameter", () => {
      // Simulate a function that uses InferResponseType
      function mockLLMCall<TOptions extends LLMCompletionOptions>(
        _prompt: string,
        options: TOptions,
      ): InferResponseType<TOptions> {
        // Mock implementation
        if (options.outputFormat === LLMOutputFormat.TEXT) {
          return "mock text response" as InferResponseType<TOptions>;
        }
        return { mock: "response" } as InferResponseType<TOptions>;
      }

      // Call with TEXT format
      const textResult = mockLLMCall("test prompt", {
        outputFormat: LLMOutputFormat.TEXT,
      });

      // TypeScript should infer this as string
      expect(typeof textResult).toBe("string");

      // Call with JSON format
      const jsonResult = mockLLMCall("test prompt", {
        outputFormat: LLMOutputFormat.JSON,
      });

      // TypeScript should infer this as Record<string, unknown>
      expect(typeof jsonResult).toBe("object");
    });

    test("should work with async functions returning Promise", async () => {
      async function mockAsyncLLMCall<TOptions extends LLMCompletionOptions>(
        _prompt: string,
        options: TOptions,
      ): Promise<InferResponseType<TOptions> | null> {
        if (options.outputFormat === LLMOutputFormat.TEXT) {
          return "async text response" as InferResponseType<TOptions>;
        }
        return null;
      }

      // Type inference should work through Promise
      const resultPromise = mockAsyncLLMCall("test", {
        outputFormat: LLMOutputFormat.TEXT,
      });

      expect(resultPromise).toBeInstanceOf(Promise);
      const result = await resultPromise;
      expect(typeof result).toBe("string");
    });
  });

  describe("Real-world usage patterns", () => {
    test("should support template string interpolation without casting", () => {
      interface TextOptions {
        outputFormat: LLMOutputFormat.TEXT;
      }

      type InferredType = InferResponseType<TextOptions>;

      const llmResponse: InferredType = "LLM generated text";

      // Should work directly in template strings without 'as string'
      const formatted = `Response: ${llmResponse}`;
      expect(formatted).toBe("Response: LLM generated text");
    });

    test("should support string methods without casting", () => {
      interface TextOptions {
        outputFormat: LLMOutputFormat.TEXT;
      }

      type InferredType = InferResponseType<TextOptions>;

      const response: InferredType = "  trim me  ";

      // String methods should be available without casting
      const trimmed = response.trim();
      const upper = response.toUpperCase();
      const includes = response.includes("trim");

      expect(trimmed).toBe("trim me");
      expect(upper).toContain("TRIM");
      expect(includes).toBe(true);
    });

    test("should support concatenation without casting", () => {
      interface TextOptions {
        outputFormat: LLMOutputFormat.TEXT;
      }

      type InferredType = InferResponseType<TextOptions>;

      const part1: InferredType = "Hello";
      const part2: InferredType = "World";

      // Should concatenate without casting
      const combined = part1 + " " + part2;
      expect(combined).toBe("Hello World");
    });
  });
});
