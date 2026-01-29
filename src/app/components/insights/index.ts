/**
 * Barrel export for insights module.
 *
 * This module provides generators and strategies for extracting architectural insights
 * from codebase summaries using LLM analysis.
 */

// Types
export type {
  PartialAppSummaryRecord,
  AppSummaryCategoryType,
  AppSummaryCategoryEnum,
  CategoryInsightResult,
} from "./insights.types";
export { appSummaryCategorySchemas, type AppSummaryCategorySchemas } from "./insights.types";

// Generators - these are injectable services
export { default as InsightsFromDBGenerator } from "./generators/db-insights-generator";
export { PromptFileInsightsGenerator } from "./generators/prompt-file-insights-generator";

// Strategies
export type { IInsightGenerationStrategy } from "./strategies/insight-generation-strategy.interface";
export {
  executeInsightCompletion,
  type InsightCompletionOptions,
} from "./strategies/insights-completion-executor";
export { MapReduceInsightStrategy } from "./strategies/map-reduce-insight-strategy";
export { SinglePassInsightStrategy } from "./strategies/single-pass-insight-strategy";
