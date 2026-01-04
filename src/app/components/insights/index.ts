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
export {
  appSummaryRecordCategoriesSchema,
  appSummaryCategorySchemas,
  type AppSummaryCategorySchemas,
} from "./insights.types";

// Generator interface
export type { IInsightsProcessor } from "./generators/insights-processor.interface";

// Generators - these are injectable services
export { default as InsightsFromDBGenerator } from "./generators/db-insights-generator";
export { PromptFileInsightsGenerator } from "./generators/prompt-file-insights-generator";
export { default as InsightsFromRawCodeGenerator } from "./generators/raw-code-insights-generator";
export { InsightsProcessorSelector } from "./generators/insights-processor-selector";

// Strategies
export type { IInsightGenerationStrategy } from "./strategies/completion-strategy.interface";
export {
  executeInsightCompletion,
  type InsightCompletionOptions,
} from "./strategies/completion-executor";
export { MapReduceInsightStrategy } from "./strategies/map-reduce-completion-strategy";
export { SinglePassInsightStrategy } from "./strategies/single-pass-completion-strategy";
