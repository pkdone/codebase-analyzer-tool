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
 * Type for the concurrency configuration object.
 * Used for dependency injection typing.
 * Uses Readonly<{...}> to allow flexibility in tests while maintaining type safety.
 */
export interface ConcurrencyConfigType {
  readonly MAX_LLM_CONCURRENCY: number;
}
