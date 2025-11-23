import { createPromptMetadata } from "../../src/prompts/definitions/prompt-factory";
import { z } from "zod";

describe("Prompt Factory", () => {
  interface TestConfig {
    label?: string;
    responseSchema: z.ZodType;
    contentDesc?: string;
    hasComplexSchema?: boolean;
  }

  const testTemplate = "Test template with {{contentDesc}} and {{instructions}}";

  describe("createPromptMetadata", () => {
    it("should create prompt metadata from config map with default values", () => {
      const testConfigMap: Record<string, TestConfig> = {
        test1: {
          label: "Test 1",
          responseSchema: z.string(),
        },
        test2: {
          label: "Test 2",
          responseSchema: z.number(),
        },
      };

      const result = createPromptMetadata(testConfigMap, testTemplate);

      expect(result.test1).toBeDefined();
      expect(result.test1.label).toBe("Test 1");
      expect(result.test1.contentDesc).toBe("a set of source file summaries");
      expect(result.test1.responseSchema).toBe(testConfigMap.test1.responseSchema);
      expect(result.test1.template).toBe(testTemplate);
      expect(result.test1.instructions).toEqual([]);

      expect(result.test2).toBeDefined();
      expect(result.test2.label).toBe("Test 2");
    });

    it("should use schemaBuilder when provided", () => {
      const baseSchema = z.object({
        field1: z.string(),
        field2: z.number(),
      });

      const testConfigMap: Record<string, TestConfig> = {
        test1: {
          label: "Test 1",
          responseSchema: baseSchema,
        },
      };

      const result = createPromptMetadata(testConfigMap, testTemplate, {
        schemaBuilder: (config) => {
          return (config.responseSchema as z.ZodObject<z.ZodRawShape>).pick({ field1: true });
        },
      });

      expect(result.test1.responseSchema).toBeDefined();
      const pickedSchema = result.test1.responseSchema as z.ZodObject<z.ZodRawShape>;
      expect(pickedSchema.shape.field1).toBeDefined();
      expect(pickedSchema.shape.field2).toBeUndefined();
    });

    it("should use contentDescBuilder when provided", () => {
      const testConfigMap: Record<string, TestConfig> = {
        test1: {
          label: "Test 1",
          responseSchema: z.string(),
          contentDesc: "custom content description",
        },
      };

      const result = createPromptMetadata(testConfigMap, testTemplate, {
        contentDescBuilder: (config) => config.contentDesc ?? "default",
      });

      expect(result.test1.contentDesc).toBe("custom content description");
    });

    it("should use instructionsBuilder when provided", () => {
      const testConfigMap: Record<string, TestConfig> = {
        test1: {
          label: "Test 1",
          responseSchema: z.string(),
        },
      };

      const result = createPromptMetadata(testConfigMap, testTemplate, {
        instructionsBuilder: () => [{ points: ["instruction 1", "instruction 2"] }],
      });

      expect(result.test1.instructions).toHaveLength(1);
      expect(result.test1.instructions[0].points).toHaveLength(2);
      expect(result.test1.instructions[0].points[0]).toBe("instruction 1");
      expect(result.test1.instructions[0].points[1]).toBe("instruction 2");
    });

    it("should preserve hasComplexSchema from config", () => {
      const testConfigMap: Record<string, TestConfig> = {
        test1: {
          label: "Test 1",
          responseSchema: z.string(),
          hasComplexSchema: false,
        },
        test2: {
          label: "Test 2",
          responseSchema: z.number(),
          hasComplexSchema: true,
        },
        test3: {
          label: "Test 3",
          responseSchema: z.boolean(),
        },
      };

      const result = createPromptMetadata(testConfigMap, testTemplate);

      expect(result.test1.hasComplexSchema).toBe(false);
      expect(result.test2.hasComplexSchema).toBe(true);
      expect(result.test3.hasComplexSchema).toBeUndefined();
    });

    it("should handle all builders together", () => {
      const baseSchema = z.object({
        field1: z.string(),
        field2: z.number(),
      });

      const testConfigMap: Record<string, TestConfig> = {
        test1: {
          label: "Test 1",
          responseSchema: baseSchema,
          contentDesc: "custom desc",
        },
      };

      const result = createPromptMetadata(testConfigMap, testTemplate, {
        schemaBuilder: (config) => {
          return (config.responseSchema as z.ZodObject<z.ZodRawShape>).pick({ field1: true });
        },
        contentDescBuilder: (config) => config.contentDesc ?? "default",
        instructionsBuilder: (config) => [
          { points: [`Instruction for ${config.label ?? "unknown"}`] },
        ],
      });

      expect(result.test1.label).toBe("Test 1");
      expect(result.test1.contentDesc).toBe("custom desc");
      expect(result.test1.instructions[0].points[0]).toBe("Instruction for Test 1");
      const pickedSchema = result.test1.responseSchema as z.ZodObject<z.ZodRawShape>;
      expect(pickedSchema.shape.field1).toBeDefined();
      expect(pickedSchema.shape.field2).toBeUndefined();
    });

    it("should work with empty config map", () => {
      const result = createPromptMetadata({}, testTemplate);
      expect(result).toEqual({});
    });
  });
});
