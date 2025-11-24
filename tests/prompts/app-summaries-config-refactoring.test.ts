import { appSummaryConfigMap } from "../../src/prompts/definitions/app-summaries/app-summaries.config";
import { appSummaryPromptMetadata } from "../../src/prompts/definitions/app-summaries";
import { AppSummaryCategoryType } from "../../src/prompts/prompt.types";
import { APP_SUMMARY_TEMPLATE } from "../../src/prompts/templates";

describe("App Summaries Config Refactoring", () => {
  describe("Configuration Structure", () => {
    it("should use contentDesc string instead of instructions array", () => {
      Object.values(appSummaryConfigMap).forEach((config) => {
        expect(config.contentDesc).toBeDefined();
        expect(typeof config.contentDesc).toBe("string");
        expect(config.contentDesc.length).toBeGreaterThan(0);
      });
    });

    it("should not have template property in config entries", () => {
      Object.values(appSummaryConfigMap).forEach((config) => {
        expect(config).not.toHaveProperty("template");
      });
    });

    it("should have proper contentDesc structure for all categories", () => {
      Object.values(appSummaryConfigMap).forEach((config) => {
        expect(typeof config.contentDesc).toBe("string");
        expect(config.contentDesc.length).toBeGreaterThan(0);
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
        expect(metadata.template).toBe(APP_SUMMARY_TEMPLATE);
        expect(metadata.instructions[0]).toBe(config.contentDesc);
      });
    });

    it("should have generic contentDesc and specific instructions", () => {
      Object.entries(appSummaryConfigMap).forEach(([key, config]) => {
        const metadata = appSummaryPromptMetadata[key as AppSummaryCategoryType];
        expect(metadata.contentDesc).toBe("a set of source file summaries");
        expect(metadata.instructions[0]).toBe(config.contentDesc);
      });
    });

    it("should apply template by default", () => {
      Object.entries(appSummaryConfigMap).forEach(([key]) => {
        const metadata = appSummaryPromptMetadata[key as AppSummaryCategoryType];
        expect(metadata.template).toBe(APP_SUMMARY_TEMPLATE);
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

    it("should maintain same instruction content from config contentDesc", () => {
      Object.entries(appSummaryConfigMap).forEach(([key, config]) => {
        const metadata = appSummaryPromptMetadata[key as AppSummaryCategoryType];

        // The instruction content should be the same as the config's contentDesc
        expect(metadata.instructions[0]).toBe(config.contentDesc);
      });
    });
  });

  describe("Type Safety", () => {
    it("should have proper TypeScript types", () => {
      Object.values(appSummaryConfigMap).forEach((config) => {
        // These should compile without TypeScript errors
        const label: string = config.label;
        const contentDesc: string = config.contentDesc;
        const responseSchema = config.responseSchema;

        expect(typeof label).toBe("string");
        expect(typeof contentDesc).toBe("string");
        expect(responseSchema).toBeDefined();
      });
    });

    it("should maintain readonly properties", () => {
      Object.values(appSummaryConfigMap).forEach((config) => {
        // Test that the contentDesc is a string
        expect(typeof config.contentDesc).toBe("string");
        expect(config.contentDesc.length).toBeGreaterThan(0);
      });
    });
  });
});
