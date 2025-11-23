import LLMRouter from "../../../llm/llm-router";
import { LLMOutputFormat } from "../../../llm/types/llm.types";
import { appSummaryPromptMetadata } from "../../../prompts/definitions/app-summaries";
import { logSingleLineWarning } from "../../../common/utils/logging";
import { joinArrayWithSeparators } from "../../../common/utils/text-utils";
import { Prompt } from "../../../prompts/prompt";
import { AppSummaryCategoryEnum, PartialAppSummaryRecord } from "../insights.types";

// Individual category schemas are simple and compatible with all LLM providers including VertexAI
const CATEGORY_SCHEMA_IS_VERTEXAI_COMPATIBLE = true;

/**
 * Options for executing insight completion.
 */
export interface InsightCompletionOptions {
  /** Optional note to add to the prompt (e.g., for partial analysis) */
  partialAnalysisNote?: string;
  /** Custom category label for the completion task (defaults to category) */
  taskCategory?: string;
}

/**
 * Execute LLM completion for insight generation with standardized error handling.
 * This service centralizes the common pattern of creating a prompt and calling the LLM router.
 *
 * @param llmRouter The LLM router instance
 * @param category The app summary category
 * @param sourceFileSummaries Array of source file summaries to analyze
 * @param options Optional configuration for the completion
 * @returns The generated insights or null if generation failed
 */
export async function executeInsightCompletion(
  llmRouter: LLMRouter,
  category: AppSummaryCategoryEnum,
  sourceFileSummaries: string[],
  options: InsightCompletionOptions = {},
): Promise<PartialAppSummaryRecord | null> {
  const categoryLabel = appSummaryPromptMetadata[category].label ?? category;
  const taskCategory: string = options.taskCategory ?? category;

  try {
    const config = appSummaryPromptMetadata[category];
    const codeContent = joinArrayWithSeparators(sourceFileSummaries);
    const renderParams: Record<string, string> = {};
    if (options.partialAnalysisNote) {
      renderParams.partialAnalysisNote = options.partialAnalysisNote;
    }
    const prompt = new Prompt(config, codeContent).render(renderParams);

    const llmResponse = await llmRouter.executeCompletion<PartialAppSummaryRecord>(
      taskCategory,
      prompt,
      {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: config.responseSchema,
        hasComplexSchema: !CATEGORY_SCHEMA_IS_VERTEXAI_COMPATIBLE,
      },
    );

    return llmResponse;
  } catch (error: unknown) {
    logSingleLineWarning(
      `${error instanceof Error ? error.message : "Unknown error"} for ${categoryLabel}`,
    );
    return null;
  }
}
