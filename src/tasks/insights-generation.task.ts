import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import type { ApplicationInsightsProcessor } from "../components/insights/insights-generator.interface";
import type { LLMStatsReporter } from "../llm/core/tracking/llm-stats-reporter";
import { BaseLLMTask } from "./base-llm.task";
import { TOKENS } from "../di/tokens";

/**
 * Task to generate insights.
 */
@injectable()
export class InsightsGenerationTask extends BaseLLMTask {
  /**
   * Constructor with dependency injection.
   */
  constructor(
    @inject(TOKENS.LLMStatsReporter) llmStatsReporter: LLMStatsReporter,
    @inject(TOKENS.ProjectName) projectName: string,
    @inject(TOKENS.ApplicationInsightsProcessor)
    private readonly applicationInsightsProcessor: ApplicationInsightsProcessor,
  ) {
    super(llmStatsReporter, projectName);
  }

  /**
   * Get the task name for logging.
   */
  protected getTaskActivityDescription(): string {
    return "Generating insights";
  }

  /**
   * Execute the core task logic.
   */
  protected async run(): Promise<void> {
    await this.applicationInsightsProcessor.generateAndStoreInsights();
  }
}
