import { injectable, inject } from "tsyringe";
import LLMRouter from "../../../llm/llm-router";
import { llmTokens } from "../../../di/tokens";
import { ICompletionStrategy } from "./completion-strategy.interface";
import { AppSummaryCategoryEnum } from "../insights.types";
import { executeInsightCompletion } from "./completion-executor";

/**
 * Single-pass insight generation strategy for small to medium codebases.
 * Processes all source file summaries in one LLM call.
 */
@injectable()
export class SinglePassCompletionStrategy implements ICompletionStrategy {
  constructor(@inject(llmTokens.LLMRouter) private readonly llmRouter: LLMRouter) {}

  /**
   * Generate insights for a category by processing all summaries in a single pass.
   */
  async generateInsights<T>(
    category: AppSummaryCategoryEnum,
    sourceFileSummaries: string[],
  ): Promise<T | null> {
    return executeInsightCompletion<T>(this.llmRouter, category, sourceFileSummaries);
  }
}
