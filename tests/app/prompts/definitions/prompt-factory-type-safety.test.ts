import { z } from "zod";
import { renderJsonSchemaPrompt } from "../../../../src/common/prompts/json-schema-prompt";
import { DEFAULT_PERSONA_INTRODUCTION } from "../../../../src/app/prompts/prompts.constants";
import {
  CODE_DATA_BLOCK_HEADER,
  FILE_SUMMARIES_DATA_BLOCK_HEADER,
} from "../../../../src/app/prompts/prompts.constants";

/**
 * Type safety tests for renderJsonSchemaPrompt function.
 * These tests verify that the renderJsonSchemaPrompt function correctly handles
 * specific Zod schema types in config.
 */
describe("renderJsonSchemaPrompt Type Safety", () => {
  describe("Schema Type Preservation", () => {
    it("should preserve distinct schema types for each config", () => {
      // Define config map with distinct schemas for each key
      const stringSchema = z.object({ stringField: z.string() });
      const numberSchema = z.object({ numberField: z.number() });
      const arraySchema = z.object({ arrayField: z.array(z.string()) });

      const stringResult = renderJsonSchemaPrompt(
        {
          personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
          contentDesc: "string content",
          responseSchema: stringSchema,
          instructions: ["test"],
          dataBlockHeader: CODE_DATA_BLOCK_HEADER,
          wrapInCodeBlock: true,
        },
        "test",
      );
      const numberResult = renderJsonSchemaPrompt(
        {
          personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
          contentDesc: "number content",
          responseSchema: numberSchema,
          instructions: ["test"],
          dataBlockHeader: CODE_DATA_BLOCK_HEADER,
          wrapInCodeBlock: true,
        },
        "test",
      );
      const arrayResult = renderJsonSchemaPrompt(
        {
          personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
          contentDesc: "array content",
          responseSchema: arraySchema,
          instructions: ["test"],
          dataBlockHeader: CODE_DATA_BLOCK_HEADER,
          wrapInCodeBlock: true,
        },
        "test",
      );

      // Each should render with its specific schema
      expect(stringResult).toContain('"stringField"');
      expect(numberResult).toContain('"numberField"');
      expect(arrayResult).toContain('"arrayField"');
    });

    it("should infer correct schema type via type inference", () => {
      const userSchema = z.object({
        name: z.string(),
        email: z.string().email(),
      });

      const productSchema = z.object({
        id: z.number(),
        price: z.number(),
      });

      const userResult = renderJsonSchemaPrompt(
        {
          personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
          contentDesc: "user data",
          responseSchema: userSchema,
          instructions: [],
          dataBlockHeader: FILE_SUMMARIES_DATA_BLOCK_HEADER,
          wrapInCodeBlock: false,
        },
        "test",
      );
      const productResult = renderJsonSchemaPrompt(
        {
          personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
          contentDesc: "product data",
          responseSchema: productSchema,
          instructions: [],
          dataBlockHeader: FILE_SUMMARIES_DATA_BLOCK_HEADER,
          wrapInCodeBlock: false,
        },
        "test",
      );

      // Runtime verification
      expect(userResult).toContain('"name"');
      expect(userResult).toContain('"email"');
      expect(productResult).toContain('"id"');
      expect(productResult).toContain('"price"');
    });
  });

  describe("renderJsonSchemaPrompt Generic Parameter", () => {
    it("should produce rendered prompt with correct schema", () => {
      const schema = z.object({
        field: z.string(),
      });

      const result = renderJsonSchemaPrompt(
        {
          personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
          contentDesc: "test content",
          responseSchema: schema,
          instructions: [],
          dataBlockHeader: CODE_DATA_BLOCK_HEADER,
          wrapInCodeBlock: true,
        },
        "test",
      );

      // The result should contain the schema
      expect(result).toContain('"field"');
    });
  });

  describe("DataBlockHeader and WrapInCodeBlock from Config", () => {
    it("should use dataBlockHeader and wrapInCodeBlock from config entries", () => {
      const schema = z.object({ data: z.string() });

      const firstResult = renderJsonSchemaPrompt(
        {
          personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
          contentDesc: "first content",
          responseSchema: schema,
          instructions: ["Instruction 1"],
          dataBlockHeader: CODE_DATA_BLOCK_HEADER,
          wrapInCodeBlock: true,
        },
        "test",
      );
      const secondResult = renderJsonSchemaPrompt(
        {
          personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
          contentDesc: "second content",
          responseSchema: schema,
          instructions: ["Instruction 2"],
          dataBlockHeader: FILE_SUMMARIES_DATA_BLOCK_HEADER,
          wrapInCodeBlock: false,
        },
        "test",
      );

      expect(firstResult).toContain(CODE_DATA_BLOCK_HEADER + ":");
      expect(secondResult).toContain(FILE_SUMMARIES_DATA_BLOCK_HEADER + ":");
    });

    it("should read contentDesc and instructions directly from config entries", () => {
      const result = renderJsonSchemaPrompt(
        {
          personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
          contentDesc: "custom description from config",
          responseSchema: z.string(),
          instructions: ["Step 1", "Step 2"],
          dataBlockHeader: CODE_DATA_BLOCK_HEADER,
          wrapInCodeBlock: true,
        },
        "test",
      );

      expect(result).toContain("custom description from config");
      expect(result).toContain("Step 1");
      expect(result).toContain("Step 2");
    });
  });

  describe("Type Safety with config map patterns", () => {
    it("should work with satisfies pattern similar to fileTypePromptRegistry", () => {
      interface TestConfigEntry<S extends z.ZodType = z.ZodType> {
        personaIntroduction: string;
        contentDesc: string;
        responseSchema: S;
        instructions: readonly string[];
        dataBlockHeader: "CODE" | "FILE_SUMMARIES" | "FRAGMENTED_DATA";
        wrapInCodeBlock: boolean;
      }

      const testConfigMap = {
        typeA: {
          personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
          contentDesc: "type A content",
          responseSchema: z.object({ a: z.string() }),
          instructions: ["A instruction"] as const,
          dataBlockHeader: CODE_DATA_BLOCK_HEADER,
          wrapInCodeBlock: true,
        },
        typeB: {
          personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
          contentDesc: "type B content",
          responseSchema: z.object({ b: z.number() }),
          instructions: ["B instruction"] as const,
          dataBlockHeader: FILE_SUMMARIES_DATA_BLOCK_HEADER,
          wrapInCodeBlock: false,
        },
      } as const satisfies Record<string, TestConfigEntry>;

      const typeAResult = renderJsonSchemaPrompt(testConfigMap.typeA, "test");
      const typeBResult = renderJsonSchemaPrompt(testConfigMap.typeB, "test");

      // Schemas should be rendered correctly
      expect(typeAResult).toContain('"a"');
      expect(typeBResult).toContain('"b"');

      // ContentDesc should be read from config
      expect(typeAResult).toContain("type A content");
      expect(typeBResult).toContain("type B content");

      // DataBlockHeader should be preserved from config
      expect(typeAResult).toContain(CODE_DATA_BLOCK_HEADER + ":");
      expect(typeBResult).toContain(FILE_SUMMARIES_DATA_BLOCK_HEADER + ":");
    });
  });
});
