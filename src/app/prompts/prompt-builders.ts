/**
 * Centralized prompt builder functions for creating LLM prompts.
 *
 * This module provides a clean API for creating prompts without requiring consumers
 * to know about the underlying prompt configuration details like persona introductions
 * and data block headers. Each builder encapsulates the prompt construction logic
 * for its specific domain (source files vs app summaries).
 */

import { fillPrompt } from "type-safe-prompt";
import type { z } from "zod";
import {
  JSONSchemaPrompt,
  type JSONSchemaPromptConfig,
  type GeneratedPrompt,
} from "../../common/prompts";
import { type FileTypePromptRegistry } from "./sources/sources.definitions";
import { type AppSummaryConfigMap } from "./app-summaries/app-summaries.definitions";
import { buildReduceInsightsContentDesc } from "./app-summaries/app-summaries.constants";
import type { CanonicalFileType } from "../schemas/canonical-file-types";
import {
  DEFAULT_PERSONA_INTRODUCTION,
  CODE_DATA_BLOCK_HEADER,
  FRAGMENTED_DATA_BLOCK_HEADER,
  CODEBASE_QUERY_TEMPLATE,
} from "./prompts.constants";

/**
 * Type alias for source prompt results.
 * Uses the common GeneratedPrompt type with source-specific schema and required metadata.
 */
export type SourcePromptResult = GeneratedPrompt<
  FileTypePromptRegistry[CanonicalFileType]["responseSchema"]
> &
  Required<Pick<GeneratedPrompt, "metadata">>;

/**
 * Type alias for insight prompt results.
 * Uses the common GeneratedPrompt type with category-specific schema.
 *
 * @template C - The specific category type from AppSummaryConfigMap
 */
export type InsightPromptResult<C extends keyof AppSummaryConfigMap> = GeneratedPrompt<
  AppSummaryConfigMap[C]["responseSchema"]
>;

/**
 * Type alias for reduce prompt results.
 * Uses the common GeneratedPrompt type with the provided schema.
 *
 * @template S - The Zod schema type for validating the LLM response
 */
export type ReducePromptResult<S extends z.ZodType> = GeneratedPrompt<S>;

/**
 * Options for building an insight prompt.
 */
export interface InsightPromptOptions {
  /**
   * Whether this prompt is for partial/chunked analysis in map-reduce workflows.
   * When true, a note is prepended indicating this is a partial analysis.
   */
  forPartialAnalysis?: boolean;
}

/**
 * Builds a contextual note for partial/chunked analysis prompts.
 * This function constructs a standardized note that indicates to the LLM
 * that the current content is a subset of a larger analysis.
 *
 * @param dataBlockHeader - The data block header (e.g., "FILE_SUMMARIES")
 * @returns A formatted note string with trailing newlines for prompt formatting
 */
function buildPartialAnalysisNote(dataBlockHeader: string): string {
  const formattedHeader = dataBlockHeader.toLowerCase().replace(/_/g, " ");
  return `Note, this is a partial analysis of what is a much larger set of ${formattedHeader}; focus on extracting insights from this subset of ${formattedHeader} only.\n\n`;
}

/**
 * Builds a prompt for analyzing source code files.
 *
 * This function encapsulates the prompt construction logic for source file analysis,
 * combining the file type configuration with standard presentation fields.
 *
 * @param fileTypePromptRegistry - The registry containing prompt configurations for each file type
 * @param canonicalFileType - The canonical file type to build a prompt for
 * @param content - The source file content to analyze
 * @returns The built prompt with metadata for LLM execution
 *
 * @example
 * ```typescript
 * const result = buildSourcePrompt(registry, "java", sourceCode);
 * const llmResponse = await llmRouter.executeCompletion(filepath, result.prompt, {
 *   outputFormat: LLMOutputFormat.JSON,
 *   jsonSchema: result.schema,
 *   hasComplexSchema: result.metadata.hasComplexSchema,
 * });
 * ```
 */
export function buildSourcePrompt(
  fileTypePromptRegistry: FileTypePromptRegistry,
  canonicalFileType: CanonicalFileType,
  content: string,
): SourcePromptResult {
  const config = fileTypePromptRegistry[canonicalFileType];
  const promptGenerator = new JSONSchemaPrompt({
    personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
    ...config,
    dataBlockHeader: CODE_DATA_BLOCK_HEADER,
    wrapInCodeBlock: true,
  } as JSONSchemaPromptConfig);
  const hasComplexSchema = "hasComplexSchema" in config && Boolean(config.hasComplexSchema);
  return {
    prompt: promptGenerator.renderPrompt(content),
    schema: config.responseSchema,
    metadata: { hasComplexSchema },
  };
}

