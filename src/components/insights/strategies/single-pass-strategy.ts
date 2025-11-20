import { injectable, inject } from "tsyringe";
import LLMRouter from "../../../llm/core/llm-router";
import { llmTokens } from "../../../di/tokens";
import { IInsightGenerationStrategy } from "./insight-generation-strategy.interface";
import { AppSummaryCategoryEnum, PartialAppSummaryRecord } from "../insights.types";
import { executeInsightCompletion } from "./insight-completion-helper";

/**
 * Single-pass insight generation strategy for small to medium codebases.
 * Processes all source file summaries in one LLM call.
 */
@injectable()
export class SinglePassInsightStrategy implements IInsightGenerationStrategy {
  constructor(@inject(llmTokens.LLMRouter) private readonly llmRouter: LLMRouter) {}

  /**
   * Generate insights for a category by processing all summaries in a single pass.
   */
  async generateInsights(
    category: AppSummaryCategoryEnum,
    sourceFileSummaries: string[],
  ): Promise<PartialAppSummaryRecord | null> {
    return executeInsightCompletion(this.llmRouter, category, sourceFileSummaries);
  }
}
