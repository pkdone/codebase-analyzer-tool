/**
 * LLM request-related types: context, options, and purpose enums.
 */

import { z } from "zod";

/**
 * Enum to define the LLM task type
 */
export const LLMPurpose = {
  EMBEDDINGS: "embeddings",
  COMPLETIONS: "completions",
} as const;
export type LLMPurpose = (typeof LLMPurpose)[keyof typeof LLMPurpose];

/**
 * Enum to define the desired output format for LLM responses
 */
export enum LLMOutputFormat {
  JSON = "json",
  TEXT = "text",
}

/**
 * Interface for LLM completion options that can be passed to control output format.
 * Generic over the schema type to preserve type information through the call chain.
 *
 * @template S - The Zod schema type. Defaults to z.ZodType<unknown> to ensure type-safe
 * handling when the generic is not explicitly specified (forcing consumers to handle
 * the untyped data explicitly rather than defaulting to `any`).
 */
export interface LLMCompletionOptions<S extends z.ZodType<unknown> = z.ZodType<unknown>> {
  /** Desired output format */
  outputFormat: LLMOutputFormat;
  /** Zod schema for structured output providers that support it */
  jsonSchema?: S;
  /** Whether the response is expected to contain code - defaults to true */
  hasComplexSchema?: boolean;
  /** Optional sanitizer configuration for JSON processing (domain-specific) */
  sanitizerConfig?: import("../config/llm-module-config.types").LLMSanitizerConfig;
}

/**
 * Base context for LLM requests before a specific model is selected.
 * Used when initiating a request that may be routed to multiple models via fallback chain.
 */
export interface LLMRequestContext {
  /** The resource name being processed */
  resource: string;
  /** The LLM purpose (embeddings or completions) */
  purpose: LLMPurpose;
  /** The desired output format */
  outputFormat?: LLMOutputFormat;
}

/**
 * Execution context with mandatory model key.
 * Used when executing against a specific model - the modelKey is known and required.
 * This type provides stronger type safety by ensuring modelKey is always present
 * during actual LLM invocation.
 */
export interface LLMExecutionContext extends LLMRequestContext {
  /** The model key being used (e.g., "openai-gpt-4o", "bedrock-claude-opus-4.5") - required for execution */
  modelKey: string;
}

/**
 * Type guard to check if a context is an execution context (has modelKey).
 */
export function isExecutionContext(
  context: LLMRequestContext | LLMExecutionContext,
): context is LLMExecutionContext {
  return "modelKey" in context && typeof context.modelKey === "string";
}

/**
 * Creates an execution context from a request context by adding the model key.
 */
export function toExecutionContext(
  requestContext: LLMRequestContext,
  modelKey: string,
): LLMExecutionContext {
  return {
    ...requestContext,
    modelKey,
  };
}

/**
 * @deprecated Use LLMRequestContext or LLMExecutionContext instead.
 * This type alias is kept for backwards compatibility during migration.
 * LLMContext with optional modelKey - prefer using the specific context types.
 */
export type LLMContext = LLMRequestContext & { modelKey?: string };
