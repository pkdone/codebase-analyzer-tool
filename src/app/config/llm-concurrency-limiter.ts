import pLimit from "p-limit";
import { concurrencyConfig } from "./concurrency.config";

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
