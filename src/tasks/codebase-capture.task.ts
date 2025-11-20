import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import CodebaseToDBLoader from "../components/capture/codebase-to-db-loader";
import type { LLMStatsReporter } from "../llm/core/tracking/llm-stats-reporter";
import { BaseLLMTask } from "./base-llm.task";
import type { EnvVars } from "../env/env.types";
import { DatabaseInitializer } from "./database-initializer";
import { databaseConfig } from "../config/database.config";
import { llmTokens } from "../di/tokens";
import { taskTokens } from "../di/tokens";
import { coreTokens } from "../di/tokens";
import { captureTokens } from "../di/tokens";
import { clearDirectory } from "../common/fs/directory-operations";
import { outputConfig } from "../config/output.config";

/**
 * Task to capture the codebase.
 */
@injectable()
export class CodebaseCaptureTask extends BaseLLMTask {
  /**
   * Constructor with dependency injection.
   */
  constructor(
    @inject(llmTokens.LLMStatsReporter) llmStatsReporter: LLMStatsReporter,
    @inject(taskTokens.DatabaseInitializer)
    private readonly databaseInitializer: DatabaseInitializer,
    @inject(coreTokens.EnvVars) private readonly env: EnvVars,
    @inject(coreTokens.ProjectName) projectName: string,
    @inject(captureTokens.CodebaseToDBLoader)
    private readonly codebaseToDBLoader: CodebaseToDBLoader,
  ) {
    super(llmStatsReporter, projectName);
  }

  /**
   * Get the task name for logging.
   */
  protected getActivityDescription(): string {
    return "Processing source files";
  }

  /**
   * Execute the core task logic.
   */
  protected async run(): Promise<void> {
    await clearDirectory(outputConfig.OUTPUT_DIR);
    await this.databaseInitializer.initializeDatabaseSchema(
      databaseConfig.DEFAULT_VECTOR_DIMENSIONS,
    );
    await this.codebaseToDBLoader.captureCodebaseToDatabase(
      this.projectName,
      this.env.CODEBASE_DIR_PATH,
      this.env.SKIP_ALREADY_PROCESSED_FILES,
    );
  }
}
