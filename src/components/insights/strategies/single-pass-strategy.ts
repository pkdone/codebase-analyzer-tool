import { injectable, inject } from "tsyringe";
import LLMRouter from "../../../llm/core/llm-router";
import { LLMOutputFormat } from "../../../llm/types/llm.types";
import { summaryCategoriesConfig } from "../../../config/insights.config";
import { logWarningMsg } from "../../../common/utils/logging";
import { joinArrayWithSeparators } from "../../../common/utils/text-formatting";
import { createPromptFromConfig } from "../../../llm/utils/prompt-templator";
import { TOKENS } from "../../../di/tokens";
import { IInsightGenerationStrategy } from "./insight-generation-strategy.interface";
import { AppSummaryCategoryEnum, PartialAppSummaryRecord } from "../insights.types";

// Individual category schemas are simple and compatible with all LLM providers including VertexAI
const CATEGORY_SCHEMA_IS_VERTEXAI_COMPATIBLE = true;

/**
 * Single-pass insight generation strategy for small to medium codebases.
 * Processes all source file summaries in one LLM call.
 */
@injectable()
export class SinglePassInsightStrategy implements IInsightGenerationStrategy {
  private readonly APP_CATEGORY_SUMMARIZER_TEMPLATE =
    "Act as a senior developer analyzing the code in a legacy application. Take the list of paths and descriptions of its {{contentDesc}} shown below in the section marked 'SOURCES', and based on their content, return a JSON response that contains {{specificInstructions}}.\n\nThe JSON response must follow this JSON schema:\n```json\n{{jsonSchema}}\n```\n\n{{forceJSON}}\n\nSOURCES:\n{{codeContent}}";

  constructor(@inject(TOKENS.LLMRouter) private readonly llmRouter: LLMRouter) {}

  /**
   * Generate insights for a category by processing all summaries in a single pass.
   */
  async generateInsights(
    category: AppSummaryCategoryEnum,
    sourceFileSummaries: string[],
  ): Promise<PartialAppSummaryRecord | null> {
    const categoryLabel = summaryCategoriesConfig[category].label;

    try {
      const schema = summaryCategoriesConfig[category].schema;
      const content = joinArrayWithSeparators(sourceFileSummaries);
      const prompt = this.createInsightsForCategoryPrompt(category, content);

      const llmResponse = await this.llmRouter.executeCompletion<PartialAppSummaryRecord>(
        category,
        prompt,
        {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: schema,
          hasComplexSchema: !CATEGORY_SCHEMA_IS_VERTEXAI_COMPATIBLE,
        },
      );

      return llmResponse;
    } catch (error: unknown) {
      logWarningMsg(
        `${error instanceof Error ? error.message : "Unknown error"} for ${categoryLabel}`,
      );
      return null;
    }
  }

  /**
   * Create a prompt for the LLM to generate insights for a specific category.
   */
  private createInsightsForCategoryPrompt(
    type: AppSummaryCategoryEnum,
    codeContent: string,
  ): string {
    const config = summaryCategoriesConfig[type];
    return createPromptFromConfig(
      this.APP_CATEGORY_SUMMARIZER_TEMPLATE,
      "source files",
      config.description,
      config.schema,
      codeContent,
    );
  }
}
