/**
 * Insights generation & aggregation tokens.
 */
import { TOKENS } from "../../tokens";

export const insightsTokens = {
  InsightsFromDBGenerator: TOKENS.InsightsFromDBGenerator,
  InsightsFromRawCodeGenerator: TOKENS.InsightsFromRawCodeGenerator,
  InsightsProcessorSelector: TOKENS.InsightsProcessorSelector,
  LocalInsightsGenerator: TOKENS.LocalInsightsGenerator,
  BomAggregator: TOKENS.BomAggregator,
  CodeQualityAggregator: TOKENS.CodeQualityAggregator,
  JobAggregator: TOKENS.JobAggregator,
  ModuleCouplingAggregator: TOKENS.ModuleCouplingAggregator,
  UiAggregator: TOKENS.UiAggregator,
  LLMStats: TOKENS.LLMStats,
  LLMStatsReporter: TOKENS.LLMStatsReporter,
  LLMInfoProvider: TOKENS.LLMInfoProvider,
  PromptAdaptationStrategy: TOKENS.PromptAdaptationStrategy,
  RetryStrategy: TOKENS.RetryStrategy,
  FallbackStrategy: TOKENS.FallbackStrategy,
  LLMExecutionPipeline: TOKENS.LLMExecutionPipeline,
  JsonProcessor: TOKENS.JsonProcessor,
  FileSummarizer: TOKENS.FileSummarizer,
} as const;

export type InsightsToken = keyof typeof insightsTokens;
