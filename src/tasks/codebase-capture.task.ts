import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import CodebaseToDBLoader from "../components/capture/codebase-to-db-loader";
import type LLMRouter from "../llm/core/llm-router";
import type { LLMStatsReporter } from "../llm/core/tracking/llm-stats-reporter";
import { Task } from "./task.types";
import type { EnvVars } from "../env/env.types";
import type { DBInitializerTask } from "./db-initializer.task";
import { databaseConfig } from "../config/database.config";
import { TOKENS } from "../di/tokens";

/**
 * Task to capture the codebase.
 */
@injectable()
export class CodebaseCaptureTask implements Task {
  /**
   * Constructor with dependency injection.
   */
  constructor(
    @inject(TOKENS.LLMRouter) private readonly llmRouter: LLMRouter,
    @inject(TOKENS.LLMStatsReporter) private readonly llmStatsReporter: LLMStatsReporter,
    @inject(TOKENS.DBInitializerTask)
    private readonly dbInitializerTask: DBInitializerTask,
    @inject(TOKENS.EnvVars) private readonly env: EnvVars,
    @inject(TOKENS.ProjectName) private readonly projectName: string,
    @inject(TOKENS.CodebaseToDBLoader) private readonly codebaseToDBLoader: CodebaseToDBLoader,
  ) {}

  /**
   * Execute the task - captures the codebase.
   */
  async execute(): Promise<void> {
    await this.captureCodebase(this.env.CODEBASE_DIR_PATH, this.env.SKIP_ALREADY_PROCESSED_FILES);
  }

  /**
   * Captures the codebase.
   */
  private async captureCodebase(srcDirPath: string, skipIfAlreadyCaptured: boolean): Promise<void> {
    console.log(`Processing source files for project: ${this.projectName}`);
    const numDimensions =
      this.llmRouter.getEmbeddedModelDimensions() ?? databaseConfig.DEFAULT_VECTOR_DIMENSIONS;
    await this.dbInitializerTask.ensureCollectionsReady(numDimensions);
    this.llmStatsReporter.displayLLMStatusSummary();
    await this.codebaseToDBLoader.captureCodebaseToDatabase(this.projectName, srcDirPath, skipIfAlreadyCaptured);
    console.log("Finished capturing project files metadata into database");
    console.log("Summary of LLM invocations outcomes:");
    this.llmStatsReporter.displayLLMStatusDetails();
  }
}
