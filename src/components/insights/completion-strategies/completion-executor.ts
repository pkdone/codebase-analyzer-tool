import LLMRouter from "../../../llm/llm-router";
import { LLMOutputFormat } from "../../../llm/types/llm.types";
import { appSummaryPromptMetadata } from "../../../prompts/definitions/app-summaries";
import { logOneLineWarning } from "../../../common/utils/logging";
import { joinArrayWithSeparators } from "../../../common/utils/text-utils";
import { renderPrompt } from "../../../prompts/prompt-renderer";
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
 * The return type is PartialAppSummaryRecord, which is compatible with all category response schemas.
 * Type inference is preserved through the call chain: the return type is inferred from the schema
 * via executeCompletion overloads, ensuring strong typing without unsafe casts.
 *
 * @param llmRouter The LLM router instance
 * @param category The app summary category
 * @param sourceFileSummaries Array of source file summaries to analyze
 * @param options Optional configuration for the completion
 * @returns The generated insights as PartialAppSummaryRecord or null if generation failed
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
    const renderParams: Record<string, unknown> = {
      content: codeContent,
    };
    if (options.partialAnalysisNote) renderParams.partialAnalysisNote = options.partialAnalysisNote;
    const renderedPrompt = renderPrompt(config, renderParams);
    // Type is inferred from the schema via executeCompletion overloads
    // The overload provides the specific return type z.infer<typeof config.responseSchema> | null
    // which is compatible with PartialAppSummaryRecord | null in the function's return signature
    // The type assertion is safe because the overload guarantees the return type matches the schema
    const llmResponse: unknown = await llmRouter.executeCompletion(taskCategory, renderedPrompt, {
      outputFormat: LLMOutputFormat.JSON,
      jsonSchema: config.responseSchema,
      hasComplexSchema: !CATEGORY_SCHEMA_IS_VERTEXAI_COMPATIBLE,
    });

    // Type assertion is necessary because the implementation signature returns unknown,
    // but the overload guarantees the correct type. This is safe because all category
    // response types are compatible with PartialAppSummaryRecord
    return llmResponse as PartialAppSummaryRecord | null;
  } catch (error: unknown) {
    logOneLineWarning(
      `${error instanceof Error ? error.message : "Unknown error"} for ${categoryLabel}`,
    );
    return null;
  }
}
