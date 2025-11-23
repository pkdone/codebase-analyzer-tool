import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import { readAndFilterLines } from "../common/fs/file-content-utils";
import { formatError } from "../common/utils/error-formatters";
import CodebaseQueryProcessor from "../components/querying/codebase-query-processor";
import { Task } from "./task.types";
import { coreTokens } from "../di/tokens";
import { captureTokens } from "../di/tokens";
import { queryingInputConfig } from "../components/querying/config/querying-input.config";

/**
 * Task to query the codebase.
 */
@injectable()
export class CodebaseQueryTask implements Task {
  /**
   * Constructor with dependency injection.
   */
  constructor(
    @inject(coreTokens.ProjectName) private readonly projectName: string,
    @inject(captureTokens.CodebaseQueryProcessor)
    private readonly codebaseQueryProcessor: CodebaseQueryProcessor,
  ) {}

  /**
   * Execute the task - queries the codebase.
   */
  async execute(): Promise<void> {
    await this.queryCodebase();
  }

  /**
   * Queries the codebase.
   */
  private async queryCodebase(): Promise<void> {
    console.log(
      `Performing vector search then invoking LLM for optimal results for project: ${this.projectName}`,
    );
    const questions = await readAndFilterLines(queryingInputConfig.QUESTIONS_PROMPTS_FILEPATH);
    const queryPromises = questions.map(async (question) =>
      this.codebaseQueryProcessor.queryCodebaseWithQuestion(question, this.projectName),
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
