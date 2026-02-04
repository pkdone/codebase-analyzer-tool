import { injectable, inject } from "tsyringe";
import LLMRouter from "../../../../common/llm/llm-router";
import { llmTokens } from "../../../di/tokens";
import { InsightGenerationStrategy } from "./insight-generation-strategy.interface";
import { AppSummaryCategoryEnum, CategoryInsightResult } from "../insights.types";
import { executeInsightCompletion } from "./insights-completion-executor";

/**
 * Single-pass insight generation strategy for small to medium codebases.
 * Processes all source file summaries in one LLM call.
 */
@injectable()
export class SinglePassInsightStrategy implements InsightGenerationStrategy {
  constructor(@inject(llmTokens.LLMRouter) private readonly llmRouter: LLMRouter) {}

  /**
   * Generate insights for a category by processing all summaries in a single pass.
   * Returns the strongly-typed result inferred from the category's schema.
   */
  async generateInsights<C extends AppSummaryCategoryEnum>(
    category: C,
    sourceFileSummaries: readonly string[],
  ): Promise<CategoryInsightResult<C> | null> {
    return executeInsightCompletion(this.llmRouter, category, sourceFileSummaries);
  }
}
