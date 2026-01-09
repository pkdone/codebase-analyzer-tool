import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import type InsightsFromDBGenerator from "../../components/insights/generators/db-insights-generator";
import type LLMTelemetryTracker from "../../../common/llm/tracking/llm-telemetry-tracker";
import { llmTokens, coreTokens, insightsTokens } from "../../di/tokens";
import { BaseLLMTrackedTask } from "../base-llm-tracked-task";

/**
 * Task to generate insights.
 * Extends BaseLLMTrackedTask to share the common lifecycle pattern with LLM stats tracking.
 */
@injectable()
export class InsightsGenerationTask extends BaseLLMTrackedTask {
  /**
   * Constructor with dependency injection.
   */
  constructor(
    @inject(llmTokens.LLMTelemetryTracker) llmStats: LLMTelemetryTracker,
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
