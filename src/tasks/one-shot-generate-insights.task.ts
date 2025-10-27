import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import { outputConfig } from "../config/output.config";
import { clearDirectory } from "../common/fs/directory-operations";
import { LocalInsightsGenerator } from "../components/insights/insights-from-raw-code-to-local-files";
import type LLMRouter from "../llm/core/llm-router";
import type { LLMStatsReporter } from "../llm/core/tracking/llm-stats-reporter";
import { BaseLLMTask } from "./base-llm.task";
import type { EnvVars } from "../env/env.types";
import { llmTokens } from "../llm/core/llm.tokens";
import { insightsTokens } from "../components/insights/insights.tokens";
import { coreTokens } from "../di/core.tokens";

/**
 * Task to generate inline insights.
 */
@injectable()
export class OneShotGenerateInsightsTask extends BaseLLMTask {
  /**
   * Constructor with dependency injection.
   */
  constructor(
    @inject(llmTokens.LLMRouter) private readonly llmRouter: LLMRouter,
    @inject(llmTokens.LLMStatsReporter) llmStatsReporter: LLMStatsReporter,
    @inject(coreTokens.EnvVars) private readonly env: EnvVars,
    @inject(insightsTokens.LocalInsightsGenerator)
    private readonly insightsFileGenerator: LocalInsightsGenerator,
    @inject(coreTokens.ProjectName) projectName: string,
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
    const prompts = await this.insightsFileGenerator.loadPrompts();
    await this.insightsFileGenerator.generateInsightsToFiles(
      this.llmRouter,
      this.env.CODEBASE_DIR_PATH,
      this.env.LLM,
      prompts,
    );
    console.log(`View generated results in the 'file://${outputConfig.OUTPUT_DIR}' folder`);
  }
}
