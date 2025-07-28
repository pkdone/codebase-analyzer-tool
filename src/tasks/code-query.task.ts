import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import { getTextLines } from "../common/utils/fs-utils";
import { getErrorText } from "../common/utils/error-utils";
import CodeQuestioner from "../components/querying/code-questioner";
import { appConfig } from "../config/app.config";
import { Task } from "../lifecycle/task.types";
import { TOKENS } from "../di/tokens";

// Constants for Promise.allSettled status values
const PROMISE_STATUS = {
  FULFILLED: "fulfilled" as const,
  REJECTED: "rejected" as const,
} as const;

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
    const questions = await getTextLines(appConfig.QUESTIONS_PROMPTS_FILEPATH);
    const queryPromises = questions.map(async (question) => {
      try {
        const answer = await this.codeQuestioner.queryCodebaseWithQuestion(
          question,
          this.projectName,
        );
        return { status: PROMISE_STATUS.FULFILLED, value: answer, question };
      } catch (reason: unknown) {
        return { status: PROMISE_STATUS.REJECTED, reason, question };
      }
    });
    const results = await Promise.all(queryPromises);
    results.forEach((result) => {
      if (result.status === PROMISE_STATUS.FULFILLED) {
        console.log(
          `\n---------------\nQUESTION: ${result.question}\n\n${result.value}\n---------------\n`,
        );
      } else {
        console.error(
          `\n---------------\nFAILED QUESTION: ${result.question}\n\nERROR: ${getErrorText(result.reason)}\n---------------\n`,
        );
      }
    });
  }
}
