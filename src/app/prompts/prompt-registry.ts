import { z } from "zod";
import { appSummaryConfigMap } from "./definitions/app-summaries/app-summaries.definitions";
import { buildReduceInsightsContentDesc } from "./definitions/app-summaries/app-summaries.fragments";
import { sourceConfigMap } from "./definitions/sources/sources.definitions";
import { BASE_PROMPT_TEMPLATE, CODEBASE_QUERY_TEMPLATE } from "./templates";
import {
  createPromptMetadata,
  createTextPromptDefinition,
  createJsonPromptDefinition,
} from "./definitions/prompt-factory";
import { type PromptDefinition, DATA_BLOCK_HEADERS } from "./prompt.types";
import { type AppSummaryCategoryEnum } from "../components/insights/insights.types";

/**
 * App summary prompt definitions generated from centralized configuration.
 * These prompts are used to extract high-level insights from file summaries.
 *
 * Note: contentDesc and instructions are read directly from the config entries.
 */
const appSummaryPrompts = createPromptMetadata(appSummaryConfigMap, BASE_PROMPT_TEMPLATE, {
  dataBlockHeader: DATA_BLOCK_HEADERS.FILE_SUMMARIES,
  wrapInCodeBlock: false,
});

/**
 * Source file type prompt definitions generated from centralized configuration.
 * These prompts are used to summarize individual source files based on their type.
 *
 * Note: contentDesc (with "the " prefix) and instructions are read directly from config entries.
 */
const sourcePrompts = createPromptMetadata(sourceConfigMap, BASE_PROMPT_TEMPLATE, {
  dataBlockHeader: DATA_BLOCK_HEADERS.CODE,
  wrapInCodeBlock: true,
});

// Set hasComplexSchema for all source file types (defaults to true when undefined)
Object.values(sourcePrompts).forEach((metadata) => {
  metadata.hasComplexSchema ??= true;
});

/**
 * Prompt definition for codebase queries.
 * Used for RAG workflows where vector search results are provided as context
 * for answering developer questions about the codebase.
 *
 * This is a TEXT-mode prompt that returns plain text responses without JSON validation.
 */
const codebaseQueryPrompt = createTextPromptDefinition({
  label: "Codebase Query",
  contentDesc: "source code files",
  instructions: [],
  template: CODEBASE_QUERY_TEMPLATE,
  dataBlockHeader: DATA_BLOCK_HEADERS.CODE,
  wrapInCodeBlock: false,
});

/**
 * Factory function to create a fully-typed prompt definition for reducing insights.
 * Uses createJsonPromptDefinition to ensure consistent defaults.
 *
 * @param category - The app summary category being reduced (e.g., "entities", "technologies")
 * @param categoryKey - The key name for the category data (e.g., "entities", "technologies")
 * @param schema - The Zod schema for validating the reduced result
 * @returns A fully-typed PromptDefinition with the correct schema
 *
 * @example
 * ```typescript
 * const schema = appSummaryCategorySchemas["entities"];
 * const reducePrompt = createReduceInsightsPrompt("entities", "entities", schema);
 * const renderedPrompt = renderPrompt(reducePrompt, { content: JSON.stringify(data) });
 * ```
 */
export function createReduceInsightsPrompt(
  _category: AppSummaryCategoryEnum,
  categoryKey: string,
  schema: z.ZodType,
): PromptDefinition {
  return createJsonPromptDefinition({
    label: "Reduce Insights",
    contentDesc: buildReduceInsightsContentDesc(categoryKey),
    instructions: [`a consolidated list of '${categoryKey}'`],
    responseSchema: schema,
    template: BASE_PROMPT_TEMPLATE,
    dataBlockHeader: DATA_BLOCK_HEADERS.FRAGMENTED_DATA,
  });
}

/**
 * Centralized manager for all prompt definitions used throughout the application.
 * This serves as the single source of truth for all prompts, making them easier to
 * find, manage, and reuse. Provides both static prompt definitions and factory
 * functions for dynamic prompt generation.
 *
 * Usage:
 * - `promptManager.appSummaries[category]` - App summary prompts for insights
 * - `promptManager.sources[fileType]` - Source file type prompts for summarization
 * - `promptManager.codebaseQuery` - Query prompt for RAG workflows
 * - `createReduceInsightsPrompt(category, categoryKey, schema)` - Factory for reduce prompts
 */
export const promptManager = Object.freeze({
  appSummaries: appSummaryPrompts,
  sources: sourcePrompts,
  codebaseQuery: codebaseQueryPrompt,
} as const);

/**
 * Type for the prompt manager object.
 * Used for dependency injection and type-safe access to prompts.
 */
export type PromptManager = typeof promptManager;
