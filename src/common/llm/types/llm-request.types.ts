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
 * Interface to define the context object that is passed to and from the LLM provider.
 */
export interface LLMContext {
  /** The resource name being processed */
  resource: string;
  /** The LLM purpose (embeddings or completions) */
  purpose: LLMPurpose;
  /** The model key being used (e.g., "openai-gpt-4o", "bedrock-claude-opus-4.5") */
  modelKey?: string;
  /** The desired output format */
  outputFormat?: LLMOutputFormat;
}
