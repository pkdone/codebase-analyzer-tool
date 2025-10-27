/**
 * LLM module tokens for dependency injection.
 * These tokens are used to identify and inject LLM-related dependencies.
 */
export const llmTokens = {
  JsonProcessor: Symbol("JsonProcessor"),
  LLMStats: Symbol("LLMStats"),
  LLMStatsReporter: Symbol("LLMStatsReporter"),
  PromptAdaptationStrategy: Symbol("PromptAdaptationStrategy"),
  LLMInfoProvider: Symbol("LLMInfoProvider"),
  RetryStrategy: Symbol("RetryStrategy"),
  FallbackStrategy: Symbol("FallbackStrategy"),
  LLMExecutionPipeline: Symbol("LLMExecutionPipeline"),
  LLMRouter: Symbol("LLMRouter"),
  LLMProviderManager: Symbol("LLMProviderManager"),
  LLMModelFamily: Symbol("LLMModelFamily"),
} as const;

export type LLMToken = keyof typeof llmTokens;
