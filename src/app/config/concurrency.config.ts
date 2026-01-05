import pLimit from "p-limit";

/**
 * Concurrency configuration for LLM and processing operations.
 * Controls parallel execution limits to balance throughput with API rate limits.
 */
export const concurrencyConfig = {
  /**
   * Maximum concurrent LLM API calls.
   * Used by capture (file summarization) and insights (map-reduce) operations.
   * Tune based on your LLM provider's rate limits and throttling behavior.
   */
  MAX_LLM_CONCURRENCY: 50,
} as const;

/**
 * Shared concurrency limiter for LLM operations.
 * Single instance ensures all LLM calls (across categories and map chunks)
 * share the same pool, preventing rate limit issues from nested parallelism.
 *
 * This limiter is used by:
 * - CodebaseToDBLoader: File capture and summarization
 * - InsightsFromDBGenerator: Category-level insight processing
 * - MapReduceInsightStrategy: Chunk-level MAP phase processing
 * - PromptFileInsightsGenerator: Prompt-based insight generation
 */
export const llmConcurrencyLimiter = pLimit(concurrencyConfig.MAX_LLM_CONCURRENCY);
