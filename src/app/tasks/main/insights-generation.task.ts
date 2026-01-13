import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import type InsightsFromDBGenerator from "../../components/insights/generators/db-insights-generator";
import type LLMExecutionStats from "../../../common/llm/tracking/llm-execution-stats";
import { llmTokens, coreTokens, insightsTokens } from "../../di/tokens";
import { BaseAnalysisTask } from "../base-analysis-task";

/**
 * Task to generate insights.
 * Extends BaseAnalysisTask to share the common lifecycle pattern with LLM stats tracking.
 */
@injectable()
export class InsightsGenerationTask extends BaseAnalysisTask {
  /**
   * Constructor with dependency injection.
   */
  constructor(
    @inject(llmTokens.LLMExecutionStats) llmStats: LLMExecutionStats,
    @inject(coreTokens.ProjectName) projectName: string,
    @inject(insightsTokens.InsightsFromDBGenerator)
    private readonly insightsGenerator: InsightsFromDBGenerator,
  ) {
    super(llmStats, projectName);
  }

  protected getStartMessage(): string {
    return "Generating insights for project";
  }

  protected getFinishMessage(): string {
    return "Finished generating insights for the project";
  }

  protected async runTask(): Promise<void> {
    await this.insightsGenerator.generateAndStoreInsights();
  }
}
