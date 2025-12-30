import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import type { InsightsProcessorSelector } from "../../components/insights/generators/insights-processor-selector";
import type LLMStats from "../../../common/llm/tracking/llm-stats";
import { llmTokens, coreTokens, insightsTokens } from "../../di/tokens";
import { BaseAnalysisTask } from "../base-analysis-task";

/**
 * Task to generate insights.
 * Extends BaseAnalysisTask to share the common lifecycle pattern.
 */
@injectable()
export class InsightsGenerationTask extends BaseAnalysisTask {
  /**
   * Constructor with dependency injection.
   */
  constructor(
    @inject(llmTokens.LLMStats) llmStats: LLMStats,
    @inject(coreTokens.ProjectName) projectName: string,
    @inject(insightsTokens.InsightsProcessorSelector)
    private readonly insightsProcessorSelector: InsightsProcessorSelector,
  ) {
    super(llmStats, projectName);
  }

  protected getStartMessage(): string {
    return "Generating insights for project";
  }

  protected getFinishMessage(): string {
    return "Finished generating insights for the project";
  }

  protected async runAnalysis(): Promise<void> {
    const selectedProcessor = await this.insightsProcessorSelector.selectInsightsProcessor();
    await selectedProcessor.generateAndStoreInsights();
  }
}
