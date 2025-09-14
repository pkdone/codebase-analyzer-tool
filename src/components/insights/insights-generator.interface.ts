/**
 * Interface for application insights processors that analyze code and generate architectural insights.
 */
export interface ApplicationInsightsProcessor {
  /**
   * Generates insights and stores them in the database.
   */
  generateAndStoreInsights(): Promise<void>;
}
