import { TOKENS } from "../../src/tokens";
import { coreTokens } from "../../src/di/core.tokens";
import { repositoryTokens } from "../../src/di/repositories.tokens";
import { taskTokens } from "../../src/di/tasks.tokens";
import { reportingTokens } from "../../src/components/reporting/reporting.tokens";

describe("Dependency Injection token modularization", () => {
  it("each grouped token key exists in TOKENS", () => {
    const groups = [coreTokens, repositoryTokens, taskTokens, reportingTokens];
    for (const group of groups) {
      for (const key of Object.keys(group)) {
        expect((TOKENS as Record<string, symbol>)[key]).toBeDefined();
      }
    }
  });

  it("TOKENS includes all grouped keys", () => {
    const groupedKeys = new Set<string>([
      ...Object.keys(coreTokens),
      ...Object.keys(repositoryTokens),
      ...Object.keys(taskTokens),
      ...Object.keys(reportingTokens),
    ]);
    for (const key of groupedKeys) {
      expect((TOKENS as Record<string, symbol>)[key]).toBeDefined();
    }
  });

  it("insights-related tokens exist in TOKENS", () => {
    const insightsTokenKeys = [
      "InsightsFromDBGenerator",
      "InsightsFromRawCodeGenerator",
      "InsightsProcessorSelector",
      "LocalInsightsGenerator",
      "BomAggregator",
      "CodeQualityAggregator",
      "JobAggregator",
      "ModuleCouplingAggregator",
      "UiAggregator",
      "LLMStats",
      "LLMStatsReporter",
      "LLMInfoProvider",
      "PromptAdaptationStrategy",
      "RetryStrategy",
      "FallbackStrategy",
      "LLMExecutionPipeline",
      "JsonProcessor",
      "FileSummarizer",
    ];

    for (const key of insightsTokenKeys) {
      expect((TOKENS as Record<string, symbol>)[key]).toBeDefined();
    }
  });

  it("all token values are symbols with non-empty description", () => {
    for (const sym of Object.values(TOKENS)) {
      expect(typeof sym).toBe("symbol");
      expect(sym.description?.length).toBeGreaterThan(0);
    }
  });
});
