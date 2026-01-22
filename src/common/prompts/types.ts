/**
 * Common type definitions for generated prompts.
 *
 * This module provides generic types for the result of prompt generation,
 * designed to be portable across projects and usable by any prompt-building
 * logic that produces structured output with schema validation.
 */

import type { z } from "zod";

/**
 * Optional metadata that can be attached to a generated prompt.
 * This provides a flexible mechanism for prompt builders to communicate
 * additional context to LLM consumers without modifying the core type.
 *
 * @example
 * ```typescript
 * const metadata: PromptMetadata = {
 *   hasComplexSchema: true,
 *   estimatedTokens: 5000,
 * };
 * ```
 */
export interface PromptMetadata {
  /** Allow additional custom metadata fields */
  readonly [key: string]: unknown;
  /**
   * Whether the schema is complex and potentially incompatible with some
   * LLM providers' strict JSON mode (e.g., discriminated unions, recursive types).
   */
  readonly hasComplexSchema?: boolean;
}

/**
 * Represents the result of generating a text-only prompt (no JSON schema).
 * Used for prompts that expect unstructured text responses from the LLM,
 * such as codebase query prompts.
 *
 * This type provides consistency with GeneratedPrompt for non-structured interactions,
 * enabling uniform handling of all prompt builder outputs.
 *
 * @example
 * ```typescript
 * const result: TextGeneratedPrompt = {
 *   prompt: "Answer this question about the code...",
 * };
 *
 * const llmResponse = await llmRouter.executeCompletion(taskId, result.prompt, {
 *   outputFormat: LLMOutputFormat.TEXT,
 * });
 * ```
 */
export interface TextGeneratedPrompt {
  /** The fully rendered prompt string ready for LLM submission */
  readonly prompt: string;
  /** Optional metadata for LLM provider configuration */
  readonly metadata?: PromptMetadata;
}

/**
 * Represents the result of generating a prompt for LLM submission.
 *
 * This generic type provides a consistent structure for all prompt builder
 * functions, encapsulating the rendered prompt string, the validation schema,
 * and optional metadata for LLM provider configuration.
 *
 * @template S - The Zod schema type for validating the LLM response. Defaults to z.ZodType.
 *
 * @example
 * ```typescript
 * const result: GeneratedPrompt<typeof mySchema> = {
 *   prompt: "Analyze this code...",
 *   schema: mySchema,
 *   metadata: { hasComplexSchema: true },
 * };
 *
 * const llmResponse = await llmRouter.executeCompletion(taskId, result.prompt, {
 *   outputFormat: LLMOutputFormat.JSON,
 *   jsonSchema: result.schema,
 *   hasComplexSchema: result.metadata?.hasComplexSchema,
 * });
 * ```
 */
export interface GeneratedPrompt<S extends z.ZodType = z.ZodType> {
  /** The fully rendered prompt string ready for LLM submission */
  readonly prompt: string;
  /** The Zod schema for validating the LLM response */
  readonly schema: S;
  /**
   * Optional metadata for LLM provider configuration.
   * Use this for flags like `hasComplexSchema` or custom context-specific information.
   */
  readonly metadata?: PromptMetadata;
}
