import { appSummaryConfigMap } from "../../src/prompts/definitions/app-summaries/app-summaries.config";
import { appSummaryPromptMetadata } from "../../src/prompts/definitions/app-summaries";
import { AppSummaryCategoryType } from "../../src/prompts/prompt.types";

describe("App Summaries Config", () => {
  describe("appSummaryConfigMap", () => {
    it("should contain all required categories", () => {
      const requiredCategories: AppSummaryCategoryType[] = [
        "appDescription",
        "technologies",
        "businessProcesses",
        "boundedContexts",
        "aggregates",
        "entities",
        "repositories",
        "potentialMicroservices",
        "billOfMaterials",
        "codeQualitySummary",
        "scheduledJobsSummary",
        "moduleCoupling",
        "uiTechnologyAnalysis",
      ];

      requiredCategories.forEach((category) => {
        expect(appSummaryConfigMap[category]).toBeDefined();
        expect(appSummaryConfigMap[category].label).toBeTruthy();
        expect(appSummaryConfigMap[category].instruction).toBeTruthy();
        expect(appSummaryConfigMap[category].responseSchema).toBeDefined();
      });
    });

    it("should have non-empty labels and instructions", () => {
      Object.values(appSummaryConfigMap).forEach((config) => {
        expect(config.label).toBeTruthy();
        expect(config.instruction).toBeTruthy();
        expect(typeof config.label).toBe("string");
        expect(typeof config.instruction).toBe("string");
        expect(config.label.length).toBeGreaterThan(0);
        expect(config.instruction.length).toBeGreaterThan(0);
      });
    });

    it("should have valid zod schemas", () => {
      Object.values(appSummaryConfigMap).forEach((config) => {
        expect(config.responseSchema).toBeDefined();
        expect(config.responseSchema.parse).toBeDefined();
        expect(typeof config.responseSchema.parse).toBe("function");
      });
    });

    it("should have unique labels for each category", () => {
      const labels = Object.values(appSummaryConfigMap).map((config) => config.label);
      const uniqueLabels = new Set(labels);
      expect(uniqueLabels.size).toBe(labels.length);
    });
  });

  describe("appSummaryPromptMetadata generation", () => {
    it("should generate metadata from config map", () => {
      Object.entries(appSummaryConfigMap).forEach(([key, config]) => {
        const metadata = appSummaryPromptMetadata[key as AppSummaryCategoryType];
        expect(metadata).toBeDefined();
        expect(metadata.label).toBe(config.label);
        expect(metadata.contentDesc).toBe(config.instruction);
        expect(metadata.responseSchema).toBe(config.responseSchema);
      });
    });

    it("should have proper instruction structure", () => {
      Object.entries(appSummaryConfigMap).forEach(([key, config]) => {
        const metadata = appSummaryPromptMetadata[key as AppSummaryCategoryType];
        expect(metadata.instructions).toBeDefined();
        expect(metadata.instructions).toHaveLength(1);
        expect(metadata.instructions[0].points).toBeDefined();
        expect(metadata.instructions[0].points).toHaveLength(1);
        expect(metadata.instructions[0].points[0]).toBe(config.instruction);
      });
    });

    it("should maintain contentDesc and instruction consistency", () => {
      Object.entries(appSummaryConfigMap).forEach(([key]) => {
        const metadata = appSummaryPromptMetadata[key as AppSummaryCategoryType];
        // contentDesc should match the first instruction point
        expect(metadata.contentDesc).toBe(metadata.instructions[0].points[0]);
      });
    });
  });
});
