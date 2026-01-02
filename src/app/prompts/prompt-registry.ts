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
import { type PromptDefinition } from "./prompt.types";
import { type AppSummaryCategoryEnum } from "../components/insights/insights.types";

/**
 * App summary prompt definitions generated from centralized configuration.
 * These prompts are used to extract high-level insights from file summaries.
 */
const appSummaryPrompts = createPromptMetadata(appSummaryConfigMap, BASE_PROMPT_TEMPLATE, {
  contentDescBuilder: () => "a set of source file summaries",
  instructionsBuilder: (config) => config.instructions,
  dataBlockHeaderBuilder: () => "FILE_SUMMARIES",
  wrapInCodeBlockBuilder: () => false,
});

/**
 * Source file type prompt definitions generated from centralized configuration.
 * These prompts are used to summarize individual source files based on their type.
 */
const sourcePrompts = createPromptMetadata(sourceConfigMap, BASE_PROMPT_TEMPLATE, {
  contentDescBuilder: (config) => `the ${config.contentDesc}`,
  instructionsBuilder: (config) => config.instructions,
  dataBlockHeaderBuilder: () => "CODE",
  wrapInCodeBlockBuilder: () => true,
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
  dataBlockHeader: "CODE",
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
    dataBlockHeader: "FRAGMENTED_DATA",
  });
}

/**
 * Centralized registry of all prompt definitions used throughout the application.
 * This serves as the single source of truth for all prompts, making them easier to
 * find, manage, and reuse.
 *
 * Usage:
 * - `promptRegistry.appSummaries[category]` - App summary prompts for insights
 * - `promptRegistry.sources[fileType]` - Source file type prompts for summarization
 * - `promptRegistry.codebaseQuery` - Query prompt for RAG workflows
 * - `createReduceInsightsPrompt(category, categoryKey, schema)` - Factory for reduce prompts
 */
export const promptRegistry = Object.freeze({
  appSummaries: appSummaryPrompts,
  sources: sourcePrompts,
  codebaseQuery: codebaseQueryPrompt,
} as const);

/**
 * Type for the prompt registry object.
 * Used for dependency injection and type-safe access to prompts.
 */
export type PromptRegistry = typeof promptRegistry;
