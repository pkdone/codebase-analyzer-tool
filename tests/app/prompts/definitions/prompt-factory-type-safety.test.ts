import { z } from "zod";
import { Prompt } from "../../../../src/common/prompts/prompt";
import { CODE_DATA_BLOCK_HEADER } from "../../../../src/app/prompts/definitions/sources/definitions/source-config-factories";
import { FILE_SUMMARIES_DATA_BLOCK_HEADER } from "../../../../src/app/prompts/definitions/app-summaries/app-summaries.factories";

/**
 * Type safety tests for Prompt class.
 * These tests verify that the Prompt class correctly preserves
 * specific Zod schema types.
 */
describe("Prompt Type Safety", () => {
  const testTemplate = "Test template with {{contentDesc}} and {{instructions}}";

  describe("Schema Type Preservation", () => {
    it("should preserve distinct schema types for each key", () => {
      // Define config map with distinct schemas for each key
      const stringSchema = z.object({ stringField: z.string() });
      const numberSchema = z.object({ numberField: z.number() });
      const arraySchema = z.object({ arrayField: z.array(z.string()) });

      const stringPrompt = new Prompt(
        {
          contentDesc: "string content",
          responseSchema: stringSchema,
          instructions: ["test"],
          dataBlockHeader: CODE_DATA_BLOCK_HEADER,
          wrapInCodeBlock: true,
        },
        testTemplate,
      );
      const numberPrompt = new Prompt(
        {
          contentDesc: "number content",
          responseSchema: numberSchema,
          instructions: ["test"],
          dataBlockHeader: CODE_DATA_BLOCK_HEADER,
          wrapInCodeBlock: true,
        },
        testTemplate,
      );
      const arrayPrompt = new Prompt(
        {
          contentDesc: "array content",
          responseSchema: arraySchema,
          instructions: ["test"],
          dataBlockHeader: CODE_DATA_BLOCK_HEADER,
          wrapInCodeBlock: true,
        },
        testTemplate,
      );

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

      const userPrompt = new Prompt(
        {
          contentDesc: "user data",
          responseSchema: userSchema,
          instructions: [],
          dataBlockHeader: FILE_SUMMARIES_DATA_BLOCK_HEADER,
          wrapInCodeBlock: false,
        },
        testTemplate,
      );
      const productPrompt = new Prompt(
        {
          contentDesc: "product data",
          responseSchema: productSchema,
          instructions: [],
          dataBlockHeader: FILE_SUMMARIES_DATA_BLOCK_HEADER,
          wrapInCodeBlock: false,
        },
        testTemplate,
      );

      // Runtime verification
      expect(userPrompt.responseSchema).toBe(userSchema);
      expect(productPrompt.responseSchema).toBe(productSchema);
    });
  });

  describe("Prompt Generic Parameter", () => {
    it("should produce Prompt with correct generic parameter", () => {
      const schema = z.object({
        field: z.string(),
      });

      const prompt = new Prompt<typeof schema>(
        {
          contentDesc: "test content",
          responseSchema: schema,
          instructions: [],
          dataBlockHeader: CODE_DATA_BLOCK_HEADER,
          wrapInCodeBlock: true,
        },
        testTemplate,
      );

      // The result should be a Prompt with the specific schema type
      expect(prompt.responseSchema).toBe(schema);
    });
  });

  describe("DataBlockHeader and WrapInCodeBlock from Config", () => {
    it("should use dataBlockHeader and wrapInCodeBlock from config entries", () => {
      const schema = z.object({ data: z.string() });

      const firstPrompt = new Prompt(
        {
          contentDesc: "first content",
          responseSchema: schema,
          instructions: ["Instruction 1"],
          dataBlockHeader: CODE_DATA_BLOCK_HEADER,
          wrapInCodeBlock: true,
        },
        testTemplate,
      );
      const secondPrompt = new Prompt(
        {
          contentDesc: "second content",
          responseSchema: schema,
          instructions: ["Instruction 2"],
          dataBlockHeader: FILE_SUMMARIES_DATA_BLOCK_HEADER,
          wrapInCodeBlock: false,
        },
        testTemplate,
      );

      expect(firstPrompt.dataBlockHeader).toBe(CODE_DATA_BLOCK_HEADER);
      expect(secondPrompt.dataBlockHeader).toBe(FILE_SUMMARIES_DATA_BLOCK_HEADER);
      expect(firstPrompt.wrapInCodeBlock).toBe(true);
      expect(secondPrompt.wrapInCodeBlock).toBe(false);
    });

    it("should read contentDesc and instructions directly from config entries", () => {
      const prompt = new Prompt(
        {
          contentDesc: "custom description from config",
          responseSchema: z.string(),
          instructions: ["Step 1", "Step 2"],
          dataBlockHeader: CODE_DATA_BLOCK_HEADER,
          wrapInCodeBlock: true,
        },
        testTemplate,
      );

      expect(prompt.contentDesc).toBe("custom description from config");
      expect(prompt.instructions).toEqual(["Step 1", "Step 2"]);
    });
  });

  describe("Type Safety with config map patterns", () => {
    it("should work with satisfies pattern similar to fileTypePromptRegistry", () => {
      interface TestConfigEntry<S extends z.ZodType = z.ZodType> {
        contentDesc: string;
        responseSchema: S;
        instructions: readonly string[];
        dataBlockHeader: "CODE" | "FILE_SUMMARIES" | "FRAGMENTED_DATA";
        wrapInCodeBlock: boolean;
      }

      const testConfigMap = {
        typeA: {
          contentDesc: "type A content",
          responseSchema: z.object({ a: z.string() }),
          instructions: ["A instruction"] as const,
          dataBlockHeader: CODE_DATA_BLOCK_HEADER,
          wrapInCodeBlock: true,
        },
        typeB: {
          contentDesc: "type B content",
          responseSchema: z.object({ b: z.number() }),
          instructions: ["B instruction"] as const,
          dataBlockHeader: FILE_SUMMARIES_DATA_BLOCK_HEADER,
          wrapInCodeBlock: false,
        },
      } as const satisfies Record<string, TestConfigEntry>;

      const typeAPrompt = new Prompt(testConfigMap.typeA, testTemplate);
      const typeBPrompt = new Prompt(testConfigMap.typeB, testTemplate);

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
