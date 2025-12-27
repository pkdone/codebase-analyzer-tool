import { z } from "zod";
import { createPromptMetadata } from "../../../../src/app/prompts/definitions/prompt-factory";
import type { PromptDefinition } from "../../../../src/app/prompts/prompt.types";

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
          responseSchema: stringSchema,
        },
        numberType: {
          label: "Number Type",
          responseSchema: numberSchema,
        },
        arrayType: {
          label: "Array Type",
          responseSchema: arraySchema,
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
          responseSchema: userSchema,
        },
        product: {
          label: "Product",
          responseSchema: productSchema,
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
          responseSchema: schema,
        },
      } as const;

      const result = createPromptMetadata(configMap, testTemplate);

      // The result should be a PromptDefinition with the specific schema type
      // Type-level verification: this should compile
      const testDef: PromptDefinition<typeof schema> = result.test;

      expect(testDef.responseSchema).toBe(schema);
    });

    it("should default to z.ZodType when schema is not provided", () => {
      const configMap = {
        noSchema: {
          label: "No Schema",
          // No responseSchema provided
        },
      } as const;

      const result = createPromptMetadata(configMap, testTemplate);

      // Should default to z.unknown() when no schema is provided
      expect(result.noSchema.responseSchema).toBeInstanceOf(z.ZodType);
    });
  });

  describe("Builder Functions with Type Preservation", () => {
    it("should preserve schema types when using schemaBuilder", () => {
      const baseSchema = z.object({
        field1: z.string(),
        field2: z.number(),
        field3: z.boolean(),
      });

      const configMap = {
        withBuilder: {
          label: "With Builder",
          responseSchema: baseSchema,
        },
      } as const;

      // Use schemaBuilder to pick specific fields
      const result = createPromptMetadata(configMap, testTemplate, {
        schemaBuilder: (config) => {
          return (config.responseSchema as z.ZodObject<z.ZodRawShape>).pick({
            field1: true,
            field2: true,
          });
        },
      });

      // The built schema should only have the picked fields
      const builtSchema = result.withBuilder.responseSchema as z.ZodObject<z.ZodRawShape>;
      expect(Object.keys(builtSchema.shape).sort()).toEqual(["field1", "field2"]);
    });

    it("should work with all builder options together", () => {
      const schema = z.object({ data: z.string() });

      const configMap = {
        complete: {
          label: "Complete Entry",
          responseSchema: schema,
          contentDesc: "custom description",
        },
      } as const;

      const result = createPromptMetadata(configMap, testTemplate, {
        contentDescBuilder: (c) => `Modified: ${(c as { contentDesc?: string }).contentDesc ?? ""}`,
        instructionsBuilder: () => ["Instruction 1", "Instruction 2"],
        dataBlockHeaderBuilder: () => "CODE",
        wrapInCodeBlockBuilder: () => true,
      });

      expect(result.complete.contentDesc).toBe("Modified: custom description");
      expect(result.complete.instructions).toHaveLength(2);
      expect(result.complete.dataBlockHeader).toBe("CODE");
      expect(result.complete.wrapInCodeBlock).toBe(true);
      expect(result.complete.responseSchema).toBe(schema);
    });
  });

  describe("Empty Config Map Handling", () => {
    it("should return empty object for empty config map", () => {
      const result = createPromptMetadata({}, testTemplate);
      expect(result).toEqual({});
    });
  });

  describe("hasComplexSchema Preservation", () => {
    it("should preserve hasComplexSchema from config entries", () => {
      const schema = z.object({ field: z.string() });

      const configMap = {
        complex: {
          label: "Complex",
          responseSchema: schema,
          hasComplexSchema: true,
        },
        simple: {
          label: "Simple",
          responseSchema: schema,
          hasComplexSchema: false,
        },
        default: {
          label: "Default",
          responseSchema: schema,
          // No hasComplexSchema - should be undefined
        },
      } as const;

      const result = createPromptMetadata(configMap, testTemplate);

      expect(result.complex.hasComplexSchema).toBe(true);
      expect(result.simple.hasComplexSchema).toBe(false);
      expect(result.default.hasComplexSchema).toBeUndefined();
    });
  });

  describe("Type Safety with sourceConfigMap and appSummaryConfigMap patterns", () => {
    it("should work with satisfies pattern similar to sourceConfigMap", () => {
      interface TestConfigEntry<S extends z.ZodType = z.ZodType> {
        label: string;
        responseSchema: S;
      }

      const testConfigMap = {
        typeA: {
          label: "Type A",
          responseSchema: z.object({ a: z.string() }),
        },
        typeB: {
          label: "Type B",
          responseSchema: z.object({ b: z.number() }),
        },
      } as const satisfies Record<string, TestConfigEntry>;

      const result = createPromptMetadata(testConfigMap, testTemplate);

      // Schemas should be preserved through the factory
      expect(result.typeA.responseSchema).toBe(testConfigMap.typeA.responseSchema);
      expect(result.typeB.responseSchema).toBe(testConfigMap.typeB.responseSchema);

      // Validate that schemas are distinct
      const typeAShape = (result.typeA.responseSchema as z.ZodObject<z.ZodRawShape>).shape;
      const typeBShape = (result.typeB.responseSchema as z.ZodObject<z.ZodRawShape>).shape;

      expect(Object.keys(typeAShape)).toEqual(["a"]);
      expect(Object.keys(typeBShape)).toEqual(["b"]);
    });
  });
});
