import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import CodebaseToDBLoader from "../../components/capture/codebase-to-db-loader";
import type LLMStats from "../../../common/llm/tracking/llm-stats";
import type LLMRouter from "../../../common/llm/llm-router";
import { Task } from "../task.types";
import type { EnvVars } from "../../env/env.types";
import { DatabaseInitializer } from "../../components/database/database-initializer";
import { databaseConfig } from "../../components/database/database.config";
import { llmTokens, coreTokens } from "../../di/tokens";
import { captureTokens } from "../../di/tokens";
import { clearDirectory } from "../../../common/fs/directory-operations";
import { outputConfig } from "../../components/reporting/config/output.config";

/**
 * Task to capture the codebase.
 */
@injectable()
export class CodebaseCaptureTask implements Task {
  /**
   * Constructor with dependency injection.
   */
  constructor(
    @inject(llmTokens.LLMStats) private readonly llmStats: LLMStats,
    @inject(llmTokens.LLMRouter) private readonly llmRouter: LLMRouter,
    @inject(coreTokens.DatabaseInitializer)
    private readonly databaseInitializer: DatabaseInitializer,
    @inject(coreTokens.EnvVars) private readonly env: EnvVars,
    @inject(coreTokens.ProjectName) private readonly projectName: string,
    @inject(captureTokens.CodebaseToDBLoader)
    private readonly codebaseToDBLoader: CodebaseToDBLoader,
  ) {}

  /**
   * Execute the task with standard LLM stats reporting wrapper.
   */
  async execute(): Promise<void> {
    console.log(`Processing source files for project: ${this.projectName}`);
    this.llmStats.displayLLMStatusSummary();
    await clearDirectory(outputConfig.OUTPUT_DIR);
    const vectorDimensions =
      this.llmRouter.getEmbeddingModelDimensions() ?? databaseConfig.DEFAULT_VECTOR_DIMENSIONS;
    await this.databaseInitializer.initializeDatabaseSchema(vectorDimensions);
    await this.codebaseToDBLoader.captureCodebaseToDatabase(
      this.projectName,
      this.env.CODEBASE_DIR_PATH,
      this.env.SKIP_ALREADY_PROCESSED_FILES,
    );
    console.log(`Finished processing source files for the project`);
    console.log("Summary of LLM invocations outcomes:");
    this.llmStats.displayLLMStatusDetails();
  }
}
