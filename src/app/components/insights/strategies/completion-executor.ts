import { z } from "zod";
import LLMRouter from "../../../../common/llm/llm-router";
import { LLMOutputFormat } from "../../../../common/llm/types/llm.types";
import { promptManager } from "../../../prompts/prompt-registry";
import { logOneLineWarning } from "../../../../common/utils/logging";
import { joinArrayWithSeparators } from "../../../../common/utils/text-utils";
import { renderPrompt } from "../../../prompts/prompt-renderer";
import {
  AppSummaryCategoryEnum,
  appSummaryCategorySchemas,
  type AppSummaryCategorySchemas,
} from "../insights.types";
import { getLlmArtifactCorrections } from "../../../config/llm-artifact-corrections";
import { isOk } from "../../../../common/types/result.types";

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
  sourceFileSummaries: readonly string[],
  options: InsightCompletionOptions = {},
): Promise<z.infer<AppSummaryCategorySchemas[C]> | null> {
  const categoryLabel = promptManager.appSummaries[category].label ?? category;
  const taskCategory: string = options.taskCategory ?? category;

  try {
    const config = promptManager.appSummaries[category];
    const codeContent = joinArrayWithSeparators(sourceFileSummaries);
    const renderParams: Record<string, unknown> = {
      content: codeContent,
    };
    if (options.partialAnalysisNote) renderParams.partialAnalysisNote = options.partialAnalysisNote;
    const renderedPrompt = renderPrompt(config, renderParams);

    /**
     * Schema lookup uses the category type to get the correct schema.
     *
     * TYPE ASSERTION RATIONALE:
     * Although `appSummaryCategorySchemas` is defined with `as const` to preserve specific
     * schema types, TypeScript cannot infer through the dynamic lookup when `category`
     * is a generic parameter `C extends AppSummaryCategoryEnum`. The compiler sees the
     * lookup result as the union of all possible schemas, not the specific schema for C.
     *
     * This assertion to `z.infer<AppSummaryCategorySchemas[C]> | null` is TYPE-SAFE because:
     * 1. The AppSummaryCategorySchemas type maps each category key to its exact schema.
     * 2. The generic parameter C is constrained to valid category keys.
     * 3. The runtime lookup `appSummaryCategorySchemas[category]` returns the exact
     *    schema corresponding to C, and the LLM router validates against it.
     * 4. The return type declaration `z.infer<AppSummaryCategorySchemas[C]>` matches
     *    exactly what the schema will validate.
     *
     * This is a TypeScript limitation with indexed access on generic parameters,
     * not a design flaw. The types are correct; the compiler just cannot prove it.
     */
    const schema = appSummaryCategorySchemas[category];
    const result = await llmRouter.executeCompletion(taskCategory, renderedPrompt, {
      outputFormat: LLMOutputFormat.JSON,
      jsonSchema: schema,
      hasComplexSchema: !CATEGORY_SCHEMA_IS_VERTEXAI_COMPATIBLE,
      sanitizerConfig: getLlmArtifactCorrections(),
    });

    if (!isOk(result)) {
      logOneLineWarning(`LLM completion failed for ${categoryLabel}: ${result.error.message}`);
      return null;
    }

    return result.value as z.infer<AppSummaryCategorySchemas[C]>;
  } catch (error: unknown) {
    logOneLineWarning(
      `${error instanceof Error ? error.message : "Unknown error"} for ${categoryLabel}`,
    );
    return null;
  }
}
