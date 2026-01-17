import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import { readFile } from "../../../common/fs/file-operations";
import { formatError } from "../../../common/utils/error-formatters";
import { queryCodebaseWithQuestion } from "../../components/querying/codebase-query-processor";
import { coreTokens, repositoryTokens, llmTokens } from "../../di/tokens";
import { inputConfig } from "../../config/input.config";
import type { SourcesRepository } from "../../repositories/sources/sources.repository.interface";
import type LLMRouter from "../../../common/llm/llm-router";
import type LLMExecutionStats from "../../../common/llm/tracking/llm-execution-stats";
import { BaseAnalysisTask } from "../base-analysis-task";

/**
 * Task to query the codebase using vector search and LLM.
 * Extends BaseAnalysisTask to share the common lifecycle pattern with LLM stats tracking.
 */
@injectable()
export class CodebaseQueryTask extends BaseAnalysisTask {
  /**
   * Constructor with dependency injection.
   */
  constructor(
    @inject(llmTokens.LLMExecutionStats) llmStats: LLMExecutionStats,
    @inject(coreTokens.ProjectName) projectName: string,
    @inject(repositoryTokens.SourcesRepository)
    private readonly sourcesRepository: SourcesRepository,
    @inject(llmTokens.LLMRouter) private readonly llmRouter: LLMRouter,
  ) {
    super(llmStats, projectName);
  }

  protected getStartMessage(): string {
    return "Performing vector search and LLM query for project";
  }

  protected getFinishMessage(): string {
    return "Finished querying the codebase";
  }

  /**
   * Query tasks don't generate output files, so skip clearing the output directory.
   */
  protected override shouldClearOutputDirectory(): boolean {
    return false;
  }

  protected async runTask(): Promise<void> {
    // Read questions file and filter out blank lines and comments
    const fileContents = await readFile(inputConfig.QUESTIONS_PROMPTS_FILEPATH);
    const questions = fileContents
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line !== "" && !line.startsWith("#"));

    const queryPromises = questions.map(async (question) =>
      queryCodebaseWithQuestion(this.sourcesRepository, this.llmRouter, question, this.projectName),
    );
    const results = await Promise.allSettled(queryPromises);
    results.forEach((result, index) => {
      const question = questions[index];
      if (result.status === "fulfilled") {
        console.log(
          `\n---------------\nQUESTION: ${question}\n\n${result.value}\n---------------\n`,
        );
      } else {
        console.error(
          `\n---------------\nFAILED QUESTION: ${question}\n\nERROR: ${formatError(result.reason)}\n---------------\n`,
        );
      }
    });
  }
}
