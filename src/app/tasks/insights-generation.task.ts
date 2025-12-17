import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import type { InsightsProcessorSelector } from "../components/insights/insights-processor-selector";
import type LLMStats from "../../common/llm/tracking/llm-stats";
import { Task } from "./task.types";
import { llmTokens } from "../di/tokens";
import { coreTokens } from "../di/tokens";
import { insightsTokens } from "../di/tokens";
import { outputConfig } from "../config/output.config";
import { clearDirectory } from "../../common/fs/directory-operations";

/**
 * Task to generate insights.
 */
@injectable()
export class InsightsGenerationTask implements Task {
  /**
   * Constructor with dependency injection.
   */
  constructor(
    @inject(llmTokens.LLMStats) private readonly llmStats: LLMStats,
    @inject(coreTokens.ProjectName) private readonly projectName: string,
    @inject(insightsTokens.InsightsProcessorSelector)
    private readonly insightsProcessorSelector: InsightsProcessorSelector,
  ) {}

  /**
   * Execute the task with standard LLM stats reporting wrapper.
   */
  async execute(): Promise<void> {
    console.log(`Generating insights for project: ${this.projectName}`);
    this.llmStats.displayLLMStatusSummary();
    await clearDirectory(outputConfig.OUTPUT_DIR);
    const selectedProcessor = await this.insightsProcessorSelector.selectInsightsProcessor();
    await selectedProcessor.generateAndStoreInsights();
    console.log(`Finished generating insights for the project`);
    console.log("Summary of LLM invocations outcomes:");
    this.llmStats.displayLLMStatusDetails();
  }
}
