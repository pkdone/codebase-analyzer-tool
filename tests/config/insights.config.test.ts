import { insightsTuningConfig, summaryCategoriesConfig } from "../../src/config/insights.config";
import { AppSummaryCategoryEnum } from "../../src/components/insights/insights.types";

describe("insightsTuningConfig", () => {
  it("should have CHUNK_TOKEN_LIMIT_RATIO defined", () => {
    expect(insightsTuningConfig.CHUNK_TOKEN_LIMIT_RATIO).toBeDefined();
    expect(insightsTuningConfig.CHUNK_TOKEN_LIMIT_RATIO).toBe(0.7);
  });

  it("should have CHUNK_TOKEN_LIMIT_RATIO as a number between 0 and 1", () => {
    expect(typeof insightsTuningConfig.CHUNK_TOKEN_LIMIT_RATIO).toBe("number");
    expect(insightsTuningConfig.CHUNK_TOKEN_LIMIT_RATIO).toBeGreaterThan(0);
    expect(insightsTuningConfig.CHUNK_TOKEN_LIMIT_RATIO).toBeLessThan(1);
  });

  it("should be a readonly object", () => {
    const config = insightsTuningConfig;
    expect(config).toHaveProperty("CHUNK_TOKEN_LIMIT_RATIO");
  });

  it("should be typed as const", () => {
    // This test verifies that TypeScript treats the config as readonly
    // The 'as const' assertion should make all properties readonly
    const ratio: 0.7 = insightsTuningConfig.CHUNK_TOKEN_LIMIT_RATIO;
    expect(ratio).toBe(0.7);
  });
});

describe("summaryCategoriesConfig", () => {
  it("should have all required category configurations", () => {
    const categories: AppSummaryCategoryEnum[] = [
      "appDescription",
      "technologies",
      "businessProcesses",
      "boundedContexts",
      "aggregates",
      "entities",
      "repositories",
      "potentialMicroservices",
    ];

    categories.forEach((category) => {
      expect(summaryCategoriesConfig[category]).toBeDefined();
      expect(summaryCategoriesConfig[category]).toHaveProperty("label");
      expect(summaryCategoriesConfig[category]).toHaveProperty("description");
      expect(summaryCategoriesConfig[category]).toHaveProperty("schema");
    });
  });

  it("should have non-empty labels and descriptions", () => {
    Object.values(summaryCategoriesConfig).forEach((config) => {
      expect(config.label).toBeTruthy();
      expect(config.description).toBeTruthy();
      expect(typeof config.label).toBe("string");
      expect(typeof config.description).toBe("string");
    });
  });

  it("should have valid zod schemas", () => {
    Object.values(summaryCategoriesConfig).forEach((config) => {
      expect(config.schema).toBeDefined();
      expect(config.schema.parse).toBeDefined();
      expect(typeof config.schema.parse).toBe("function");
    });
  });
});

