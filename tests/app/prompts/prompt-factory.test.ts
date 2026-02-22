import {
  renderJsonSchemaPrompt,
  type JSONSchemaPromptConfig,
} from "../../../src/common/prompts/json-schema-prompt";
import { z } from "zod";
import {
  CODE_DATA_BLOCK_HEADER,
  FILE_SUMMARIES_DATA_BLOCK_HEADER,
} from "../../../src/app/prompts/prompts.constants";
import { DEFAULT_PERSONA_INTRODUCTION } from "../../../src/app/prompts/prompts.constants";

describe("renderJsonSchemaPrompt Function", () => {
  /**
   * Helper to create a valid test config entry with required fields.
   */
  function createTestConfig(overrides?: Partial<JSONSchemaPromptConfig>): JSONSchemaPromptConfig {
    return {
      personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
      contentDesc: "test content",
      instructions: ["test instruction"],
      responseSchema: z.string(),
      dataBlockHeader: CODE_DATA_BLOCK_HEADER,
      wrapInCodeBlock: true,
      ...overrides,
    };
  }

  describe("config-based rendering", () => {
    it("should render prompts from different configs", () => {
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

      const rendered1 = renderJsonSchemaPrompt(config1, "test");
      const rendered2 = renderJsonSchemaPrompt(config2, "test");

      expect(rendered1).toBeDefined();
      expect(rendered1).toContain("content 1");
      expect(rendered1).toContain(FILE_SUMMARIES_DATA_BLOCK_HEADER + ":");

      expect(rendered2).toBeDefined();
      expect(rendered2).toContain("content 2");
    });

    it("should preserve contentDesc from config entries", () => {
      const config = createTestConfig({
        contentDesc: "custom content description",
      });

      const rendered = renderJsonSchemaPrompt(config, "test");

      expect(rendered).toContain("custom content description");
    });

    it("should preserve instructions from config entries", () => {
      const config = createTestConfig({
        instructions: ["instruction 1", "instruction 2"],
      });

      const rendered = renderJsonSchemaPrompt(config, "test");

      expect(rendered).toContain("instruction 1");
      expect(rendered).toContain("instruction 2");
    });

    it("should use dataBlockHeader from config entries", () => {
      const rendered1 = renderJsonSchemaPrompt(
        createTestConfig({
          contentDesc: "first content",
          dataBlockHeader: CODE_DATA_BLOCK_HEADER,
        }),
        "test",
      );
      const rendered2 = renderJsonSchemaPrompt(
        createTestConfig({
          contentDesc: "second content",
          dataBlockHeader: FILE_SUMMARIES_DATA_BLOCK_HEADER,
        }),
        "test",
      );

      expect(rendered1).toContain(CODE_DATA_BLOCK_HEADER + ":");
      expect(rendered2).toContain(FILE_SUMMARIES_DATA_BLOCK_HEADER + ":");
    });

    it("should handle wrapInCodeBlock correctly", () => {
      const rendered1 = renderJsonSchemaPrompt(
        createTestConfig({
          contentDesc: "first content",
          wrapInCodeBlock: true,
        }),
        "test content here",
      );
      const rendered2 = renderJsonSchemaPrompt(
        createTestConfig({
          contentDesc: "second content",
          wrapInCodeBlock: false,
        }),
        "test content here",
      );

      // With wrapInCodeBlock: true, content should be wrapped in ```
      expect(rendered1).toContain("```\ntest content here```");
      // With wrapInCodeBlock: false, no wrapper around content
      const contentSection2 = rendered2.split(CODE_DATA_BLOCK_HEADER + ":")[1];
      expect(contentSection2).not.toMatch(/^```\n/);
    });

    it("should handle config with all fields", () => {
      const baseSchema = z.object({
        field1: z.string(),
        field2: z.number(),
      });

      const config = {
        personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
        responseSchema: baseSchema,
        contentDesc: "custom content description",
        instructions: ["Instruction for test"] as const,
        dataBlockHeader: CODE_DATA_BLOCK_HEADER,
        wrapInCodeBlock: true,
      } as const;

      const rendered = renderJsonSchemaPrompt(config, "test");
      expect(rendered).toContain("custom content description");
      expect(rendered).toContain("Instruction for test");
      expect(rendered).toContain(CODE_DATA_BLOCK_HEADER + ":");
    });

    it("should preserve schema type information through rendering", () => {
      const stringSchema = z.string();
      const numberSchema = z.number();
      const objectSchema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const stringRendered = renderJsonSchemaPrompt(
        {
          personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
          contentDesc: "string content",
          responseSchema: stringSchema,
          instructions: ["instruction"] as const,
          dataBlockHeader: CODE_DATA_BLOCK_HEADER,
          wrapInCodeBlock: true,
        },
        "test",
      );
      const numberRendered = renderJsonSchemaPrompt(
        {
          personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
          contentDesc: "number content",
          responseSchema: numberSchema,
          instructions: ["instruction"] as const,
          dataBlockHeader: CODE_DATA_BLOCK_HEADER,
          wrapInCodeBlock: true,
        },
        "test",
      );
      const objectRendered = renderJsonSchemaPrompt(
        {
          personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
          contentDesc: "object content",
          responseSchema: objectSchema,
          instructions: ["instruction"] as const,
          dataBlockHeader: CODE_DATA_BLOCK_HEADER,
          wrapInCodeBlock: true,
        },
        "test",
      );

      // Verify each renders with appropriate schema type
      expect(stringRendered).toContain('"type": "string"');
      expect(numberRendered).toContain('"type": "number"');
      expect(objectRendered).toContain('"type": "object"');
    });

    it("should use FRAGMENTED_DATA header when specified in config", () => {
      const config = createTestConfig({
        contentDesc: "fragmented data to consolidate",
        responseSchema: z.object({ items: z.array(z.string()) }),
        instructions: ["consolidate the list"],
        dataBlockHeader: "FRAGMENTED_DATA",
        wrapInCodeBlock: false,
      });

      const rendered = renderJsonSchemaPrompt(config, "test");

      expect(rendered).toContain("FRAGMENTED_DATA:");
    });
  });
});
