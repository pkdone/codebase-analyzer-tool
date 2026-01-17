/**
 * Centralized prompt registry for the application.
 *
 * This module assembles all prompt definitions using the common prompt infrastructure
 * and application-specific configurations.
 */

import { z } from "zod";
import { Prompt, type PromptConfig } from "../../common/prompts/prompt";
import { appSummaryConfigMap } from "./definitions/app-summaries/app-summaries.definitions";
import { fileTypePromptRegistry } from "./definitions/sources/sources.definitions";
import { ANALYSIS_PROMPT_TEMPLATE, CODEBASE_QUERY_TEMPLATE } from "./app-templates";

/**
 * Helper type to extract the schema type from a config entry.
 * Returns z.ZodType if responseSchema is undefined.
 */
type ExtractSchemaType<T> = T extends { responseSchema: infer S extends z.ZodType } ? S : z.ZodType;

/**
 * Mapped type that transforms a config map into a record of Prompts
 * while preserving the specific schema type for each key.
 */
type PromptMapResult<TConfigMap extends Record<string, PromptConfig>> = {
  [K in keyof TConfigMap]: Prompt<ExtractSchemaType<TConfigMap[K]>>;
};

/**
 * Creates a map of Prompt instances from a configuration map.
 * This helper transforms config entries into Prompt objects with preserved schema types.
 *
 * @param configMap - The configuration map containing prompt config entries
 * @param template - The template string to use for all prompts
 * @returns A record mapping keys to Prompt objects with preserved schema types
 */
function createPromptMap<TConfigMap extends Record<string, PromptConfig>>(
  configMap: TConfigMap,
  template: string,
): PromptMapResult<TConfigMap> {
  return Object.fromEntries(
    Object.entries(configMap).map(([key, config]) => [key, new Prompt(config, template)]),
  ) as PromptMapResult<TConfigMap>;
}

/**
 * Source file type prompt definitions generated from centralized configuration.
 * These prompts are used to summarize individual source files based on their type.
 */
const sourcePrompts = createPromptMap(fileTypePromptRegistry, ANALYSIS_PROMPT_TEMPLATE);

/**
 * App summary prompt definitions generated from centralized configuration.
 * These prompts are used to extract high-level insights from file summaries.
 */
const appSummaryPrompts = createPromptMap(appSummaryConfigMap, ANALYSIS_PROMPT_TEMPLATE);

/**
 * Prompt definition for codebase queries.
 * Used for RAG workflows where vector search results are provided as context
 * for answering developer questions about the codebase.
 *
 * This is a TEXT-mode prompt (no responseSchema) that returns plain text responses.
 */
const codebaseQueryPrompt = new Prompt(
  {
    contentDesc: "source code files",
    instructions: [],
    dataBlockHeader: "CODE",
    wrapInCodeBlock: false,
  },
  CODEBASE_QUERY_TEMPLATE,
);

/**
 * Centralized manager for all prompt definitions used throughout the application.
 * This serves as the single source of truth for all prompts, making them easier to
 * find, manage, and reuse.
 *
 * Usage:
 * - `promptManager.appSummaries[category]` - App summary prompts for insights
 * - `promptManager.sources[fileType]` - Source file type prompts for summarization
 * - `promptManager.codebaseQuery` - Query prompt for RAG workflows
 */
export const appPromptManager = Object.freeze({
  sources: sourcePrompts,
  appSummaries: appSummaryPrompts,
  codebaseQuery: codebaseQueryPrompt,
} as const);

/**
 * Type for the prompt manager object.
 * Used for dependency injection and type-safe access to prompts.
 */
export type AppPromptManager = typeof appPromptManager;
