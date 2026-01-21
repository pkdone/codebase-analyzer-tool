import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import { outputConfig } from "../../config/output.config";
import { PromptFileInsightsGenerator } from "../../components/insights/generators/prompt-file-insights-generator";
import type LLMExecutionStats from "../../../common/llm/tracking/llm-execution-stats";
import type { EnvVars } from "../../env/env.types";
import type { LLMModuleConfig } from "../../../common/llm/config/llm-module-config.types";
import { llmTokens, insightsTokens, coreTokens } from "../../di/tokens";
import { BaseAnalysisTask } from "../base-analysis-task";

/**
 * Task to generate file-based insights from prompt files in the input/requirements directory.
 * This task uses a file-driven workflow that bypasses the database-centric approach.
 * Extends BaseAnalysisTask to share the common lifecycle pattern with LLM stats tracking.
 */
@injectable()
export class FileBasedInsightsGenerationTask extends BaseAnalysisTask {
  /**
   * Constructor with dependency injection.
   */
  constructor(
    @inject(llmTokens.LLMExecutionStats) llmStats: LLMExecutionStats,
    @inject(coreTokens.ProjectName) projectName: string,
    @inject(coreTokens.EnvVars) private readonly env: EnvVars,
    @inject(llmTokens.LLMModuleConfig) private readonly llmConfig: LLMModuleConfig,
    @inject(insightsTokens.PromptFileInsightsGenerator)
    private readonly insightsFileGenerator: PromptFileInsightsGenerator,
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
    // Get a description of the configured models for logging
    const modelsDescription = this.getLLMModelsDescription();
    await this.insightsFileGenerator.generateInsightsToFiles(
      this.env.CODEBASE_DIR_PATH,
      modelsDescription,
    );
  }

  protected override getPostTaskMessage(): string | null {
    return `View generated results in the 'file://${outputConfig.OUTPUT_DIR}' folder`;
  }

  /**
   * Get a human-readable description of the LLM models being used.
   */
  private getLLMModelsDescription(): string {
    const completions = this.llmConfig.resolvedModelChain.completions
      .map((c) => `${c.providerFamily}:${c.modelKey}`)
      .join(", ");
    return `Completions: [${completions}]`;
  }
}
