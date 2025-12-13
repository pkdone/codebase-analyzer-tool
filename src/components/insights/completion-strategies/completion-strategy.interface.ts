import { AppSummaryCategoryEnum, PartialAppSummaryRecord } from "../insights.types";

/**
 * Strategy interface for generating insights from source file summaries.
 * Different implementations can handle small codebases (single-pass) vs large codebases (map-reduce).
 */
export interface ICompletionStrategy {
  /**
   * Generate insights for a specific category using source file summaries.
   * The return type is PartialAppSummaryRecord, which is compatible with all category response schemas
   * since they are all partial subsets of the appSummarySchema.
   *
   * @param category - The category of insights to generate
   * @param sourceFileSummaries - Array of formatted source file summaries
   * @returns The generated insights for the category as PartialAppSummaryRecord, or null if generation fails
   */
  generateInsights(
    category: AppSummaryCategoryEnum,
    sourceFileSummaries: string[],
  ): Promise<PartialAppSummaryRecord | null>;
}
