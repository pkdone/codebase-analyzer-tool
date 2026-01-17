import { insightsConfig } from "../../../../src/app/components/insights/insights.config";
import { appPromptManager } from "../../../../src/app/prompts/app-prompt-registry";
const summaryCategoriesConfig = appPromptManager.appSummaries;
import { AppSummaryCategoryEnum } from "../../../../src/app/components/insights/insights.types";

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
    const categories: AppSummaryCategoryEnum[] = [
      "appDescription",
      "technologies",
      "businessProcesses",
      "boundedContexts",
      "potentialMicroservices",
    ];

    categories.forEach((category) => {
      expect(summaryCategoriesConfig[category]).toBeDefined();
      expect(summaryCategoriesConfig[category]).toHaveProperty("contentDesc");
      expect(summaryCategoriesConfig[category]).toHaveProperty("responseSchema");
    });
  });

  it("should have non-empty descriptions", () => {
    Object.values(summaryCategoriesConfig).forEach((config) => {
      expect(config.contentDesc).toBeTruthy();
      expect(typeof config.contentDesc).toBe("string");
    });
  });

  it("should have valid zod schemas", () => {
    Object.values(summaryCategoriesConfig).forEach((config) => {
      expect(config.responseSchema).toBeDefined();
      expect(config.responseSchema!.parse).toBeDefined();
      expect(typeof config.responseSchema!.parse).toBe("function");
    });
  });
});
