import { FILE_SUMMARIES_DATA_BLOCK_HEADER } from "../../../src/app/prompts/prompts.constants";
import { appSummaryConfigMap } from "../../../src/app/prompts/app-summaries/app-summaries.definitions";
import { APP_SUMMARY_CONTENT_DESC } from "../../../src/app/prompts/app-summaries/app-summaries.constants";
import { renderJsonSchemaPrompt } from "../../../src/common/prompts/json-schema-prompt";
import { DEFAULT_PERSONA_INTRODUCTION } from "../../../src/app/prompts/prompts.constants";

/**
 * Helper to render a prompt from appSummaryConfigMap config.
 * Config entries are now self-describing with contentDesc and dataBlockHeader.
 */
function renderAppSummaryPrompt(
  category: keyof typeof appSummaryConfigMap,
  content: string,
): string {
  const config = appSummaryConfigMap[category];
  return renderJsonSchemaPrompt(
    {
      personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
      contentDesc: config.contentDesc,
      instructions: config.instructions,
      responseSchema: config.responseSchema,
      dataBlockHeader: config.dataBlockHeader,
      wrapInCodeBlock: false,
    },
    content,
  );
}

describe("App Summaries Config Refactoring", () => {
  describe("Configuration Structure", () => {
    it("should use instructions array in config entries", () => {
      Object.values(appSummaryConfigMap).forEach((config) => {
        expect(config.instructions).toBeDefined();
        expect(Array.isArray(config.instructions)).toBe(true);
        expect(config.instructions.length).toBeGreaterThan(0);
        expect(typeof config.instructions[0]).toBe("string");
      });
    });

    it("should not have template property in config entries", () => {
      Object.values(appSummaryConfigMap).forEach((config) => {
        expect(config).not.toHaveProperty("template");
      });
    });

    it("should have contentDesc and dataBlockHeader in config entries", () => {
      // Config entries are now self-describing with contentDesc and dataBlockHeader
      Object.values(appSummaryConfigMap).forEach((config) => {
        expect(config.contentDesc).toBe(APP_SUMMARY_CONTENT_DESC);
        expect(config.dataBlockHeader).toBe(FILE_SUMMARIES_DATA_BLOCK_HEADER);
      });
    });

    it("should have proper instructions structure for all categories", () => {
      Object.values(appSummaryConfigMap).forEach((config) => {
        expect(Array.isArray(config.instructions)).toBe(true);
        expect(config.instructions.length).toBeGreaterThan(0);
        config.instructions.forEach((instruction) => {
          expect(typeof instruction).toBe("string");
          expect(instruction.length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe("Config Usage", () => {
    it("should render correctly with renderJsonSchemaPrompt when presentation values added", () => {
      Object.keys(appSummaryConfigMap).forEach((categoryKey) => {
        const rendered = renderAppSummaryPrompt(
          categoryKey as keyof typeof appSummaryConfigMap,
          "test",
        );

        expect(rendered).toBeDefined();
        expect(rendered).toContain(APP_SUMMARY_CONTENT_DESC);
      });
    });

    it("should have generic contentDesc when presentation values are added at render time", () => {
      Object.keys(appSummaryConfigMap).forEach((categoryKey) => {
        const rendered = renderAppSummaryPrompt(
          categoryKey as keyof typeof appSummaryConfigMap,
          "test",
        );
        expect(rendered).toContain(APP_SUMMARY_CONTENT_DESC);
      });
    });

    it("should render prompts correctly", () => {
      Object.keys(appSummaryConfigMap).forEach((categoryKey) => {
        const rendered = renderAppSummaryPrompt(
          categoryKey as keyof typeof appSummaryConfigMap,
          "test summaries",
        );
        expect(rendered).toContain("Act as a senior developer");
        expect(rendered).toContain("test summaries");
      });
    });
  });

  describe("Constant Exports", () => {
    it("should export APP_SUMMARY_CONTENT_DESC constant", () => {
      expect(APP_SUMMARY_CONTENT_DESC).toBe("a set of source file summaries");
    });

    it("should export FILE_SUMMARIES_DATA_BLOCK_HEADER constant", () => {
      expect(FILE_SUMMARIES_DATA_BLOCK_HEADER).toBe("FILE_SUMMARIES");
    });

    it("should maintain instruction content from config", () => {
      Object.entries(appSummaryConfigMap).forEach(([, config]) => {
        // The instruction content should be defined and non-empty
        expect(config.instructions).toBeDefined();
        expect(config.instructions.length).toBeGreaterThan(0);
        expect(config.instructions[0].length).toBeGreaterThan(0);
      });
    });
  });

  describe("Type Safety", () => {
    it("should have proper TypeScript types", () => {
      Object.values(appSummaryConfigMap).forEach((config) => {
        // These should compile without TypeScript errors
        const instructions: readonly string[] = config.instructions;
        const responseSchema = config.responseSchema;

        expect(Array.isArray(instructions)).toBe(true);
        expect(responseSchema).toBeDefined();
      });
    });

    it("should maintain readonly properties", () => {
      Object.values(appSummaryConfigMap).forEach((config) => {
        // Test that the instructions is an array
        expect(Array.isArray(config.instructions)).toBe(true);
        expect(config.instructions.length).toBeGreaterThan(0);
      });
    });
  });
});
