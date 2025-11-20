import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import { outputConfig } from "../config/output.config";
import { clearDirectory } from "../common/fs/directory-operations";
import { PromptFileInsightsGenerator } from "../components/insights/prompt-file-insights-generator";
import type { LLMStatsReporter } from "../llm/core/tracking/llm-stats-reporter";
import { Task } from "./task.types";
import type { EnvVars } from "../env/env.types";
import { llmTokens } from "../di/tokens";
import { insightsTokens } from "../di/tokens";
import { coreTokens } from "../di/tokens";

/**
 * Task to generate inline insights.
 */
@injectable()
export class DirectInsightsGenerationTask implements Task {
  /**
   * Constructor with dependency injection.
   */
  constructor(
    @inject(llmTokens.LLMStatsReporter) private readonly llmStatsReporter: LLMStatsReporter,
    @inject(coreTokens.EnvVars) private readonly env: EnvVars,
    @inject(insightsTokens.PromptFileInsightsGenerator)
    private readonly insightsFileGenerator: PromptFileInsightsGenerator,
    @inject(coreTokens.ProjectName) private readonly projectName: string,
  ) {}

  /**
   * Execute the task with standard LLM stats reporting wrapper.
   */
  async execute(): Promise<void> {
    console.log(`Generating insights for project: ${this.projectName}`);
    this.llmStatsReporter.displayLLMStatusSummary();
    await clearDirectory(outputConfig.OUTPUT_DIR);
    const prompts = await this.insightsFileGenerator.loadPrompts();
    await this.insightsFileGenerator.generateInsightsToFiles(
      this.env.CODEBASE_DIR_PATH,
      this.env.LLM,
      prompts,
    );
    console.log(`Finished generating insights for the project`);
    console.log("Summary of LLM invocations outcomes:");
    this.llmStatsReporter.displayLLMStatusDetails();
    console.log(`View generated results in the 'file://${outputConfig.OUTPUT_DIR}' folder`);
  }
}
