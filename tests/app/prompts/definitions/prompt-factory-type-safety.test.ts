import { z } from "zod";
import { JSONSchemaPrompt } from "../../../../src/common/prompts/json-schema-prompt";
import { DEFAULT_PERSONA_INTRODUCTION } from "../../../../src/app/prompts/prompts.constants";
import {
  CODE_DATA_BLOCK_HEADER,
  FILE_SUMMARIES_DATA_BLOCK_HEADER,
} from "../../../../src/app/prompts/prompts.constants";

/**
 * Type safety tests for JSONSchemaPrompt class.
 * These tests verify that the JSONSchemaPrompt class correctly preserves
 * specific Zod schema types.
 */
describe("JSONSchemaPrompt Type Safety", () => {
  describe("Schema Type Preservation", () => {
    it("should preserve distinct schema types for each key", () => {
      // Define config map with distinct schemas for each key
      const stringSchema = z.object({ stringField: z.string() });
      const numberSchema = z.object({ numberField: z.number() });
      const arraySchema = z.object({ arrayField: z.array(z.string()) });

      const stringPrompt = new JSONSchemaPrompt({
        personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
        contentDesc: "string content",
        responseSchema: stringSchema,
        instructions: ["test"],
        dataBlockHeader: CODE_DATA_BLOCK_HEADER,
        wrapInCodeBlock: true,
      });
      const numberPrompt = new JSONSchemaPrompt({
        personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
        contentDesc: "number content",
        responseSchema: numberSchema,
        instructions: ["test"],
        dataBlockHeader: CODE_DATA_BLOCK_HEADER,
        wrapInCodeBlock: true,
      });
      const arrayPrompt = new JSONSchemaPrompt({
        personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
        contentDesc: "array content",
        responseSchema: arraySchema,
        instructions: ["test"],
        dataBlockHeader: CODE_DATA_BLOCK_HEADER,
        wrapInCodeBlock: true,
      });

      // Each key should have its specific schema preserved
      expect(stringPrompt.responseSchema).toBe(stringSchema);
      expect(numberPrompt.responseSchema).toBe(numberSchema);
      expect(arrayPrompt.responseSchema).toBe(arraySchema);
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

      const userPrompt = new JSONSchemaPrompt({
        personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
        contentDesc: "user data",
        responseSchema: userSchema,
        instructions: [],
        dataBlockHeader: FILE_SUMMARIES_DATA_BLOCK_HEADER,
        wrapInCodeBlock: false,
      });
      const productPrompt = new JSONSchemaPrompt({
        personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
        contentDesc: "product data",
        responseSchema: productSchema,
        instructions: [],
        dataBlockHeader: FILE_SUMMARIES_DATA_BLOCK_HEADER,
        wrapInCodeBlock: false,
      });

      // Runtime verification
      expect(userPrompt.responseSchema).toBe(userSchema);
      expect(productPrompt.responseSchema).toBe(productSchema);
    });
  });

  describe("JSONSchemaPrompt Generic Parameter", () => {
    it("should produce JSONSchemaPrompt with correct generic parameter", () => {
      const schema = z.object({
        field: z.string(),
      });

      const prompt = new JSONSchemaPrompt<typeof schema>({
        personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
        contentDesc: "test content",
        responseSchema: schema,
        instructions: [],
        dataBlockHeader: CODE_DATA_BLOCK_HEADER,
        wrapInCodeBlock: true,
      });

      // The result should be a JSONSchemaPrompt with the specific schema type
      expect(prompt.responseSchema).toBe(schema);
    });
  });

  describe("DataBlockHeader and WrapInCodeBlock from Config", () => {
    it("should use dataBlockHeader and wrapInCodeBlock from config entries", () => {
      const schema = z.object({ data: z.string() });

      const firstPrompt = new JSONSchemaPrompt({
        personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
        contentDesc: "first content",
        responseSchema: schema,
        instructions: ["Instruction 1"],
        dataBlockHeader: CODE_DATA_BLOCK_HEADER,
        wrapInCodeBlock: true,
      });
      const secondPrompt = new JSONSchemaPrompt({
        personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
        contentDesc: "second content",
        responseSchema: schema,
        instructions: ["Instruction 2"],
        dataBlockHeader: FILE_SUMMARIES_DATA_BLOCK_HEADER,
        wrapInCodeBlock: false,
      });

      expect(firstPrompt.dataBlockHeader).toBe(CODE_DATA_BLOCK_HEADER);
      expect(secondPrompt.dataBlockHeader).toBe(FILE_SUMMARIES_DATA_BLOCK_HEADER);
      expect(firstPrompt.wrapInCodeBlock).toBe(true);
      expect(secondPrompt.wrapInCodeBlock).toBe(false);
    });

    it("should read contentDesc and instructions directly from config entries", () => {
      const prompt = new JSONSchemaPrompt({
        personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
        contentDesc: "custom description from config",
        responseSchema: z.string(),
        instructions: ["Step 1", "Step 2"],
        dataBlockHeader: CODE_DATA_BLOCK_HEADER,
        wrapInCodeBlock: true,
      });

      expect(prompt.contentDesc).toBe("custom description from config");
      expect(prompt.instructions).toEqual(["Step 1", "Step 2"]);
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

      const typeAPrompt = new JSONSchemaPrompt(testConfigMap.typeA);
      const typeBPrompt = new JSONSchemaPrompt(testConfigMap.typeB);

      // Schemas should be preserved through the factory
      expect(typeAPrompt.responseSchema).toBe(testConfigMap.typeA.responseSchema);
      expect(typeBPrompt.responseSchema).toBe(testConfigMap.typeB.responseSchema);

      // ContentDesc should be read from config
      expect(typeAPrompt.contentDesc).toBe("type A content");
      expect(typeBPrompt.contentDesc).toBe("type B content");

      // DataBlockHeader should be preserved from config
      expect(typeAPrompt.dataBlockHeader).toBe(CODE_DATA_BLOCK_HEADER);
      expect(typeBPrompt.dataBlockHeader).toBe(FILE_SUMMARIES_DATA_BLOCK_HEADER);

      // Validate that schemas are distinct
      const typeAShape = (typeAPrompt.responseSchema as z.ZodObject<z.ZodRawShape>).shape;
      const typeBShape = (typeBPrompt.responseSchema as z.ZodObject<z.ZodRawShape>).shape;

      expect(Object.keys(typeAShape)).toEqual(["a"]);
      expect(Object.keys(typeBShape)).toEqual(["b"]);
    });
  });
});
