import { AppSummaryCategoryEnum, PartialAppSummaryRecord } from "../insights.types";

/**
 * Strategy interface for generating insights from source file summaries.
 * Different implementations can handle small codebases (single-pass) vs large codebases (map-reduce).
 */
export interface ICompletionStrategy {
  /**
   * Generate insights for a specific category using source file summaries.
   *
   * @param category - The category of insights to generate
   * @param sourceFileSummaries - Array of formatted source file summaries
   * @returns The generated insights for the category, or null if generation fails
   */
  generateInsights(
    category: AppSummaryCategoryEnum,
    sourceFileSummaries: string[],
  ): Promise<PartialAppSummaryRecord | null>;
}
