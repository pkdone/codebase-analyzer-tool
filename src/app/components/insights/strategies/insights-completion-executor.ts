import { z } from "zod";
import LLMRouter from "../../../../common/llm/llm-router";
import { LLMOutputFormat } from "../../../../common/llm/types/llm.types";
import {
  JSONSchemaPrompt,
  type JSONSchemaPromptConfig,
} from "../../../../common/prompts/json-schema-prompt";
import { DEFAULT_PERSONA_INTRODUCTION } from "../../../prompts/prompt.config";
import {
  appSummaryConfigMap,
  FILE_SUMMARIES_DATA_BLOCK_HEADER,
  APP_SUMMARY_CONTENT_DESC,
} from "../../../prompts/app-summaries/app-summaries.definitions";
import { getCategoryLabel } from "../../../config/category-labels.config";
import { logWarn } from "../../../../common/utils/logging";
import { joinArrayWithSeparators } from "../../../../common/utils/text-utils";
import {
  AppSummaryCategoryEnum,
  appSummaryCategorySchemas,
  type AppSummaryCategorySchemas,
} from "../insights.types";
import { getLlmArtifactCorrections } from "../../../config/llm-artifact-corrections";
import { isOk } from "../../../../common/types/result.types";
import { insightsConfig } from "../insights.config";

/**
 * Options for executing insight completion.
 */
export interface InsightCompletionOptions {
  /** Whether this is a partial analysis in map-reduce workflows */
  forPartialAnalysis?: boolean;
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
 * @param options Configuration for the completion (optional)
 * @returns The generated insights with category-specific typing, or null if generation failed
 */
export async function executeInsightCompletion<C extends AppSummaryCategoryEnum>(
  llmRouter: LLMRouter,
  category: C,
  sourceFileSummaries: readonly string[],
  options?: InsightCompletionOptions,
): Promise<z.infer<AppSummaryCategorySchemas[C]> | null> {
  const categoryLabel = getCategoryLabel(category);

  try {
    const taskCategory: string = options?.taskCategory ?? category;
    const config = appSummaryConfigMap[category];
    const codeContent = joinArrayWithSeparators(sourceFileSummaries);
    /**
     * TYPE ASSERTION RATIONALE:
     * The config from appSummaryConfigMap is a partial config (without presentation fields).
     * We add personaIntroduction, contentDesc, dataBlockHeader, and wrapInCodeBlock
     * at instantiation time per our architecture.
     * TypeScript can't infer the combined type through the generic lookup, so we assert.
     */
    const promptGenerator = new JSONSchemaPrompt({
      personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
      ...config,
      contentDesc: APP_SUMMARY_CONTENT_DESC,
      dataBlockHeader: FILE_SUMMARIES_DATA_BLOCK_HEADER,
      wrapInCodeBlock: false,
      forPartialAnalysis: options?.forPartialAnalysis,
    } as JSONSchemaPromptConfig);
    const renderedPrompt = promptGenerator.renderPrompt(codeContent);
    const schema = appSummaryCategorySchemas[category];
    const result = await llmRouter.executeCompletion(taskCategory, renderedPrompt, {
      outputFormat: LLMOutputFormat.JSON,
      jsonSchema: schema,
      hasComplexSchema: insightsConfig.IS_COMPLEX_SCHEMA,
      sanitizerConfig: getLlmArtifactCorrections(),
    });

    if (!isOk(result)) {
      logWarn(`LLM completion failed for ${categoryLabel}: ${result.error.message}`);
      return null;
    }

    return result.value as z.infer<AppSummaryCategorySchemas[C]>;
  } catch (error: unknown) {
    logWarn(`${error instanceof Error ? error.message : "Unknown error"} for ${categoryLabel}`);
    return null;
  }
}
