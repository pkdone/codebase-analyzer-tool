import {
  appSummaryConfigMap,
  FILE_SUMMARIES_DATA_BLOCK_HEADER,
  APP_SUMMARY_CONTENT_DESC,
} from "../../../src/app/prompts/app-summaries/app-summaries.definitions";
import {
  JSONSchemaPrompt,
  type JSONSchemaPromptConfig,
} from "../../../src/common/prompts/json-schema-prompt";
import { DEFAULT_PERSONA_INTRODUCTION } from "../../../src/app/prompts/prompt.config";

/**
 * Helper to create a JSONSchemaPrompt from appSummaryConfigMap config.
 * Adds contentDesc, dataBlockHeader, and wrapInCodeBlock which are no longer in the config entries.
 */
function createAppSummaryPrompt(category: keyof typeof appSummaryConfigMap): JSONSchemaPrompt {
  const config = appSummaryConfigMap[category];
  return new JSONSchemaPrompt({
    personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
    ...config,
    contentDesc: APP_SUMMARY_CONTENT_DESC,
    dataBlockHeader: FILE_SUMMARIES_DATA_BLOCK_HEADER,
    wrapInCodeBlock: false,
  } as JSONSchemaPromptConfig);
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

    it("should not have presentation properties in config entries", () => {
      // contentDesc, dataBlockHeader, wrapInCodeBlock are now set at instantiation time
      Object.values(appSummaryConfigMap).forEach((config) => {
        expect("contentDesc" in config).toBe(false);
        expect("dataBlockHeader" in config).toBe(false);
        expect("wrapInCodeBlock" in config).toBe(false);
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
    it("should work correctly with JSONSchemaPrompt class when presentation values added", () => {
      Object.keys(appSummaryConfigMap).forEach((categoryKey) => {
        const prompt = createAppSummaryPrompt(categoryKey as keyof typeof appSummaryConfigMap);
        const config = appSummaryConfigMap[categoryKey as keyof typeof appSummaryConfigMap];

        expect(prompt).toBeDefined();
        expect(prompt.contentDesc).toBe(APP_SUMMARY_CONTENT_DESC);
        expect(prompt.responseSchema).toBe(config.responseSchema);
        expect(prompt.instructions).toEqual(config.instructions);
      });
    });

    it("should have generic contentDesc when presentation values are added at instantiation", () => {
      Object.keys(appSummaryConfigMap).forEach((categoryKey) => {
        const prompt = createAppSummaryPrompt(categoryKey as keyof typeof appSummaryConfigMap);
        const config = appSummaryConfigMap[categoryKey as keyof typeof appSummaryConfigMap];
        expect(prompt.contentDesc).toBe(APP_SUMMARY_CONTENT_DESC);
        expect(prompt.instructions).toEqual(config.instructions);
      });
    });

    it("should render prompts correctly", () => {
      Object.keys(appSummaryConfigMap).forEach((categoryKey) => {
        const prompt = createAppSummaryPrompt(categoryKey as keyof typeof appSummaryConfigMap);
        const rendered = prompt.renderPrompt("test summaries");
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
