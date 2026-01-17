/**
 * Generic prompt types for reusable prompt infrastructure.
 *
 * This module provides base types that can be used across different applications.
 * Application-specific types (like DataBlockHeader with specific values) should
 * extend or constrain these types in the application layer.
 */

import type { z } from "zod";
import { LLMOutputFormat } from "../llm/types/llm.types";

// Re-export LLMOutputFormat for convenience
export { LLMOutputFormat };

/**
 * Configuration for a prompt before it has a template assigned.
 * This interface defines the common structure for all prompt config types
 * to ensure consistency and enable generic processing.
 *
 * All essential fields for prompt generation are required, eliminating the need
 * for defensive checks at runtime and improving type safety for downstream consumers.
 * Factories must explicitly define presentation values (dataBlockHeader, wrapInCodeBlock).
 *
 * Note: `label` remains optional as it's often derived from the category key
 * or not strictly needed for the prompt itself.
 *
 * @template S - The Zod schema type for validating the LLM response. Defaults to z.ZodType.
 */
export interface PromptConfig<S extends z.ZodType = z.ZodType> {
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
  /**
   * The data block header to use in the template (required).
   * Factories must explicitly define their presentation.
   * Applications can constrain this to specific values using branded types or unions.
   */
  dataBlockHeader: string;
  /**
   * Whether to wrap content in code blocks (required).
   * Factories must explicitly define their presentation.
   */
  wrapInCodeBlock: boolean;
}

/**
 * A complete prompt ready for rendering via `renderPrompt()`.
 * This includes the template and all configuration needed to produce the final prompt string.
 *
 * @template S - The Zod schema type for validating the LLM response. Defaults to z.ZodType.
 */
export interface RenderablePrompt<S extends z.ZodType = z.ZodType> {
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
  /** Header text for the data block section (e.g., "CODE", "FILE_SUMMARIES") */
  dataBlockHeader: string;
  /** Whether to wrap the content in code block markers (```) */
  wrapInCodeBlock: boolean;
  /** Output format for the LLM response. Defaults to JSON when undefined. */
  outputFormat?: LLMOutputFormat;
}
