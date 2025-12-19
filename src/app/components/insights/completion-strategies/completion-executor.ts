import { z } from "zod";
import LLMRouter from "../../../../common/llm/llm-router";
import { LLMOutputFormat } from "../../../../common/llm/types/llm.types";
import { appSummaryPromptMetadata } from "../../../prompts/definitions/app-summaries";
import { logOneLineWarning } from "../../../../common/utils/logging";
import { joinArrayWithSeparators } from "../../../../common/utils/text-utils";
import { renderPrompt } from "../../../prompts/prompt-renderer";
import {
  AppSummaryCategoryEnum,
  appSummaryCategorySchemas,
  type AppSummaryCategorySchemas,
} from "../insights.types";
import { getSchemaSpecificSanitizerConfig } from "../../../prompts/config/schema-specific-sanitizer.config";

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
 * The function is generic over the category type, enabling TypeScript to infer the correct
 * return type from the category's schema. This eliminates the need for unsafe type casts
 * by using the strongly-typed `appSummaryCategorySchemas` mapping.
 *
 * @template C - The specific category type (inferred from the category parameter)
 * @param llmRouter The LLM router instance
 * @param category The app summary category
 * @param sourceFileSummaries Array of source file summaries to analyze
 * @param options Optional configuration for the completion
 * @returns The generated insights with category-specific typing, or null if generation failed
 */
export async function executeInsightCompletion<C extends AppSummaryCategoryEnum>(
  llmRouter: LLMRouter,
  category: C,
  sourceFileSummaries: string[],
  options: InsightCompletionOptions = {},
): Promise<z.infer<AppSummaryCategorySchemas[C]> | null> {
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

    // Use strongly-typed schema lookup for type-safe return type inference.
    // The function overloads in LLMRouter.executeCompletion() ensure proper type inference.
    // TypeScript's limitation with generic indexed access types (AppSummaryCategorySchemas[C])
    // prevents full compile-time verification, but runtime type safety is guaranteed by Zod
    // schema validation in the LLM pipeline.
    const schema: z.ZodType = appSummaryCategorySchemas[category];
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- TypeScript cannot fully narrow generic indexed access types at compile time; runtime safety guaranteed by Zod validation
    const result = await llmRouter.executeCompletion(taskCategory, renderedPrompt, {
      outputFormat: LLMOutputFormat.JSON,
      jsonSchema: schema,
      hasComplexSchema: !CATEGORY_SCHEMA_IS_VERTEXAI_COMPATIBLE,
      sanitizerConfig: getSchemaSpecificSanitizerConfig(),
    });
    return result as z.infer<AppSummaryCategorySchemas[C]> | null;
  } catch (error: unknown) {
    logOneLineWarning(
      `${error instanceof Error ? error.message : "Unknown error"} for ${categoryLabel}`,
    );
    return null;
  }
}
