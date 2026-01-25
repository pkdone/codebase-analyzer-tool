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
 * This interface is designed to be extended by domain-specific configurations
 * that may add additional fields (e.g., dataBlockHeader for app summaries).
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
}
