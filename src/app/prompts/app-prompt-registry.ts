/**
 * Centralized prompt registry for the application.
 *
 * This module assembles all prompt definitions using the common prompt infrastructure
 * and application-specific configurations.
 */

import { z } from "zod";
import { createPromptMetadata } from "../../common/prompts/prompt-factory";
import { LLMOutputFormat } from "../../common/prompts/prompt.types";
import { appSummaryConfigMap } from "./definitions/app-summaries/app-summaries.definitions";
import { fileTypePromptRegistry } from "./definitions/sources/sources.definitions";
import { ANALYSIS_PROMPT_TEMPLATE, CODEBASE_QUERY_TEMPLATE } from "./app-templates";
import type { RenderablePrompt } from "../../common/prompts/prompt.types";

/**
 * Source file type prompt definitions generated from centralized configuration.
 * These prompts are used to summarize individual source files based on their type.
 */
const sourcePrompts = createPromptMetadata(fileTypePromptRegistry, ANALYSIS_PROMPT_TEMPLATE);

/**
 * App summary prompt definitions generated from centralized configuration.
 * These prompts are used to extract high-level insights from file summaries.
 */
const appSummaryPrompts = createPromptMetadata(appSummaryConfigMap, ANALYSIS_PROMPT_TEMPLATE);

/**
 * Prompt definition for codebase queries.
 * Used for RAG workflows where vector search results are provided as context
 * for answering developer questions about the codebase.
 *
 * This is a TEXT-mode prompt that returns plain text responses without JSON validation.
 */
const codebaseQueryPrompt: RenderablePrompt<z.ZodString> = {
  label: "Codebase Query",
  contentDesc: "source code files",
  instructions: [],
  template: CODEBASE_QUERY_TEMPLATE,
  dataBlockHeader: "CODE",
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
