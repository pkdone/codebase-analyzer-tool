import pLimit from "p-limit";
import { injectable, inject } from "tsyringe";
import { configTokens } from "../../di/tokens";
import type { ConcurrencyConfigType } from "../../config/concurrency.config";

/**
 * Type for the p-limit limiter function.
 */
type LimitFunction = ReturnType<typeof pLimit>;

/**
 * Service that manages concurrency limiting for LLM operations.
 * Provides a shared concurrency pool to ensure all LLM calls (across categories and map chunks)
 * share the same pool, preventing rate limit issues from nested parallelism.
 *
 * This service is used by:
 * - CodebaseToDBLoader: File capture and summarization
 * - InsightsFromDBGenerator: Category-level insight processing
 * - MapReduceInsightStrategy: Chunk-level MAP phase processing
 * - PromptFileInsightsGenerator: Prompt-based insight generation
 */
@injectable()
export class LlmConcurrencyService {
  private readonly limiter: LimitFunction;

  /**
   * Creates a new LLM concurrency service with the configured concurrency limit.
   * @param concurrencyConfig - Configuration containing the max LLM concurrency setting
   */
  constructor(
    @inject(configTokens.ConcurrencyConfig)
    concurrencyConfig: ConcurrencyConfigType,
  ) {
    this.limiter = pLimit(concurrencyConfig.MAX_LLM_CONCURRENCY);
  }

  /**
   * Returns the current number of pending operations.
   * Useful for testing and debugging.
   */
  get pendingCount(): number {
    return this.limiter.pendingCount;
  }

  /**
   * Returns the current number of active (running) operations.
   * Useful for testing and debugging.
   */
  get activeCount(): number {
    return this.limiter.activeCount;
  }

  /**
   * Executes a function with concurrency limiting.
   * Only the configured number of concurrent executions will be allowed at any time.
   *
   * @param fn - The async function to execute with concurrency limiting
   * @returns A promise that resolves with the function's return value
   */
  async run<T>(fn: () => Promise<T>): Promise<T> {
    return this.limiter(fn);
  }

  /**
   * Clears any pending operations from the queue.
   * Useful for cleanup in tests.
   */
  clearQueue(): void {
    this.limiter.clearQueue();
  }
}
