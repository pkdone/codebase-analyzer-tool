/**
 * Shared type definitions for prompt configurations.
 *
 * This module provides base interfaces that establish a common structure
 * for prompt configuration entries across different domains (source files,
 * app summaries, etc.). This reduces duplication while preserving
 * domain-specific extensions.
 */

import type { z } from "zod";
import type { JSONSchemaPromptConfig } from "../../common/prompts";

/**
 * Base configuration interface for prompt definitions.
 * Contains the common fields shared by both source and app summary prompts.
 *
 * Derived from JSONSchemaPromptConfig by omitting personaIntroduction,
 * which is a global constant applied by the prompt builders rather than
 * configured per entry.
 *
 * @template S - The Zod schema type for validating the LLM response. Defaults to z.ZodType<unknown>
 *               for type-safe handling when the generic is not explicitly specified.
 */
export type BasePromptConfigEntry<S extends z.ZodType<unknown> = z.ZodType<unknown>> = Omit<
  JSONSchemaPromptConfig<S>,
  "personaIntroduction"
>;
