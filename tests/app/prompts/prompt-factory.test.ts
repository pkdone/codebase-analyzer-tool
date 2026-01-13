import { createPromptMetadata } from "../../../src/app/prompts/prompt-registry";
import { DATA_BLOCK_HEADERS, PromptConfigEntry } from "../../../src/app/prompts/prompt.types";
import { z } from "zod";

describe("Prompt Factory", () => {
  const testTemplate = "Test template with {{contentDesc}} and {{instructions}}";

  /**
   * Helper to create a valid test config entry with required fields.
   */
  function createTestConfig(overrides?: Partial<PromptConfigEntry>): PromptConfigEntry {
    return {
      contentDesc: "test content",
      instructions: ["test instruction"],
      responseSchema: z.string(),
      dataBlockHeader: DATA_BLOCK_HEADERS.CODE,
      wrapInCodeBlock: true,
      ...overrides,
    };
  }

  describe("createPromptMetadata", () => {
    it("should create prompt metadata from config map", () => {
      const testConfigMap = {
        test1: createTestConfig({
          label: "Test 1",
          contentDesc: "content 1",
          responseSchema: z.string(),
          dataBlockHeader: DATA_BLOCK_HEADERS.FILE_SUMMARIES,
          wrapInCodeBlock: false,
        }),
        test2: createTestConfig({
          label: "Test 2",
          contentDesc: "content 2",
          responseSchema: z.number(),
          dataBlockHeader: DATA_BLOCK_HEADERS.CODE,
          wrapInCodeBlock: true,
        }),
      };

      const result = createPromptMetadata(testConfigMap, testTemplate);

      expect(result.test1).toBeDefined();
      expect(result.test1.label).toBe("Test 1");
      expect(result.test1.contentDesc).toBe("content 1");
      expect(result.test1.template).toBe(testTemplate);
      expect(result.test1.dataBlockHeader).toBe(DATA_BLOCK_HEADERS.FILE_SUMMARIES);

      expect(result.test2).toBeDefined();
      expect(result.test2.label).toBe("Test 2");
      expect(result.test2.contentDesc).toBe("content 2");
    });

    it("should preserve contentDesc from config entries", () => {
      const testConfigMap = {
        test1: createTestConfig({
          label: "Test 1",
          contentDesc: "custom content description",
        }),
      };

      const result = createPromptMetadata(testConfigMap, testTemplate);

      expect(result.test1.contentDesc).toBe("custom content description");
    });

    it("should preserve instructions from config entries", () => {
      const testConfigMap = {
        test1: createTestConfig({
          label: "Test 1",
          instructions: ["instruction 1", "instruction 2"],
        }),
      };

      const result = createPromptMetadata(testConfigMap, testTemplate);

      expect(result.test1.instructions).toHaveLength(2);
      expect(result.test1.instructions[0]).toBe("instruction 1");
      expect(result.test1.instructions[1]).toBe("instruction 2");
    });

    it("should use dataBlockHeader from config entries", () => {
      const testConfigMap = {
        test1: createTestConfig({
          label: "Test 1",
          contentDesc: "first content",
          dataBlockHeader: DATA_BLOCK_HEADERS.CODE,
        }),
        test2: createTestConfig({
          label: "Test 2",
          contentDesc: "second content",
          dataBlockHeader: DATA_BLOCK_HEADERS.FILE_SUMMARIES,
        }),
      };

      const result = createPromptMetadata(testConfigMap, testTemplate);

      expect(result.test1.dataBlockHeader).toBe(DATA_BLOCK_HEADERS.CODE);
      expect(result.test2.dataBlockHeader).toBe(DATA_BLOCK_HEADERS.FILE_SUMMARIES);
    });

    it("should use wrapInCodeBlock from config entries", () => {
      const testConfigMap = {
        test1: createTestConfig({
          label: "Test 1",
          contentDesc: "first content",
          wrapInCodeBlock: true,
        }),
        test2: createTestConfig({
          label: "Test 2",
          contentDesc: "second content",
          wrapInCodeBlock: false,
        }),
      };

      const result = createPromptMetadata(testConfigMap, testTemplate);

      expect(result.test1.wrapInCodeBlock).toBe(true);
      expect(result.test2.wrapInCodeBlock).toBe(false);
    });

    it("should handle config with all fields", () => {
      const baseSchema = z.object({
        field1: z.string(),
        field2: z.number(),
      });

      const testConfigMap = {
        test1: {
          label: "Test 1",
          responseSchema: baseSchema,
          contentDesc: "custom content description",
          instructions: ["Instruction for test"] as const,
          dataBlockHeader: DATA_BLOCK_HEADERS.CODE,
          wrapInCodeBlock: true,
        } as const,
      };

      const result = createPromptMetadata(testConfigMap, testTemplate);

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
          instructions: ["instruction"] as const,
          dataBlockHeader: DATA_BLOCK_HEADERS.CODE,
          wrapInCodeBlock: true,
        } as const,
        numberType: {
          label: "Number Type",
          contentDesc: "number content",
          responseSchema: numberSchema,
          instructions: ["instruction"] as const,
          dataBlockHeader: DATA_BLOCK_HEADERS.CODE,
          wrapInCodeBlock: true,
        } as const,
        objectType: {
          label: "Object Type",
          contentDesc: "object content",
          responseSchema: objectSchema,
          instructions: ["instruction"] as const,
          dataBlockHeader: DATA_BLOCK_HEADERS.CODE,
          wrapInCodeBlock: true,
        } as const,
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

    it("should use FRAGMENTED_DATA header when specified in config", () => {
      const testConfigMap = {
        reduce: createTestConfig({
          label: "Reduce",
          contentDesc: "fragmented data to consolidate",
          responseSchema: z.object({ items: z.array(z.string()) }),
          instructions: ["consolidate the list"],
          dataBlockHeader: DATA_BLOCK_HEADERS.FRAGMENTED_DATA,
          wrapInCodeBlock: false,
        }),
      };

      const result = createPromptMetadata(testConfigMap, testTemplate);

      expect(result.reduce.dataBlockHeader).toBe(DATA_BLOCK_HEADERS.FRAGMENTED_DATA);
    });
  });
});
