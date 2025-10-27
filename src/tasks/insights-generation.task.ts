import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import type { InsightsProcessorSelector } from "../components/insights/insights-processor-selector";
import type { LLMStatsReporter } from "../llm/core/tracking/llm-stats-reporter";
import { BaseLLMTask } from "./base-llm.task";
import { llmTokens } from "../llm/core/llm.tokens";
import { coreTokens } from "../di/core.tokens";
import { insightsTokens } from "../components/insights/insights.tokens";
import { outputConfig } from "../config/output.config";
import { clearDirectory } from "../common/fs/directory-operations";

/**
 * Task to generate insights.
 */
@injectable()
export class InsightsGenerationTask extends BaseLLMTask {
  /**
   * Constructor with dependency injection.
   */
  constructor(
    @inject(llmTokens.LLMStatsReporter) llmStatsReporter: LLMStatsReporter,
    @inject(coreTokens.ProjectName) projectName: string,
    @inject(insightsTokens.InsightsProcessorSelector)
    private readonly insightsProcessorSelector: InsightsProcessorSelector,
  ) {
    super(llmStatsReporter, projectName);
  }

  /**
   * Get the task name for logging.
   */
  protected getActivityDescription(): string {
    return "Generating insights";
  }

  /**
   * Execute the core task logic.
   */
  protected async run(): Promise<void> {
    await clearDirectory(outputConfig.OUTPUT_DIR);
    const selectedProcessor = await this.insightsProcessorSelector.selectInsightsProcessor();
    await selectedProcessor.generateAndStoreInsights();
  }
}
