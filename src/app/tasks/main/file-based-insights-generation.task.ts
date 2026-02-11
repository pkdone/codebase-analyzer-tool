import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import { outputConfig } from "../../config/output.config";
import { RequirementPromptExecutor } from "../../components/insights/generators/requirement-prompt-executor";
import type LLMExecutionStats from "../../../common/llm/tracking/llm-execution-stats";
import type { EnvVars } from "../../env/env.types";
import type LLMRouter from "../../../common/llm/llm-router";
import { llmTokens, insightsTokens, coreTokens } from "../../di/tokens";
import { BaseAnalysisTask } from "../base-analysis-task";

/**
 * Task to execute requirement prompts from files in the input/requirements directory.
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
    @inject(llmTokens.LLMRouter) private readonly llmRouter: LLMRouter,
    @inject(insightsTokens.RequirementPromptExecutor)
    private readonly requirementPromptExecutor: RequirementPromptExecutor,
  ) {
    super(llmStats, projectName);
  }

  protected getStartMessage(): string {
    return "Executing requirement prompts for project";
  }

  protected getFinishMessage(): string {
    return "Finished executing requirement prompts for the project";
  }

  protected async runTask(): Promise<void> {
    const modelsDescription = this.llmRouter.getCompletionModelKeys().join(", ");
    await this.requirementPromptExecutor.executeRequirementsToFiles(
      this.env.CODEBASE_DIR_PATH,
      modelsDescription,
    );
  }

  protected override getPostTaskMessage(): string | null {
    return `View generated results in the 'file://${outputConfig.OUTPUT_DIR}' folder`;
  }
}