/**
 * Builds a prompt for generating app-level insights from source file summaries.
 *
 * This function encapsulates the prompt construction logic for insight generation,
 * using the self-describing configuration from the provided config map.
 *
 * @template C - The specific category type (inferred from the category parameter)
 * @param configMap - The app summary configuration map containing prompt definitions
 * @param category - The app summary category to build a prompt for
 * @param content - The joined source file summaries to analyze
 * @param options - Optional configuration for the prompt
 * @returns The built prompt with metadata for LLM execution
 *
 * @example
 * ```typescript
 * import { appSummaryConfigMap } from "./app-summaries/app-summaries.definitions";
 * const result = buildInsightPrompt(appSummaryConfigMap, "technologies", joinedSummaries);
 * const llmResponse = await llmRouter.executeCompletion(category, result.prompt, {
 *   outputFormat: LLMOutputFormat.JSON,
 *   jsonSchema: result.schema,
 * });
 * ```
 */
export function buildInsightPrompt<C extends keyof AppSummaryConfigMap>(
  configMap: AppSummaryConfigMap,
  category: C,
  content: string,
  options?: InsightPromptOptions,
): InsightPromptResult<C> {
  const config = configMap[category];
  const contextNote = options?.forPartialAnalysis
    ? buildPartialAnalysisNote(config.dataBlockHeader)
    : undefined;
  const promptGenerator = new JSONSchemaPrompt({
    personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
    contentDesc: config.contentDesc,
    instructions: config.instructions,
    responseSchema: config.responseSchema,
    dataBlockHeader: config.dataBlockHeader,
    wrapInCodeBlock: false,
    contextNote,
  });
  return {
    prompt: promptGenerator.renderPrompt(content),
    schema: config.responseSchema,
  };
}

/**
 * Builds a prompt for the Reduce phase of map-reduce insight generation.
 *
 * This function creates a prompt that instructs the LLM to consolidate multiple
 * partial insight results into a single, de-duplicated, coherent final result.
 *
 * @template S - The Zod schema type for validating the LLM response
 * @param categoryKey - The key name for the category being reduced (e.g., "technologies")
 * @param content - The JSON stringified combined data from partial results
 * @param schema - The Zod schema for validating the consolidated response
 * @returns The built prompt with metadata for LLM execution
 *
 * @example
 * ```typescript
 * const combinedData = JSON.stringify(partialResults, null, 2);
 * const result = buildReducePrompt("technologies", combinedData, technologiesSchema);
 * const llmResponse = await llmRouter.executeCompletion("technologies-reduce", result.prompt, {
 *   outputFormat: LLMOutputFormat.JSON,
 *   jsonSchema: result.schema,
 * });
 * ```
 */
export function buildReducePrompt<S extends z.ZodType>(
  categoryKey: string,
  content: string,
  schema: S,
): ReducePromptResult<S> {
  const promptGenerator = new JSONSchemaPrompt({
    personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
    contentDesc: buildReduceInsightsContentDesc(categoryKey),
    instructions: [`* A consolidated list of '${categoryKey}'`],
    responseSchema: schema,
    dataBlockHeader: FRAGMENTED_DATA_BLOCK_HEADER,
    wrapInCodeBlock: false,
  });
  return {
    prompt: promptGenerator.renderPrompt(content),
    schema,
  };
}

/**
 * Builds a prompt for querying the codebase with a specific question.
 *
 * This function creates a RAG-style prompt that provides code context from vector
 * search results and asks the LLM to answer a developer's question about the code.
 *
 * @param question - The developer's question about the code
 * @param codeContent - The formatted code content from vector search results
 * @returns The fully rendered prompt string ready for LLM submission
 *
 * @example
 * ```typescript
 * const codeContent = formatSourcesForPrompt(vectorSearchResults);
 * const prompt = buildQueryPrompt("How does authentication work?", codeContent);
 * const result = await llmRouter.executeCompletion("Codebase query", prompt, {
 *   outputFormat: LLMOutputFormat.TEXT,
 * });
 * ```
 */
export function buildQueryPrompt(question: string, codeContent: string): string {
  return fillPrompt(CODEBASE_QUERY_TEMPLATE, {
    personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
    question,
    content: codeContent,
  });
}
