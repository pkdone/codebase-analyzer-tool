import { z } from "zod";
import { appSummaryConfigMap } from "./definitions/app-summaries/app-summaries.config";
import { sourceConfigMap } from "./definitions/sources/sources.config";
import { BASE_PROMPT_TEMPLATE, CODEBASE_QUERY_TEMPLATE } from "./templates";
import { createPromptMetadata } from "./definitions/prompt-factory";
import { type PromptDefinition } from "./prompt.types";
import { sourceSummarySchema } from "../schemas/sources.schema";

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
const sourcePrompts = createPromptMetadata(
  sourceConfigMap as Record<
    keyof typeof sourceConfigMap,
    { label?: string; responseSchema?: z.ZodType }
  >,
  BASE_PROMPT_TEMPLATE,
  {
    schemaBuilder: (config) => {
      // Cast config to access schemaFields property
      const sourceConfig = config as (typeof sourceConfigMap)[keyof typeof sourceConfigMap];
      // Dynamically pick fields from the master schema
      const schemaFields = sourceConfig.schemaFields.reduce<Record<string, true>>((acc, field) => {
        acc[field] = true;
        return acc;
      }, {});
      return sourceSummarySchema.pick(
        schemaFields as Parameters<typeof sourceSummarySchema.pick>[0],
      );
    },
    contentDescBuilder: (config) => {
      const sourceConfig = config as (typeof sourceConfigMap)[keyof typeof sourceConfigMap];
      return `the ${sourceConfig.contentDesc}`;
    },
    instructionsBuilder: (config) => {
      const sourceConfig = config as (typeof sourceConfigMap)[keyof typeof sourceConfigMap];
      return sourceConfig.instructions;
    },
    dataBlockHeaderBuilder: () => "CODE",
    wrapInCodeBlockBuilder: () => true,
  },
);

// Set hasComplexSchema for all source file types (defaults to true when undefined)
Object.values(sourcePrompts).forEach((metadata) => {
  metadata.hasComplexSchema ??= true;
});

/**
 * Prompt definition for codebase queries.
 * Used for RAG workflows where vector search results are provided as context
 * for answering developer questions about the codebase.
 */
const codebaseQueryPrompt: PromptDefinition = {
  label: "Codebase Query",
  contentDesc: "source code files",
  instructions: [],
  responseSchema: z.string(),
  template: CODEBASE_QUERY_TEMPLATE,
  dataBlockHeader: "CODE",
  wrapInCodeBlock: false,
};

/**
 * Static prompt definition for reducing insights in the map-reduce strategy.
 * This prompt consolidates partial insights from multiple chunks into a single result.
 *
 * The contentDesc uses a {{categoryKey}} placeholder that will be filled at render time.
 * The schema is generic (z.unknown()) and should be overridden at render time with the
 * specific category schema using the renderPrompt options parameter.
 */
const reduceInsightsPrompt: PromptDefinition = {
  label: "Reduce Insights",
  contentDesc:
    "several JSON objects, each containing a list of '{{categoryKey}}' generated from different parts of a codebase. Your task is to consolidate these lists into a single, de-duplicated, and coherent final JSON object. Merge similar items, remove duplicates based on semantic similarity (not just exact name matches), and ensure the final list is comprehensive and well-organized",
  instructions: ["a consolidated list of '{{categoryKey}}'"],
  responseSchema: z.unknown(),
  template: BASE_PROMPT_TEMPLATE,
  dataBlockHeader: "FRAGMENTED_DATA",
  wrapInCodeBlock: false,
};

/**
 * Centralized registry of all prompt definitions used throughout the application.
 * This serves as the single source of truth for all prompts, making them easier to
 * find, manage, and reuse.
 *
 * Usage:
 * - `promptRegistry.appSummaries[category]` - App summary prompts for insights
 * - `promptRegistry.sources[fileType]` - Source file type prompts for summarization
 * - `promptRegistry.codebaseQuery` - Query prompt for RAG workflows
 * - `promptRegistry.reduceInsights` - Reduce prompt for map-reduce strategy
 */
export const promptRegistry = Object.freeze({
  appSummaries: appSummaryPrompts,
  sources: sourcePrompts,
  codebaseQuery: codebaseQueryPrompt,
  reduceInsights: reduceInsightsPrompt,
} as const);
