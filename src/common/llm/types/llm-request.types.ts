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
 * @template S - The Zod schema type. Defaults to z.ZodType to allow use as a base type
 * for function parameters and type constraints that accept options with any schema.
 */
export interface LLMCompletionOptions<S extends z.ZodType = z.ZodType> {
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
 * Type-safe completion options for JSON output with a schema.
 * Used for discriminated union pattern to enable better type narrowing.
 */
export interface JsonCompletionOptions<
  S extends z.ZodType = z.ZodType,
> extends LLMCompletionOptions<S> {
  outputFormat: LLMOutputFormat.JSON;
  jsonSchema: S;
}

/**
 * Type-safe completion options for TEXT output.
 * Used for discriminated union pattern to enable better type narrowing.
 */
export interface TextCompletionOptions extends Omit<LLMCompletionOptions, "jsonSchema"> {
  outputFormat: LLMOutputFormat.TEXT;
  jsonSchema?: never;
}

/**
 * Type guard to check if options are for JSON output with a schema.
 * Enables TypeScript to narrow the type when checking output format.
 *
 * @param options - The completion options to check
 * @returns True if options specify JSON output with a schema
 *
 * @example
 * ```typescript
 * if (isJsonOptionsWithSchema(options)) {
 *   // TypeScript knows options.jsonSchema exists here
 *   const validated = options.jsonSchema.parse(data);
 * }
 * ```
 */
export function isJsonOptionsWithSchema<S extends z.ZodType>(
  options: LLMCompletionOptions<S> | undefined,
): options is JsonCompletionOptions<S> {
  return (
    options !== undefined &&
    options.outputFormat === LLMOutputFormat.JSON &&
    options.jsonSchema !== undefined
  );
}

/**
 * Type guard to check if options are for TEXT output.
 * Enables TypeScript to narrow the type when checking output format.
 *
 * @param options - The completion options to check
 * @returns True if options specify TEXT output
 *
 * @example
 * ```typescript
 * if (isTextOptions(options)) {
 *   // TypeScript knows this is TEXT output, no schema expected
 *   const result: string = response.generated;
 * }
 * ```
 */
export function isTextOptions(
  options: LLMCompletionOptions | undefined,
): options is TextCompletionOptions {
  return options !== undefined && options.outputFormat === LLMOutputFormat.TEXT;
}

/**
 * Interface to define the context object that is passed to and from the LLM provider
 */
export interface LLMContext {
  /** The resource name being processed */
  resource: string;
  /** The LLM purpose (embeddings or completions) */
  purpose: LLMPurpose;
  /** The model key being used (e.g., "gpt-4o", "bedrock-claude-opus-4.5") */
  modelKey?: string;
  /** The desired output format */
  outputFormat?: LLMOutputFormat;
  /** Error text when JSON parsing / validating fails during response processing */
  responseContentParseError?: string;
}
