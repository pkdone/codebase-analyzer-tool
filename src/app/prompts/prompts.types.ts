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
 * that may add additional fields (e.g., hasComplexSchema for sources,
 * dataBlockHeader for app summaries).
 *
 * @template S - The Zod schema type for validating the LLM response.
 */
export interface BasePromptConfigEntry<S extends z.ZodType = z.ZodType> {
  /** Description of the content being analyzed */
  readonly contentDesc: string;
  /** Array of instruction strings for the LLM */
  readonly instructions: readonly string[];
  /** Zod schema for validating the LLM response */
  readonly responseSchema: S;
}
