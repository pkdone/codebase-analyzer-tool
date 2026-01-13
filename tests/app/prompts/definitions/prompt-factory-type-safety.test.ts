import { z } from "zod";
import { createPromptMetadata } from "../../../../src/app/prompts/prompt-registry";
import type { PromptDefinition } from "../../../../src/app/prompts/prompt.types";
import { DATA_BLOCK_HEADERS } from "../../../../src/app/prompts/prompt.types";

/**
 * Type safety tests for createPromptMetadata factory function.
 * These tests verify that the mapped return type correctly preserves
 * specific Zod schema types for each key in the config map.
 */
describe("createPromptMetadata Type Safety", () => {
  const testTemplate = "Test template with {{contentDesc}} and {{instructions}}";

  describe("Mapped Return Type Preservation", () => {
    it("should preserve distinct schema types for each key", () => {
      // Define config map with distinct schemas for each key
      const stringSchema = z.object({ stringField: z.string() });
      const numberSchema = z.object({ numberField: z.number() });
      const arraySchema = z.object({ arrayField: z.array(z.string()) });

      const configMap = {
        stringType: {
          label: "String Type",
          contentDesc: "string content",
          responseSchema: stringSchema,
          instructions: ["test"] as const,
        },
        numberType: {
          label: "Number Type",
          contentDesc: "number content",
          responseSchema: numberSchema,
          instructions: ["test"] as const,
        },
        arrayType: {
          label: "Array Type",
          contentDesc: "array content",
          responseSchema: arraySchema,
          instructions: ["test"] as const,
        },
      } as const;

      const result = createPromptMetadata(configMap, testTemplate);

      // Each key should have its specific schema preserved
      expect(result.stringType.responseSchema).toBe(stringSchema);
      expect(result.numberType.responseSchema).toBe(numberSchema);
      expect(result.arrayType.responseSchema).toBe(arraySchema);
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

      const configMap = {
        user: {
          label: "User",
          contentDesc: "user data",
          responseSchema: userSchema,
          instructions: [] as const,
        },
        product: {
          label: "Product",
          contentDesc: "product data",
          responseSchema: productSchema,
          instructions: [] as const,
        },
      } as const;

      const result = createPromptMetadata(configMap, testTemplate);

      // Type-level test: These should compile without error
      // demonstrating that the return type preserves schema information
      type UserPromptDef = (typeof result)["user"];
      type ProductPromptDef = (typeof result)["product"];

      // Runtime verification
      const userDef: UserPromptDef = result.user;
      const productDef: ProductPromptDef = result.product;

      expect(userDef.responseSchema).toBe(userSchema);
      expect(productDef.responseSchema).toBe(productSchema);
    });
  });

  describe("PromptDefinition Generic Parameter", () => {
    it("should produce PromptDefinition with correct generic parameter", () => {
      const schema = z.object({
        field: z.string(),
      });

      const configMap = {
        test: {
          label: "Test",
          contentDesc: "test content",
          responseSchema: schema,
          instructions: [] as const,
        },
      } as const;

      const result = createPromptMetadata(configMap, testTemplate);

      // The result should be a PromptDefinition with the specific schema type
      // Type-level verification: this should compile
      const testDef: PromptDefinition<typeof schema> = result.test;

      expect(testDef.responseSchema).toBe(schema);
    });
  });

  describe("Simplified Options", () => {
    it("should use dataBlockHeader option for all entries", () => {
      const schema = z.object({ data: z.string() });

      const configMap = {
        first: {
          label: "First Entry",
          contentDesc: "first content",
          responseSchema: schema,
          instructions: ["Instruction 1"] as const,
        },
        second: {
          label: "Second Entry",
          contentDesc: "second content",
          responseSchema: schema,
          instructions: ["Instruction 2"] as const,
        },
      } as const;

      const result = createPromptMetadata(configMap, testTemplate, {
        dataBlockHeader: DATA_BLOCK_HEADERS.CODE,
        wrapInCodeBlock: true,
      });

      expect(result.first.dataBlockHeader).toBe(DATA_BLOCK_HEADERS.CODE);
      expect(result.second.dataBlockHeader).toBe(DATA_BLOCK_HEADERS.CODE);
      expect(result.first.wrapInCodeBlock).toBe(true);
      expect(result.second.wrapInCodeBlock).toBe(true);
    });

    it("should use default FILE_SUMMARIES when dataBlockHeader not specified", () => {
      const configMap = {
        test: {
          label: "Test",
          contentDesc: "test content",
          responseSchema: z.string(),
          instructions: [] as const,
        },
      } as const;

      const result = createPromptMetadata(configMap, testTemplate);

      expect(result.test.dataBlockHeader).toBe(DATA_BLOCK_HEADERS.FILE_SUMMARIES);
      expect(result.test.wrapInCodeBlock).toBe(false);
    });

    it("should read contentDesc and instructions directly from config entries", () => {
      const configMap = {
        test: {
          label: "Test Entry",
          contentDesc: "custom description from config",
          responseSchema: z.string(),
          instructions: ["Step 1", "Step 2"] as const,
        },
      } as const;

      const result = createPromptMetadata(configMap, testTemplate);

      expect(result.test.contentDesc).toBe("custom description from config");
      expect(result.test.instructions).toEqual(["Step 1", "Step 2"]);
    });
  });

  describe("Empty Config Map Handling", () => {
    it("should return empty object for empty config map", () => {
      const result = createPromptMetadata({}, testTemplate);
      expect(result).toEqual({});
    });
  });

  describe("Type Safety with fileTypePromptRegistry and appSummaryConfigMap patterns", () => {
    it("should work with satisfies pattern similar to fileTypePromptRegistry", () => {
      interface TestConfigEntry<S extends z.ZodType = z.ZodType> {
        label: string;
        contentDesc: string;
        responseSchema: S;
        instructions: readonly string[];
      }

      const testConfigMap = {
        typeA: {
          label: "Type A",
          contentDesc: "type A content",
          responseSchema: z.object({ a: z.string() }),
          instructions: ["A instruction"] as const,
        },
        typeB: {
          label: "Type B",
          contentDesc: "type B content",
          responseSchema: z.object({ b: z.number() }),
          instructions: ["B instruction"] as const,
        },
      } as const satisfies Record<string, TestConfigEntry>;

      const result = createPromptMetadata(testConfigMap, testTemplate);

      // Schemas should be preserved through the factory
      expect(result.typeA.responseSchema).toBe(testConfigMap.typeA.responseSchema);
      expect(result.typeB.responseSchema).toBe(testConfigMap.typeB.responseSchema);

      // ContentDesc should be read from config
      expect(result.typeA.contentDesc).toBe("type A content");
      expect(result.typeB.contentDesc).toBe("type B content");

      // Validate that schemas are distinct
      const typeAShape = (result.typeA.responseSchema as z.ZodObject<z.ZodRawShape>).shape;
      const typeBShape = (result.typeB.responseSchema as z.ZodObject<z.ZodRawShape>).shape;

      expect(Object.keys(typeAShape)).toEqual(["a"]);
      expect(Object.keys(typeBShape)).toEqual(["b"]);
    });
  });
});
