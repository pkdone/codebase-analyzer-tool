import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import type { InsightsGenerator } from "../components/insights/insights-generator.interface";
import type LLMRouter from "../llm/core/llm-router";
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
    @inject(TOKENS.LLMRouter) private readonly llmRouter: LLMRouter,
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
    this.llmRouter.displayLLMStatusSummary();
    await this.insightsGenerator.generateSummariesDataIntoDB();
    console.log("Finished generating insights for the project");
    console.log("Summary of LLM invocations outcomes:");
    this.llmRouter.displayLLMStatusDetails();
  }
}
