import { injectable, inject } from "tsyringe";
import LLMRouter from "../../llm/core/llm-router";
import type { AppSummariesRepository } from "../../repositories/app-summary/app-summaries.repository.interface";
import { TOKENS } from "../../di/tokens";

/**
 * TODO
 */
@injectable()
export default class InsightsFromRawCodeGenerator {
  private readonly llmProviderDescription: string;

  /**
   * Creates a new InsightsFromRawCodeGenerator.
   */
  constructor(
    @inject(TOKENS.AppSummariesRepository)
    private readonly appSummariesRepository: AppSummariesRepository,
    @inject(TOKENS.LLMRouter) private readonly llmRouter: LLMRouter,
    @inject(TOKENS.ProjectName) private readonly projectName: string,
  ) {
    this.llmProviderDescription = this.llmRouter.getModelsUsedDescription();
  }

  /**
   * TODO
   */
  async generateSummariesDataIntoDB(): Promise<void> {
    void this.projectName; // TODO: use
    void this.appSummariesRepository; // TODO: use
    void this.llmProviderDescription; // TODO: use

    // TODO: Temporary await to avoid async warning
    await new Promise((resolve) => {
      const id = setInterval(() => {
        clearInterval(id);
        resolve(undefined);
      }, 1);
    });
  }
}