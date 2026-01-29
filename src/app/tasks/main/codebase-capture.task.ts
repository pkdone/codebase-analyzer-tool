import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import CodebaseToDBLoader from "../../components/capture/codebase-to-db-loader";
import type LLMExecutionStats from "../../../common/llm/tracking/llm-execution-stats";
import type LLMRouter from "../../../common/llm/llm-router";
import type { EnvVars } from "../../env/env.types";
import { DatabaseInitializer } from "../../components/database/database-initializer";
import { databaseConfig } from "../../config/database.config";
import { llmTokens, coreTokens } from "../../di/tokens";
import { captureTokens } from "../../di/tokens";
import { BaseAnalysisTask } from "../base-analysis-task";

/**
 * Task to capture the codebase.
 * Extends BaseAnalysisTask to share the common lifecycle pattern with LLM stats tracking.
 */
@injectable()
export class CodebaseCaptureTask extends BaseAnalysisTask {
  /**
   * Constructor with dependency injection.
   */
  constructor(
    @inject(llmTokens.LLMExecutionStats) llmStats: LLMExecutionStats,
    @inject(coreTokens.ProjectName) projectName: string,
    @inject(llmTokens.LLMRouter) private readonly llmRouter: LLMRouter,
    @inject(coreTokens.DatabaseInitializer)
    private readonly databaseInitializer: DatabaseInitializer,
    @inject(coreTokens.EnvVars) private readonly env: EnvVars,
    @inject(captureTokens.CodebaseToDBLoader)
    private readonly codebaseToDBLoader: CodebaseToDBLoader,
  ) {
    super(llmStats, projectName);
  }

  protected getStartMessage(): string {
    return "Processing source files for project";
  }

  protected getFinishMessage(): string {
    return "Finished processing source files for the project";
  }

  protected async runTask(): Promise<void> {
    const vectorDimensions =
      this.llmRouter.getEmbeddingModelDimensions() ?? databaseConfig.DEFAULT_VECTOR_DIMENSIONS;
    await this.databaseInitializer.initializeDatabaseSchema(vectorDimensions);
    await this.codebaseToDBLoader.captureCodebaseToDatabase(
      this.projectName,
      this.env.CODEBASE_DIR_PATH,
      this.env.SKIP_ALREADY_PROCESSED_FILES,
    );
  }
}
