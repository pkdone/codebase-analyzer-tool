import { appSummaryConfigMap } from "../../../src/app/prompts/definitions/app-summaries/app-summaries.definitions";
import { appPromptManager } from "../../../src/app/prompts/app-prompt-registry";
const appSummaryPromptMetadata = appPromptManager.appSummaries;
import type { AppSummaryCategoryType } from "../../../src/app/components/insights/insights.types";

describe("App Summaries Config", () => {
  describe("appSummaryConfigMap", () => {
    it("should contain all required categories", () => {
      // Note: aggregates, entities, and repositories are now nested within boundedContexts
      const requiredCategories: AppSummaryCategoryType[] = [
        "appDescription",
        "technologies",
        "businessProcesses",
        "boundedContexts",
        "potentialMicroservices",
      ];

      requiredCategories.forEach((category) => {
        expect(appSummaryConfigMap[category]).toBeDefined();
        expect(appSummaryConfigMap[category].instructions).toBeTruthy();
        expect(appSummaryConfigMap[category].responseSchema).toBeDefined();
      });
    });

    it("should not contain separate aggregates, entities, or repositories categories", () => {
      // These are now nested within boundedContexts
      // Use type assertion to check for properties that should not exist
      const configAsRecord = appSummaryConfigMap as Record<string, unknown>;
      expect(configAsRecord.aggregates).toBeUndefined();
      expect(configAsRecord.entities).toBeUndefined();
      expect(configAsRecord.repositories).toBeUndefined();
    });

    it("should have non-empty instructions", () => {
      Object.values(appSummaryConfigMap).forEach((config) => {
        expect(config.instructions).toBeTruthy();
        expect(Array.isArray(config.instructions)).toBe(true);
        expect(config.instructions.length).toBeGreaterThan(0);
      });
    });

    it("should have valid zod schemas", () => {
      Object.values(appSummaryConfigMap).forEach((config) => {
        expect(config.responseSchema).toBeDefined();
        expect(config.responseSchema.parse).toBeDefined();
        expect(typeof config.responseSchema.parse).toBe("function");
      });
    });

    it("should have boundedContexts with hierarchical domain model instructions", () => {
      const boundedContextsConfig = appSummaryConfigMap.boundedContexts;
      expect(boundedContextsConfig).toBeDefined();
      // Instructions should mention the hierarchical structure
      const instructionsText = boundedContextsConfig.instructions.join(" ");
      expect(instructionsText.toLowerCase()).toContain("repository");
      expect(instructionsText.toLowerCase()).toContain("aggregate");
    });
  });

  describe("appSummaryPromptMetadata generation", () => {
    it("should generate metadata from config map", () => {
      Object.entries(appSummaryConfigMap).forEach(([key, config]) => {
        const metadata = appSummaryPromptMetadata[key as AppSummaryCategoryType];
        expect(metadata).toBeDefined();
        expect(metadata.contentDesc).toContain("a set of source file summaries"); // Generic contentDesc
        expect(metadata.responseSchema).toBe(config.responseSchema);
      });
    });

    it("should have proper instruction structure", () => {
      Object.entries(appSummaryConfigMap).forEach(([key, config]) => {
        const metadata = appSummaryPromptMetadata[key as AppSummaryCategoryType];
        expect(metadata.instructions).toBeDefined();
        expect(metadata.instructions).toEqual(config.instructions);
      });
    });

    it("should have generic contentDesc and specific instructions", () => {
      Object.entries(appSummaryConfigMap).forEach(([key, config]) => {
        const metadata = appSummaryPromptMetadata[key as AppSummaryCategoryType];
        // introTextTemplate should contain the generic content description
        expect(metadata.contentDesc).toContain("a set of source file summaries");
        // instructions should contain the specific instructions from config
        expect(metadata.instructions).toEqual(config.instructions);
      });
    });
  });
});
