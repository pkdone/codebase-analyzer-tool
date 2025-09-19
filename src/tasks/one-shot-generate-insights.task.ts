import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import { pathsConfig } from "../config/paths.config";
import { outputConfig } from "../config/output.config";
import { clearDirectory } from "../common/utils/directory-operations";
import { RawCodeToInsightsFileGenerator } from "../components/insights/insights-from-raw-code-to-local-files";
import type LLMRouter from "../llm/core/llm-router";
import type { LLMStatsReporter } from "../llm/core/tracking/llm-stats-reporter";
import { BaseLLMTask } from "./base-llm.task";
import type { EnvVars } from "../env/env.types";
import { TOKENS } from "../di/tokens";

/**
 * Task to generate inline insights.
 */
@injectable()
export class OneShotGenerateInsightsTask extends BaseLLMTask {
  /**
   * Constructor with dependency injection.
   */
  constructor(
    @inject(TOKENS.LLMRouter) private readonly llmRouter: LLMRouter,
    @inject(TOKENS.LLMStatsReporter) llmStatsReporter: LLMStatsReporter,
    @inject(TOKENS.EnvVars) private readonly env: EnvVars,
    @inject(TOKENS.RawCodeToInsightsFileGenerator)
    private readonly insightsFileGenerator: RawCodeToInsightsFileGenerator,
    @inject(TOKENS.ProjectName) projectName: string,
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
    const normalisedSrcDirPath = this.env.CODEBASE_DIR_PATH.replace(
      pathsConfig.TRAILING_SLASH_PATTERN,
      "",
    );
    await clearDirectory(outputConfig.OUTPUT_DIR);
    const prompts = await this.insightsFileGenerator.loadPrompts();
    await this.insightsFileGenerator.generateInsightsToFiles(
      this.llmRouter,
      normalisedSrcDirPath,
      this.env.LLM,
      prompts,
    );
    console.log(`View generated results in the 'file://${outputConfig.OUTPUT_DIR}' folder`);
  }
}
