import { insightsConfig } from "../../../../src/app/components/insights/insights.config";
import { appSummaryConfigMap } from "../../../../src/app/prompts/app-summaries/app-summaries.definitions";
import { AppSummaryCategoryType } from "../../../../src/app/components/insights/insights.types";

describe("insightsTuningConfig", () => {
  it("should have CHUNK_TOKEN_LIMIT_RATIO defined", () => {
    expect(insightsConfig.CHUNK_TOKEN_LIMIT_RATIO).toBeDefined();
    expect(insightsConfig.CHUNK_TOKEN_LIMIT_RATIO).toBe(0.7);
  });

  it("should have CHUNK_TOKEN_LIMIT_RATIO as a number between 0 and 1", () => {
    expect(typeof insightsConfig.CHUNK_TOKEN_LIMIT_RATIO).toBe("number");
    expect(insightsConfig.CHUNK_TOKEN_LIMIT_RATIO).toBeGreaterThan(0);
    expect(insightsConfig.CHUNK_TOKEN_LIMIT_RATIO).toBeLessThan(1);
  });

  it("should be a readonly object", () => {
    const config = insightsConfig;
    expect(config).toHaveProperty("CHUNK_TOKEN_LIMIT_RATIO");
  });

  it("should be typed as const", () => {
    // This test verifies that TypeScript treats the config as readonly
    // The 'as const' assertion should make all properties readonly
    const ratio: 0.7 = insightsConfig.CHUNK_TOKEN_LIMIT_RATIO;
    expect(ratio).toBe(0.7);
  });
});

describe("summaryCategoriesConfig", () => {
  it("should have all required category configurations", () => {
    // Note: aggregates, entities, and repositories are now nested within boundedContexts
    // Note: contentDesc, dataBlockHeader, wrapInCodeBlock are no longer in config entries
    // They are set at instantiation time by the consumer (InsightCompletionExecutor)
    const categories: AppSummaryCategoryType[] = [
      "appDescription",
      "technologies",
      "businessProcesses",
      "boundedContexts",
      "potentialMicroservices",
    ];

    categories.forEach((category) => {
      expect(appSummaryConfigMap[category]).toBeDefined();
      expect(appSummaryConfigMap[category]).toHaveProperty("instructions");
      expect(appSummaryConfigMap[category]).toHaveProperty("responseSchema");
    });
  });

  it("should have non-empty instructions", () => {
    Object.values(appSummaryConfigMap).forEach((config) => {
      expect(config.instructions).toBeDefined();
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

  it("should have hasComplexSchema defined for all categories", () => {
    Object.values(appSummaryConfigMap).forEach((config) => {
      expect(config).toHaveProperty("hasComplexSchema");
      expect(typeof config.hasComplexSchema).toBe("boolean");
    });
  });

  it("should have hasComplexSchema set to false for all categories (simple schemas)", () => {
    Object.values(appSummaryConfigMap).forEach((config) => {
      expect(config.hasComplexSchema).toBe(false);
    });
  });
});
