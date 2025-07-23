import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import { appConfig } from "../config/app.config";
import { clearDirectory } from "../common/utils/fs-utils";
import { RawCodeToInsightsFileGenerator } from "../components/insights/insights-from-raw-code-to-local-files";
import type LLMRouter from "../llm/core/llm-router";
import { Task } from "../lifecycle/task.types";
import type { EnvVars } from "../lifecycle/env.types";
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
    @inject(TOKENS.EnvVars) private readonly env: EnvVars,
    @inject(TOKENS.RawCodeToInsightsFileGenerator)
    private readonly insightProcessor: RawCodeToInsightsFileGenerator,
  ) {}

  /**
   * Execute the task - generates inline insights.
   */
  async execute(): Promise<void> {
    await this.generateInlineInsights(this.env.CODEBASE_DIR_PATH, this.env.LLM);
  }

  /**
   * Generates inline insights.
   */
  private async generateInlineInsights(srcDirPath: string, llmName: string): Promise<void> {
    const normalisedSrcDirPath = srcDirPath.replace(appConfig.TRAILING_SLASH_PATTERN, "");
    this.llmRouter.displayLLMStatusSummary();
    await clearDirectory(appConfig.OUTPUT_DIR);
    
    // Load prompts from file system and pass them to the generator
    const prompts = await RawCodeToInsightsFileGenerator.loadPrompts();
    
    await this.insightProcessor.generateInsightsToFiles(
      this.llmRouter,
      normalisedSrcDirPath,
      llmName,
      prompts,
    );
    this.llmRouter.displayLLMStatusDetails();
    console.log(`View generated results in the 'file://${appConfig.OUTPUT_DIR}' folder`);
  }
}
