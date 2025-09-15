import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import { pathsConfig } from "../config/paths.config";
import { outputConfig } from "../config/output.config";
import { clearDirectory } from "../common/utils/directory-operations";
import { RawCodeToInsightsFileGenerator } from "../components/insights/insights-from-raw-code-to-local-files";
import type LLMRouter from "../llm/core/llm-router";
import type { LLMStatsReporter } from "../llm/core/tracking/llm-stats-reporter";
import { Task } from "./task.types";
import type { EnvVars } from "../env/env.types";
import { TOKENS } from "../di/tokens";

/**
 * Task to generate inline insights.
 */
@injectable()
export class OneShotGenerateInsightsTask implements Task {
  /**
   * Constructor with dependency injection.
   */
  constructor(
    @inject(TOKENS.LLMRouter) private readonly llmRouter: LLMRouter,
    @inject(TOKENS.LLMStatsReporter) private readonly llmStatsReporter: LLMStatsReporter,
    @inject(TOKENS.EnvVars) private readonly env: EnvVars,
    @inject(TOKENS.RawCodeToInsightsFileGenerator)
    private readonly insightsFileGenerator: RawCodeToInsightsFileGenerator,
  ) {}

  /**
   * Execute the task - generates inline insights.
   */
  async execute(): Promise<void> {
    await this.generateInsightsToFiles(this.env.CODEBASE_DIR_PATH, this.env.LLM);
  }

  /**
   * Generates inline insights.
   */
  private async generateInsightsToFiles(srcDirPath: string, llmName: string): Promise<void> {
    const normalisedSrcDirPath = srcDirPath.replace(pathsConfig.TRAILING_SLASH_PATTERN, "");
    this.llmStatsReporter.displayLLMStatusSummary();
    await clearDirectory(outputConfig.OUTPUT_DIR);
    const prompts = await this.insightsFileGenerator.loadPrompts();
    await this.insightsFileGenerator.generateInsightsToFiles(
      this.llmRouter,
      normalisedSrcDirPath,
      llmName,
      prompts,
    );
    this.llmStatsReporter.displayLLMStatusDetails();
    console.log(`View generated results in the 'file://${outputConfig.OUTPUT_DIR}' folder`);
  }
}
