/**
 * Interface for insights generators that process code and generate summaries.
 */
export interface InsightsGenerator {
  /**
   * Generates insights and stores them in the database.
   */
  generateSummariesDataIntoDB(): Promise<void>;
}
