import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import { appConfig } from "../config/app.config";
import { clearDirectory, buildDirDescendingListOfFiles } from "../common/utils/fs-utils";
import { RawCodeToInsightsFileGenerator } from "../components/insights/one-shot-insights-generator";
import type LLMRouter from "../llm/core/llm-router";
import { Service } from "../lifecycle/service.types";
import type { EnvVars } from "../lifecycle/env.types";
import { TOKENS } from "../di/tokens";

/**
 * Service to generate inline insights.
 */
@injectable()
export class OneShotGenerateInsightsService implements Service {
  /**
   * Constructor with dependency injection.
   */
  constructor(
    @inject(TOKENS.LLMRouter) private readonly llmRouter: LLMRouter,
    @inject(TOKENS.EnvVars) private readonly env: EnvVars,
    @inject(TOKENS.RawCodeToInsightsFileGenerator)
    private readonly insightProcessor: RawCodeToInsightsFileGenerator,
  ) {}

  /**
   * Execute the service - generates inline insights.
   */
  async execute(): Promise<void> {
    await this.generateInlineInsights(this.env.CODEBASE_DIR_PATH, this.env.LLM);
  }

  /**
   * Generates inline insights.
   */
  private async generateInlineInsights(srcDirPath: string, llmName: string): Promise<void> {
    const cleanSrcDirPath = srcDirPath.replace(appConfig.TRAILING_SLASH_PATTERN, "");
    const srcFilepaths = await buildDirDescendingListOfFiles(
      cleanSrcDirPath,
      appConfig.FOLDER_IGNORE_LIST,
      appConfig.FILENAME_PREFIX_IGNORE,
    );
    this.llmRouter.displayLLMStatusSummary();
    const prompts = await this.insightProcessor.loadPrompts();
    await clearDirectory(appConfig.OUTPUT_DIR);
    await this.insightProcessor.processSourceFilesWithPrompts(
      this.llmRouter,
      srcFilepaths,
      cleanSrcDirPath,
      prompts,
      llmName,
    );
    this.llmRouter.displayLLMStatusDetails();
    console.log(`View generated results in the 'file://${appConfig.OUTPUT_DIR}' folder`);
  }
}
