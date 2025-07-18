import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import DBCodeInsightsBackIntoDBGenerator from "../components/insights/db-code-insights-back-into-db-generator";
import type LLMRouter from "../llm/core/llm-router";
import { Service } from "../lifecycle/service.types";
import { TOKENS } from "../di/tokens";

/**
 * Service to generate insights.
 */
@injectable()
export class InsightsFromDBGenerationService implements Service {
  /**
   * Constructor with dependency injection.
   */
  constructor(
    @inject(TOKENS.LLMRouter) private readonly llmRouter: LLMRouter,
    @inject(TOKENS.ProjectName) private readonly projectName: string,
    @inject(TOKENS.DBCodeInsightsBackIntoDBGenerator)
    private readonly summariesGenerator: DBCodeInsightsBackIntoDBGenerator,
  ) {}

  /**
   * Execute the service - generates insights.
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
    await this.summariesGenerator.generateSummariesDataInDB();
    console.log("Finished generating insights for the project");
    console.log("Summary of LLM invocations outcomes:");
    this.llmRouter.displayLLMStatusDetails();
  }
}
