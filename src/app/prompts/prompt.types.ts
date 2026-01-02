import { z } from "zod";
import { LLMOutputFormat } from "../../common/llm/types/llm.types";

/**
 * Valid values for the data section header in prompt templates.
 * These correspond to the different prompt families we support.
 */
export type DataBlockHeader = "CODE" | "FILE_SUMMARIES" | "FRAGMENTED_DATA";

/**
 * Base configuration entry interface for prompt configurations.
 * This interface defines the common structure shared by all prompt config types
 * (SourceConfigEntry, AppSummaryConfigEntry) to ensure consistency and enable
 * generic processing.
 *
 * All fields are optional at this base level, allowing flexibility for different
 * config types to make specific fields required as needed.
 *
 * @template S - The Zod schema type for validating the LLM response. Defaults to z.ZodType.
 */
export interface BasePromptConfigEntry<S extends z.ZodType = z.ZodType> {
  /** Optional label for UI display and logging */
  label?: string;
  /** Optional description of the content being analyzed */
  contentDesc?: string;
  /** Optional array of instruction strings for the LLM (defaults to empty array in factory) */
  instructions?: readonly string[];
  /** Optional Zod schema for validating the LLM response */
  responseSchema?: S;
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
  /** Whether the schema is complex and incompatible with some LLM providers */
  hasComplexSchema?: boolean;
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
