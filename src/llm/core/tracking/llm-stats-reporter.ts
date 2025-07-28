import { injectable, inject } from "tsyringe";
import { TOKENS } from "../../../di/tokens";
import type LLMStats from "./llm-stats";

/**
 * Class responsible for formatting and displaying LLM statistics.
 * Separated from LLMRouter to adhere to Single Responsibility Principle.
 */
@injectable()
export class LLMStatsReporter {
  constructor(
    @inject(TOKENS.LLMStats) private readonly llmStats: LLMStats,
  ) {}

  /**
   * Print the accumulated statistics of LLM invocation result types.
   */
  displayLLMStatusSummary(): void {
    console.log("LLM inovocation event types that will be recorded:");
    console.table(this.llmStats.getStatusTypesStatistics(), ["description", "symbol"]);
  }

  /**
   * Print the accumulated statistics of LLM invocation result types.
   */
  displayLLMStatusDetails(): void {
    console.table(this.llmStats.getStatusTypesStatistics(true));
  }
} 