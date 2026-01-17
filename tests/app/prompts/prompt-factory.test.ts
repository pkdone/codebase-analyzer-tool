import { Prompt, type PromptConfig } from "../../../src/common/prompts/prompt";
import { z } from "zod";
import { CODE_DATA_BLOCK_HEADER } from "../../../src/app/prompts/definitions/sources/definitions/source-config-factories";
import { FILE_SUMMARIES_DATA_BLOCK_HEADER } from "../../../src/app/prompts/definitions/app-summaries/app-summaries.factories";

describe("Prompt Class", () => {
  const testTemplate = "Test template with {{contentDesc}} and {{instructions}}";

  /**
   * Helper to create a valid test config entry with required fields.
   */
  function createTestConfig(overrides?: Partial<PromptConfig>): PromptConfig {
    return {
      contentDesc: "test content",
      instructions: ["test instruction"],
      responseSchema: z.string(),
      dataBlockHeader: CODE_DATA_BLOCK_HEADER,
      wrapInCodeBlock: true,
      ...overrides,
    };
  }

  describe("constructor", () => {
    it("should create prompt from config", () => {
      const config1 = createTestConfig({
        contentDesc: "content 1",
        responseSchema: z.string(),
        dataBlockHeader: FILE_SUMMARIES_DATA_BLOCK_HEADER,
        wrapInCodeBlock: false,
      });
      const config2 = createTestConfig({
        contentDesc: "content 2",
        responseSchema: z.number(),
        dataBlockHeader: CODE_DATA_BLOCK_HEADER,
        wrapInCodeBlock: true,
      });

      const prompt1 = new Prompt(config1, testTemplate);
      const prompt2 = new Prompt(config2, testTemplate);

      expect(prompt1).toBeDefined();
      expect(prompt1.contentDesc).toBe("content 1");
      expect(prompt1.template).toBe(testTemplate);
      expect(prompt1.dataBlockHeader).toBe(FILE_SUMMARIES_DATA_BLOCK_HEADER);

      expect(prompt2).toBeDefined();
      expect(prompt2.contentDesc).toBe("content 2");
    });

    it("should preserve contentDesc from config entries", () => {
      const config = createTestConfig({
        contentDesc: "custom content description",
      });

      const prompt = new Prompt(config, testTemplate);

      expect(prompt.contentDesc).toBe("custom content description");
    });

    it("should preserve instructions from config entries", () => {
      const config = createTestConfig({
        instructions: ["instruction 1", "instruction 2"],
      });

      const prompt = new Prompt(config, testTemplate);

      expect(prompt.instructions).toHaveLength(2);
      expect(prompt.instructions[0]).toBe("instruction 1");
      expect(prompt.instructions[1]).toBe("instruction 2");
    });

    it("should use dataBlockHeader from config entries", () => {
      const config1 = createTestConfig({
        contentDesc: "first content",
        dataBlockHeader: CODE_DATA_BLOCK_HEADER,
      });
      const config2 = createTestConfig({
        contentDesc: "second content",
        dataBlockHeader: FILE_SUMMARIES_DATA_BLOCK_HEADER,
      });

      const prompt1 = new Prompt(config1, testTemplate);
      const prompt2 = new Prompt(config2, testTemplate);

      expect(prompt1.dataBlockHeader).toBe(CODE_DATA_BLOCK_HEADER);
      expect(prompt2.dataBlockHeader).toBe(FILE_SUMMARIES_DATA_BLOCK_HEADER);
    });

    it("should use wrapInCodeBlock from config entries", () => {
      const config1 = createTestConfig({
        contentDesc: "first content",
        wrapInCodeBlock: true,
      });
      const config2 = createTestConfig({
        contentDesc: "second content",
        wrapInCodeBlock: false,
      });

      const prompt1 = new Prompt(config1, testTemplate);
      const prompt2 = new Prompt(config2, testTemplate);

      expect(prompt1.wrapInCodeBlock).toBe(true);
      expect(prompt2.wrapInCodeBlock).toBe(false);
    });

    it("should handle config with all fields", () => {
      const baseSchema = z.object({
        field1: z.string(),
        field2: z.number(),
      });

      const config = {
        responseSchema: baseSchema,
        contentDesc: "custom content description",
        instructions: ["Instruction for test"] as const,
        dataBlockHeader: CODE_DATA_BLOCK_HEADER,
        wrapInCodeBlock: true,
      } as const;

      const prompt = new Prompt(config, testTemplate);
      expect(prompt.contentDesc).toBe("custom content description");
      expect(prompt.instructions[0]).toBe("Instruction for test");
      expect(prompt.dataBlockHeader).toBe(CODE_DATA_BLOCK_HEADER);
      expect(prompt.wrapInCodeBlock).toBe(true);
      expect(prompt.responseSchema).toBe(baseSchema);
    });

    it("should preserve schema type information through generic type parameter", () => {
      const stringSchema = z.string();
      const numberSchema = z.number();
      const objectSchema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const stringConfig = {
        contentDesc: "string content",
        responseSchema: stringSchema,
        instructions: ["instruction"] as const,
        dataBlockHeader: CODE_DATA_BLOCK_HEADER,
        wrapInCodeBlock: true,
      } as const;
      const numberConfig = {
        contentDesc: "number content",
        responseSchema: numberSchema,
        instructions: ["instruction"] as const,
        dataBlockHeader: CODE_DATA_BLOCK_HEADER,
        wrapInCodeBlock: true,
      } as const;
      const objectConfig = {
        contentDesc: "object content",
        responseSchema: objectSchema,
        instructions: ["instruction"] as const,
        dataBlockHeader: CODE_DATA_BLOCK_HEADER,
        wrapInCodeBlock: true,
      } as const;

      const stringPrompt = new Prompt(stringConfig, testTemplate);
      const numberPrompt = new Prompt(numberConfig, testTemplate);
      const objectPrompt = new Prompt(objectConfig, testTemplate);

      // Verify runtime schema preservation
      expect(stringPrompt.responseSchema).toBe(stringSchema);
      expect(numberPrompt.responseSchema).toBe(numberSchema);
      expect(objectPrompt.responseSchema).toBe(objectSchema);

      // Type-level test: These should compile without type errors if generics work correctly
      expect(stringPrompt.responseSchema).toBeDefined();
      expect(numberPrompt.responseSchema).toBeDefined();
      expect(objectPrompt.responseSchema).toBeDefined();
    });

    it("should use FRAGMENTED_DATA header when specified in config", () => {
      const config = createTestConfig({
        contentDesc: "fragmented data to consolidate",
        responseSchema: z.object({ items: z.array(z.string()) }),
        instructions: ["consolidate the list"],
        dataBlockHeader: "FRAGMENTED_DATA",
        wrapInCodeBlock: false,
      });

      const prompt = new Prompt(config, testTemplate);

      expect(prompt.dataBlockHeader).toBe("FRAGMENTED_DATA");
    });
  });
});
