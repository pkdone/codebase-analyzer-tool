import { AppSummaryCategoryType, CategoryInsightResult } from "../insights.types";

/**
 * Strategy interface for generating insights from source file summaries.
 * Different implementations can handle small codebases (single-pass) vs large codebases (map-reduce).
 *
 * The interface uses a generic method to preserve strong typing through the call chain.
 * Each category returns its specific type (e.g., `{ entities: [...] }` for "entities" category),
 * which is inferred from the `appSummaryCategorySchemas` mapping.
 */
export interface InsightGenerationStrategy {
  /**
   * Generate insights for a specific category using source file summaries.
   * The return type is inferred from the category parameter using the strongly-typed
   * `appSummaryCategorySchemas` mapping, preserving type safety through the call chain.
   *
   * @template C - The specific category type (inferred from the category parameter)
   * @param category - The category of insights to generate
   * @param sourceFileSummaries - Array of formatted source file summaries
   * @returns The generated insights with category-specific typing, or null if generation fails
   */
  generateInsights<C extends AppSummaryCategoryType>(
    category: C,
    sourceFileSummaries: readonly string[],
  ): Promise<CategoryInsightResult<C> | null>;
}
