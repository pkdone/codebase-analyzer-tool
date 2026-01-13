import { z } from "zod";
import { appSummaryConfigMap } from "./definitions/app-summaries/app-summaries.definitions";
import { fileTypePromptRegistry } from "./definitions/sources/sources.definitions";
import { BASE_PROMPT_TEMPLATE, CODEBASE_QUERY_TEMPLATE } from "./templates";
import { DATA_BLOCK_HEADERS, type PromptDefinition, type PromptConfigEntry } from "./prompt.types";
import { LLMOutputFormat } from "../../common/llm/types/llm.types";

/**
 * Helper type to extract the schema type from a config entry.
 * Returns z.ZodType if responseSchema is undefined.
 */
type ExtractSchemaType<T> = T extends { responseSchema: infer S extends z.ZodType } ? S : z.ZodType;

/**
 * Mapped type that transforms a config map into a record of PromptDefinitions
 * while preserving the specific schema type for each key.
 */
type PromptMetadataResult<TConfigMap extends Record<string, PromptConfigEntry>> = {
  [K in keyof TConfigMap]: PromptDefinition<ExtractSchemaType<TConfigMap[K]>>;
};

/**
 * Generic factory function to create prompt metadata from a configuration map.
 * This eliminates duplication between sources and app-summaries prompt generation.
 *
 * The return type uses a mapped type (PromptMetadataResult) to preserve the specific
 * schema type for each key in the config map. This enables better type inference
 * for downstream consumers when accessing prompt definitions by key.
 *
 * This factory is a pure data mapper that transforms config entries into PromptDefinition
 * objects. All config entries must provide dataBlockHeader and wrapInCodeBlock values.
 *
 * @param configMap - The configuration map (e.g., fileTypePromptRegistry, appSummaryConfigMap)
 * @param template - The template string to use for all prompts
 * @returns A record mapping keys to PromptDefinition objects with preserved schema types
 */
export function createPromptMetadata<TConfigMap extends Record<string, PromptConfigEntry>>(
  configMap: TConfigMap,
  template: string,
): PromptMetadataResult<TConfigMap> {
  return Object.fromEntries(
    Object.entries(configMap).map(([key, config]) => {
      const typedConfig = config as TConfigMap[keyof TConfigMap];
      const definition: PromptDefinition = {
        label: typedConfig.label,
        contentDesc: typedConfig.contentDesc,
        responseSchema: typedConfig.responseSchema,
        template,
        instructions: typedConfig.instructions,
        dataBlockHeader: typedConfig.dataBlockHeader,
        wrapInCodeBlock: typedConfig.wrapInCodeBlock,
      };
      return [key, definition];
    }),
  ) as PromptMetadataResult<TConfigMap>;
}

/**
 * App summary prompt definitions generated from centralized configuration.
 * These prompts are used to extract high-level insights from file summaries.
 */
const appSummaryPrompts = createPromptMetadata(appSummaryConfigMap, BASE_PROMPT_TEMPLATE);

/**
 * Source file type prompt definitions generated from centralized configuration.
 * These prompts are used to summarize individual source files based on their type.
 */
const sourcePrompts = createPromptMetadata(fileTypePromptRegistry, BASE_PROMPT_TEMPLATE);

/**
 * Prompt definition for codebase queries.
 * Used for RAG workflows where vector search results are provided as context
 * for answering developer questions about the codebase.
 *
 * This is a TEXT-mode prompt that returns plain text responses without JSON validation.
 */
const codebaseQueryPrompt: PromptDefinition<z.ZodString> = {
  label: "Codebase Query",
  contentDesc: "source code files",
  instructions: [],
  template: CODEBASE_QUERY_TEMPLATE,
  dataBlockHeader: DATA_BLOCK_HEADERS.CODE,
  wrapInCodeBlock: false,
  responseSchema: z.string(),
  outputFormat: LLMOutputFormat.TEXT,
};

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
