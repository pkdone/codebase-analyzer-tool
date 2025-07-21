import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import InsightsFromDBGenerator from "../components/insights/insights-from-db-generator";
import type LLMRouter from "../llm/core/llm-router";
import { Task } from "../lifecycle/task.types";
import { TOKENS } from "../di/tokens";

/**
 * Task to generate insights.
 */
@injectable()
export class InsightsFromDBGenerationTask implements Task {
  /**
   * Constructor with dependency injection.
   */
  constructor(
    @inject(TOKENS.LLMRouter) private readonly llmRouter: LLMRouter,
    @inject(TOKENS.ProjectName) private readonly projectName: string,
    @inject(TOKENS.InsightsFromDBGenerator)
    private readonly insightsFromDBGenerator: InsightsFromDBGenerator,
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
    this.llmRouter.displayLLMStatusSummary();
    await this.insightsFromDBGenerator.generateSummariesDataIntoDB();
    console.log("Finished generating insights for the project");
    console.log("Summary of LLM invocations outcomes:");
    this.llmRouter.displayLLMStatusDetails();
  }
}
