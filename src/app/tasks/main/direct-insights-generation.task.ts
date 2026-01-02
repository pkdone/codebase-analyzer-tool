import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import { outputConfig } from "../../config/output.config";
import { PromptFileInsightsGenerator } from "../../components/insights/generators/prompt-file-insights-generator";
import type LLMStats from "../../../common/llm/tracking/llm-stats";
import type { EnvVars } from "../../env/env.types";
import { llmTokens, insightsTokens, coreTokens } from "../../di/tokens";
import { BaseLLMTrackedTask } from "../base-llm-tracked-task";

/**
 * Task to generate file-based insights from prompt files in the input/requirements directory.
 * This task uses a file-driven workflow that bypasses the database-centric approach.
 * Extends BaseLLMTrackedTask to share the common lifecycle pattern with LLM stats tracking.
 */
@injectable()
export class FileBasedInsightsGenerationTask extends BaseLLMTrackedTask {
  /**
   * Constructor with dependency injection.
   */
  constructor(
    @inject(llmTokens.LLMStats) llmStats: LLMStats,
    @inject(coreTokens.ProjectName) projectName: string,
    @inject(coreTokens.EnvVars) private readonly env: EnvVars,
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
    await this.insightsFileGenerator.generateInsightsToFiles(
      this.env.CODEBASE_DIR_PATH,
      this.env.LLM,
    );
  }

  protected override getPostTaskMessage(): string | null {
    return `View generated results in the 'file://${outputConfig.OUTPUT_DIR}' folder`;
  }
}
