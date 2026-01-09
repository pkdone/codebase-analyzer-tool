import { createPromptMetadata } from "../../../src/app/prompts/prompt-registry";
import { DATA_BLOCK_HEADERS } from "../../../src/app/prompts/prompt.types";
import { z } from "zod";

describe("Prompt Factory", () => {
  interface TestConfig {
    label?: string;
    contentDesc?: string;
    responseSchema?: z.ZodType;
    instructions?: readonly string[];
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
      expect(result.test1.contentDesc).toBe("content"); // Default value when no contentDesc provided
      expect(result.test1.responseSchema).toBe(testConfigMap.test1.responseSchema);
      expect(result.test1.template).toBe(testTemplate);
      expect(result.test1.instructions).toEqual([]);
      expect(result.test1.dataBlockHeader).toBe(DATA_BLOCK_HEADERS.FILE_SUMMARIES); // Default

      expect(result.test2).toBeDefined();
      expect(result.test2.label).toBe("Test 2");
    });

    it("should read contentDesc directly from config entries", () => {
      const testConfigMap: Record<string, TestConfig> = {
        test1: {
          label: "Test 1",
          responseSchema: z.string(),
          contentDesc: "custom content description",
        },
      };

      const result = createPromptMetadata(testConfigMap, testTemplate);

      expect(result.test1.contentDesc).toBe("custom content description");
    });

    it("should read instructions directly from config entries", () => {
      const testConfigMap: Record<string, TestConfig> = {
        test1: {
          label: "Test 1",
          responseSchema: z.string(),
          instructions: ["instruction 1", "instruction 2"],
        },
      };

      const result = createPromptMetadata(testConfigMap, testTemplate);

      expect(result.test1.instructions).toHaveLength(2);
      expect(result.test1.instructions[0]).toBe("instruction 1");
      expect(result.test1.instructions[1]).toBe("instruction 2");
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
      expect(result.test3.hasComplexSchema).toBe(true); // Defaults to true when not specified
    });

    it("should apply dataBlockHeader option to all entries", () => {
      const testConfigMap: Record<string, TestConfig> = {
        test1: {
          label: "Test 1",
          responseSchema: z.string(),
          contentDesc: "first content",
        },
        test2: {
          label: "Test 2",
          responseSchema: z.number(),
          contentDesc: "second content",
        },
      };

      const result = createPromptMetadata(testConfigMap, testTemplate, {
        dataBlockHeader: DATA_BLOCK_HEADERS.CODE,
      });

      expect(result.test1.dataBlockHeader).toBe(DATA_BLOCK_HEADERS.CODE);
      expect(result.test2.dataBlockHeader).toBe(DATA_BLOCK_HEADERS.CODE);
    });

    it("should apply wrapInCodeBlock option to all entries", () => {
      const testConfigMap: Record<string, TestConfig> = {
        test1: {
          label: "Test 1",
          responseSchema: z.string(),
          contentDesc: "first content",
        },
        test2: {
          label: "Test 2",
          responseSchema: z.number(),
          contentDesc: "second content",
        },
      };

      const result = createPromptMetadata(testConfigMap, testTemplate, {
        wrapInCodeBlock: true,
      });

      expect(result.test1.wrapInCodeBlock).toBe(true);
      expect(result.test2.wrapInCodeBlock).toBe(true);
    });

    it("should handle config with all fields", () => {
      const baseSchema = z.object({
        field1: z.string(),
        field2: z.number(),
      });

      const testConfigMap: Record<string, TestConfig> = {
        test1: {
          label: "Test 1",
          responseSchema: baseSchema,
          contentDesc: "custom content description",
          instructions: ["Instruction for test"],
        },
      };

      const result = createPromptMetadata(testConfigMap, testTemplate, {
        dataBlockHeader: DATA_BLOCK_HEADERS.CODE,
        wrapInCodeBlock: true,
      });

      expect(result.test1.label).toBe("Test 1");
      expect(result.test1.contentDesc).toBe("custom content description");
      expect(result.test1.instructions[0]).toBe("Instruction for test");
      expect(result.test1.dataBlockHeader).toBe(DATA_BLOCK_HEADERS.CODE);
      expect(result.test1.wrapInCodeBlock).toBe(true);
      expect(result.test1.responseSchema).toBe(baseSchema);
    });

    it("should work with empty config map", () => {
      const result = createPromptMetadata({}, testTemplate);
      expect(result).toEqual({});
    });

    it("should preserve schema type information through generic type parameter", () => {
      const stringSchema = z.string();
      const numberSchema = z.number();
      const objectSchema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const testConfigMap = {
        stringType: {
          label: "String Type",
          contentDesc: "string content",
          responseSchema: stringSchema,
        },
        numberType: {
          label: "Number Type",
          contentDesc: "number content",
          responseSchema: numberSchema,
        },
        objectType: {
          label: "Object Type",
          contentDesc: "object content",
          responseSchema: objectSchema,
        },
      };

      const result = createPromptMetadata(testConfigMap, testTemplate);

      // Verify runtime schema preservation
      expect(result.stringType.responseSchema).toBe(stringSchema);
      expect(result.numberType.responseSchema).toBe(numberSchema);
      expect(result.objectType.responseSchema).toBe(objectSchema);

      // Type-level test: These should compile without type errors if generics work correctly
      const stringPromptDef = result.stringType;
      const numberPromptDef = result.numberType;
      const objectPromptDef = result.objectType;

      expect(stringPromptDef.responseSchema).toBeDefined();
      expect(numberPromptDef.responseSchema).toBeDefined();
      expect(objectPromptDef.responseSchema).toBeDefined();
    });

    it("should default to z.unknown() when no responseSchema is provided", () => {
      const testConfigMap: Record<string, TestConfig> = {
        noSchema: {
          label: "No Schema",
          contentDesc: "content without schema",
        },
      };

      const result = createPromptMetadata(testConfigMap, testTemplate);

      expect(result.noSchema.responseSchema).toBeInstanceOf(z.ZodType);
    });

    it("should use FRAGMENTED_DATA header for reduce insights prompts", () => {
      const testConfigMap: Record<string, TestConfig> = {
        reduce: {
          label: "Reduce",
          contentDesc: "fragmented data to consolidate",
          responseSchema: z.object({ items: z.array(z.string()) }),
          instructions: ["consolidate the list"],
        },
      };

      const result = createPromptMetadata(testConfigMap, testTemplate, {
        dataBlockHeader: DATA_BLOCK_HEADERS.FRAGMENTED_DATA,
      });

      expect(result.reduce.dataBlockHeader).toBe(DATA_BLOCK_HEADERS.FRAGMENTED_DATA);
    });
  });
});
