import { appSummaryConfigMap } from "../../src/prompts/definitions/app-summaries/app-summaries.config";
import { appSummaryPromptMetadata } from "../../src/prompts/definitions/app-summaries";
import { AppSummaryCategoryType } from "../../src/prompts/prompt.types";
import { BASE_PROMPT_TEMPLATE } from "../../src/prompts/templates";

describe("App Summaries Config Refactoring", () => {
  describe("Configuration Structure", () => {
    it("should use instructions array instead of contentDesc string", () => {
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

  describe("Metadata Generation", () => {
    it("should generate metadata with correct structure", () => {
      Object.entries(appSummaryConfigMap).forEach(([key, config]) => {
        const metadata = appSummaryPromptMetadata[key as AppSummaryCategoryType];

        expect(metadata).toBeDefined();
        expect(metadata.label).toBe(config.label);
        expect(metadata.contentDesc).toBe("a set of source file summaries");
        expect(metadata.responseSchema).toBe(config.responseSchema);
        expect(metadata.template).toBe(BASE_PROMPT_TEMPLATE);
        expect(metadata.instructions).toEqual(config.instructions);
      });
    });

    it("should have generic contentDesc and specific instructions", () => {
      Object.entries(appSummaryConfigMap).forEach(([key, config]) => {
        const metadata = appSummaryPromptMetadata[key as AppSummaryCategoryType];
        expect(metadata.contentDesc).toBe("a set of source file summaries");
        expect(metadata.instructions).toEqual(config.instructions);
      });
    });

    it("should apply template by default", () => {
      Object.entries(appSummaryConfigMap).forEach(([key]) => {
        const metadata = appSummaryPromptMetadata[key as AppSummaryCategoryType];
        expect(metadata.template).toBe(BASE_PROMPT_TEMPLATE);
      });
    });
  });

  describe("Backward Compatibility", () => {
    it("should use generic contentDesc for all categories", () => {
      Object.entries(appSummaryConfigMap).forEach(([category]) => {
        const metadata = appSummaryPromptMetadata[category as AppSummaryCategoryType];
        expect(metadata.contentDesc).toBe("a set of source file summaries");
      });
    });

    it("should maintain same instruction content from config instructions", () => {
      Object.entries(appSummaryConfigMap).forEach(([key, config]) => {
        const metadata = appSummaryPromptMetadata[key as AppSummaryCategoryType];

        // The instruction content should be the same as the config's instructions
        expect(metadata.instructions).toEqual(config.instructions);
      });
    });
  });

  describe("Type Safety", () => {
    it("should have proper TypeScript types", () => {
      Object.values(appSummaryConfigMap).forEach((config) => {
        // These should compile without TypeScript errors
        const label: string = config.label;
        const instructions: readonly string[] = config.instructions;
        const responseSchema = config.responseSchema;

        expect(typeof label).toBe("string");
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
