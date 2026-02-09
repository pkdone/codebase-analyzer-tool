import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import type InsightsGenerator from "../../components/insights/generators/insights-generator";
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
    @inject(insightsTokens.InsightsGenerator)
    private readonly insightsGenerator: InsightsGenerator,
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
