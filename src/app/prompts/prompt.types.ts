import { z } from "zod";
import { LLMOutputFormat } from "../../common/llm/types/llm.types";

/**
 * Valid values for the data section header in prompt templates.
 * These correspond to the different prompt families we support.
 *
 * Using a const object pattern instead of an enum for:
 * - Consistency with existing codebase patterns (e.g., INSTRUCTION_SECTION_TITLES)
 * - Better tree-shaking and runtime performance
 * - Type safety through derived union type
 */
export const DATA_BLOCK_HEADERS = {
  /** Header for source code analysis prompts */
  CODE: "CODE",
  /** Header for file summary analysis prompts (app summaries) */
  FILE_SUMMARIES: "FILE_SUMMARIES",
  /** Header for reduce insights prompts (consolidating fragmented data) */
  FRAGMENTED_DATA: "FRAGMENTED_DATA",
} as const;

/**
 * Union type derived from DATA_BLOCK_HEADERS values.
 * Provides type safety while allowing the const object to be used for runtime values.
 */
export type DataBlockHeader = (typeof DATA_BLOCK_HEADERS)[keyof typeof DATA_BLOCK_HEADERS];

/**
 * Configuration entry interface for prompt configurations.
 * This interface defines the common structure shared by all prompt config types
 * (SourceConfigEntry, AppSummaryConfigEntry) to ensure consistency and enable
 * generic processing.
 *
 * This type enforces that all essential fields for prompt generation are provided,
 * reducing the need for defensive checks at runtime and improving type safety
 * for downstream consumers.
 *
 * Note: `label` remains optional as it's often derived from the category key
 * or not strictly needed for the prompt itself.
 *
 * @template S - The Zod schema type for validating the LLM response. Defaults to z.ZodType.
 */
export interface PromptConfigEntry<S extends z.ZodType = z.ZodType> {
  /** Optional label for UI display and logging */
  label?: string;
  /** Description of the content being analyzed (required) */
  contentDesc: string;
  /** Array of instruction strings for the LLM (required) */
  instructions: readonly string[];
  /** Zod schema for validating the LLM response (required) */
  responseSchema: S;
  /** Whether the schema is complex and incompatible with some LLM providers */
  hasComplexSchema?: boolean;
}

/**
 * Formal prompt definition interface for consistent structure
 * This enforces a standard shape for prompt configurations across the application.
 *
 * @template S - The Zod schema type for validating the LLM response. Defaults to z.ZodType for backward compatibility.
 */
export interface PromptDefinition<S extends z.ZodType = z.ZodType> {
  /** Description of the content being analyzed (e.g., "JVM code", "a set of source file summaries") */
  contentDesc: string;
  /** Array of instruction strings for the LLM. Instructions can include section titles
   * formatted as "__TITLE__\n- Point 1" for better organization. */
  instructions: readonly string[];
  /** Zod schema for validating the LLM response */
  responseSchema: S;
  /** Optional label for UI display and logging (e.g., "Aggregates", "Java Source") */
  label?: string;
  /** Template string for rendering the prompt */
  template: string;
  /** Header text for the data block section (e.g., "CODE", "FILE_SUMMARIES", "FRAGMENTED_DATA") */
  dataBlockHeader: DataBlockHeader;
  /** Whether to wrap the content in code block markers (```). Defaults to false. */
  wrapInCodeBlock?: boolean;
  /** Output format for the LLM response. Defaults to JSON when undefined. */
  outputFormat?: LLMOutputFormat;
}
