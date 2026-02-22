import { injectable, inject } from "tsyringe";
import { insightsTokens } from "../../../di/tokens";
import { InsightGenerationStrategy } from "./insight-generation-strategy.interface";
import { AppSummaryCategoryType, CategoryInsightResult } from "../insights.types";
import type { InsightsCompletionExecutor } from "./insights-completion-executor";

/**
 * Single-pass insight generation strategy for small to medium codebases.
 * Processes all source file summaries in one LLM call.
 */
@injectable()
export class SinglePassInsightStrategy implements InsightGenerationStrategy {
  constructor(
    @inject(insightsTokens.InsightsCompletionExecutor)
    private readonly completionExecutor: InsightsCompletionExecutor,
  ) {}

  /**
   * Generate insights for a category by processing all summaries in a single pass.
   * Returns the strongly-typed result inferred from the category's schema.
   */
  async generateInsights<C extends AppSummaryCategoryType>(
    category: C,
    sourceFileSummaries: readonly string[],
  ): Promise<CategoryInsightResult<C> | null> {
    return this.completionExecutor.execute(category, sourceFileSummaries);
  }
}
