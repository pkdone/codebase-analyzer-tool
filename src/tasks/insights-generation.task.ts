import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import type { InsightsGenerator } from "../components/insights/insights-generator.interface";

import type { LLMStatsReporter } from "../llm/core/tracking/llm-stats-reporter";
import { Task } from "../lifecycle/task.types";
import { TOKENS } from "../di/tokens";

/**
 * Task to generate insights.
 */
@injectable()
export class InsightsGenerationTask implements Task {
  /**
   * Constructor with dependency injection.
   */
  constructor(
    @inject(TOKENS.LLMStatsReporter) private readonly llmStatsReporter: LLMStatsReporter,
    @inject(TOKENS.ProjectName) private readonly projectName: string,
    @inject(TOKENS.InsightsGenerator)
    private readonly insightsGenerator: InsightsGenerator,
  ) {}

  /**
   * Execute the task - generates insights.
   */
  async execute(): Promise<void> {
    await this.generateInsights();
  }

  /**
   * Generates insights.
   */
  private async generateInsights(): Promise<void> {
    console.log(`Generating insights for project: ${this.projectName}`);
    this.llmStatsReporter.displayLLMStatusSummary();
    await this.insightsGenerator.generateSummariesBackIntoDB();
    console.log("Finished generating insights for the project");
    console.log("Summary of LLM invocations outcomes:");
    this.llmStatsReporter.displayLLMStatusDetails();
  }
}
