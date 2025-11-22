import type { AppSummaryCategoryEnum } from "../insights.types";

/**
 * Interface for data aggregators that process and aggregate data from the database
 * for specific app summary categories.
 */
export interface IAggregator {
  /**
   * Get the category this aggregator handles
   */
  getCategory(): AppSummaryCategoryEnum;

  /**
   * Aggregate data for the given project and return the aggregated result
   * @param projectName The name of the project to aggregate data for
   * @returns Promise resolving to the aggregated data for this category
   */
  aggregate(projectName: string): Promise<unknown>;
}
