import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import { readAndFilterLines } from "../common/utils/fs-utils";
import { formatErrorMessage } from "../common/utils/error-utils";
import CodeQuestioner from "../components/querying/code-questioner";
import { appConfig } from "../config/app.config";
import { Task } from "../env/task.types";
import { TOKENS } from "../di/tokens";

/**
 * Task to query the codebase.
 */
@injectable()
export class CodebaseQueryTask implements Task {
  /**
   * Constructor with dependency injection.
   */
  constructor(
    @inject(TOKENS.ProjectName) private readonly projectName: string,
    @inject(TOKENS.CodeQuestioner) private readonly codeQuestioner: CodeQuestioner,
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
    const questions = await readAndFilterLines(appConfig.QUESTIONS_PROMPTS_FILEPATH);
    const queryPromises = questions.map(async (question) =>
      this.codeQuestioner.queryCodebaseWithQuestion(question, this.projectName),
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
          `\n---------------\nFAILED QUESTION: ${question}\n\nERROR: ${formatErrorMessage(result.reason)}\n---------------\n`,
        );
      }
    });
  }
}
