import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import CodebaseToDBLoader from "../components/capture/codebase-to-db-loader";
import type LLMRouter from "../llm/core/llm-router";
import type { LLMStatsReporter } from "../llm/core/tracking/llm-stats-reporter";
import { BaseLLMTask } from "./base-llm.task";
import type { EnvVars } from "../env/env.types";
import type { DBInitializerTask } from "./db-initializer.task";
import { databaseConfig } from "../config/database.config";
import { TOKENS } from "../di/tokens";

/**
 * Task to capture the codebase.
 */
@injectable()
export class CodebaseCaptureTask extends BaseLLMTask {
  /**
   * Constructor with dependency injection.
   */
  constructor(
    @inject(TOKENS.LLMRouter) private readonly llmRouter: LLMRouter,
    @inject(TOKENS.LLMStatsReporter) llmStatsReporter: LLMStatsReporter,
    @inject(TOKENS.DBInitializerTask)
    private readonly dbInitializerTask: DBInitializerTask,
    @inject(TOKENS.EnvVars) private readonly env: EnvVars,
    @inject(TOKENS.ProjectName) projectName: string,
    @inject(TOKENS.CodebaseToDBLoader) private readonly codebaseToDBLoader: CodebaseToDBLoader,
  ) {
    super(llmStatsReporter, projectName);
  }

  /**
   * Get the task name for logging.
   */
  protected getTaskName(): string {
    return "Processing source files";
  }

  /**
   * Execute the core task logic.
   */
  protected async run(): Promise<void> {
    const numDimensions =
      this.llmRouter.getEmbeddedModelDimensions() ?? databaseConfig.DEFAULT_VECTOR_DIMENSIONS;
    await this.dbInitializerTask.ensureCollectionsReady(numDimensions);
    await this.codebaseToDBLoader.captureCodebaseToDatabase(
      this.projectName,
      this.env.CODEBASE_DIR_PATH,
      this.env.SKIP_ALREADY_PROCESSED_FILES,
    );
  }
}
