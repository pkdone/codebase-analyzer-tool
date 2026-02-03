/**
 * Shared type definitions for prompt configurations.
 *
 * This module provides base interfaces that establish a common structure
 * for prompt configuration entries across different domains (source files,
 * app summaries, etc.). This reduces duplication while preserving
 * domain-specific extensions.
 */

import type { z } from "zod";

/**
 * Base configuration interface for prompt definitions.
 * Contains the common fields shared by both source and app summary prompts.
 *
 * This interface provides a self-describing configuration that includes both
 * the logical prompt definition (content, instructions, schema) and the
 * presentation configuration (data block header, code block wrapping).
 *
 * @template S - The Zod schema type for validating the LLM response. Defaults to z.ZodType<unknown>
 *               for type-safe handling when the generic is not explicitly specified.
 */
export interface BasePromptConfigEntry<S extends z.ZodType<unknown> = z.ZodType<unknown>> {
  /** Description of the content being analyzed */
  readonly contentDesc: string;
  /** Array of instruction strings for the LLM */
  readonly instructions: readonly string[];
  /** Zod schema for validating the LLM response */
  readonly responseSchema: S;
  /**
   * Whether the schema is complex and potentially incompatible with some
   * LLM providers' strict JSON mode (e.g., discriminated unions, recursive types).
   * Defaults to false if not specified.
   */
  readonly hasComplexSchema?: boolean;
  /** The data block header to use in the template (e.g., "CODE", "FILE_SUMMARIES") */
  readonly dataBlockHeader: string;
  /** Whether to wrap content in markdown code blocks */
  readonly wrapInCodeBlock: boolean;
  /**
   * Optional contextual note prepended before the schema section.
   * Used for runtime-computed notes like partial analysis indicators.
   */
  readonly contextNote?: string;
}
