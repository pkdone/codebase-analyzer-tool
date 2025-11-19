/**
 * Insights module tokens for dependency injection.
 * These tokens are used to identify and inject insights-related dependencies.
 */
export const insightsTokens = {
  InsightsFromDBGenerator: Symbol("InsightsFromDBGenerator"),
  InsightsFromRawCodeGenerator: Symbol("InsightsFromRawCodeGenerator"),
  PromptFileInsightsGenerator: Symbol("PromptFileInsightsGenerator"),
  InsightsProcessorSelector: Symbol("InsightsProcessorSelector"),
  BomAggregator: Symbol.for("BomAggregator"),
  CodeQualityAggregator: Symbol.for("CodeQualityAggregator"),
  JobAggregator: Symbol.for("JobAggregator"),
  ModuleCouplingAggregator: Symbol.for("ModuleCouplingAggregator"),
  UiAggregator: Symbol.for("UiAggregator"),
} as const;

export type InsightsToken = keyof typeof insightsTokens;
