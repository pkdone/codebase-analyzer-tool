import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import { getTextLines } from "../common/utils/fs-utils";
import CodeQuestioner from "../components/querying/code-questioner";
import { appConfig } from "../config/app.config";
import { Service } from "../lifecycle/service.types";
import { TOKENS } from "../di/tokens";

/**
 * Service to query the codebase.
 */
@injectable()
export class CodebaseQueryService implements Service {
  /**
   * Constructor with dependency injection.
   */
  constructor(
    @inject(TOKENS.ProjectName) private readonly projectName: string,
    @inject(TOKENS.CodeQuestioner) private readonly codeQuestioner: CodeQuestioner,
  ) {}

  /**
   * Execute the service - queries the codebase.
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

    for (const question of questions) {
      const result = await this.codeQuestioner.queryCodebaseWithQuestion(
        question,
        this.projectName,
      );
      console.log(`\n---------------\nQUESTION: ${question}\n\n${result}\n---------------\n`);
    }
  }
}
