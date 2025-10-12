import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import CodebaseToDBLoader from "../components/capture/codebase-to-db-loader";
import type { LLMStatsReporter } from "../llm/core/tracking/llm-stats-reporter";
import { BaseLLMTask } from "./base-llm.task";
import type { EnvVars } from "../env/env.types";
import { DatabaseInitializer } from "./setup/database-initializer";
import { databaseConfig } from "../config/database.config";
import { TOKENS } from "../di/tokens";
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
    @inject(TOKENS.LLMStatsReporter) llmStatsReporter: LLMStatsReporter,
    @inject(TOKENS.DatabaseInitializer)
    private readonly databaseInitializer: DatabaseInitializer,
    @inject(TOKENS.EnvVars) private readonly env: EnvVars,
    @inject(TOKENS.ProjectName) projectName: string,
    @inject(TOKENS.CodebaseToDBLoader) private readonly codebaseToDBLoader: CodebaseToDBLoader,
  ) {
    super(llmStatsReporter, projectName);
  }

  /**
   * Get the task name for logging.
   */
  protected getTaskActivityDescription(): string {
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
