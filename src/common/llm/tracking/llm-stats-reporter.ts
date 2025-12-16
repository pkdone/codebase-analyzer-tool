import type LLMStats from "./llm-stats";

/**
 * Class responsible for formatting and displaying LLM statistics.
 * Separated from LLMRouter to adhere to Single Responsibility Principle.
 */
export class LLMStatsReporter {
  constructor(private readonly llmStats: LLMStats) {}

  /**
   * Print the accumulated statistics of LLM invocation result types.
   */
  displayLLMStatusSummary(): void {
    console.log("LLM invocation event types that will be recorded:");
    console.table(this.llmStats.getStatusTypesStatistics(), ["description", "symbol"]);
  }

  /**
   * Print the accumulated statistics of LLM invocation result types.
   */
  displayLLMStatusDetails(): void {
    console.table(this.llmStats.getStatusTypesStatistics(true));
  }
}
