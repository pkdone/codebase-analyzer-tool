/**
 * LLM response-related types: status, token usage, and generated content.
 */

import { z } from "zod";
import type { LLMContext, LLMCompletionOptions, LLMOutputFormat } from "./llm-request.types";

/**
 * Enum to define the LLM response status
 */
export const LLMResponseStatus = {
  UNKNOWN: "unknown",
  COMPLETED: "completed",
  EXCEEDED: "exceeded",
  OVERLOADED: "overloaded",
  INVALID: "invalid",
  ERRORED: "error",
} as const;
export type LLMResponseStatus = (typeof LLMResponseStatus)[keyof typeof LLMResponseStatus];

/**
 * Type to define the token counts
 */
export interface LLMResponseTokensUsage {
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly maxTotalTokens: number;
}

/** Default value for unknown token counts */
const UNKNOWN_TOKEN_COUNT = -1;

/**
 * Creates a standardized token usage record with consistent defaults.
 * This helper normalizes raw (potentially undefined) token counts into a
 * standardized LLMResponseTokensUsage object, ensuring all providers use
 * the same default value (-1) for unknown token counts.
 *
 * @param promptTokens - Number of tokens in the prompt (default: -1)
 * @param completionTokens - Number of tokens in the completion (default: -1)
 * @param maxTotalTokens - Maximum total tokens allowed (default: -1)
 * @returns A standardized LLMResponseTokensUsage object
 */
export function createTokenUsageRecord(
  promptTokens?: number,
  completionTokens?: number,
  maxTotalTokens?: number,
): LLMResponseTokensUsage {
  return {
    promptTokens: promptTokens ?? UNKNOWN_TOKEN_COUNT,
    completionTokens: completionTokens ?? UNKNOWN_TOKEN_COUNT,
    maxTotalTokens: maxTotalTokens ?? UNKNOWN_TOKEN_COUNT,
  };
}

/**
 * Type representing all possible generated content types from LLM responses.
 *
 * This union type covers:
 * - `string`: Raw text responses (TEXT output format)
 * - `Record<string, unknown>`: JSON object responses
 * - `unknown[]`: JSON array responses (e.g., from z.array() schemas)
 * - `null`: Absence of content (error cases, empty responses)
 *
 * Note: `unknown[]` covers all array types including `number[]` (embeddings),
 * `{ name: string }[]` (array of objects), etc. The generic `unknown[]` ensures
 * type compatibility with `T extends LLMGeneratedContent` constraints when T is
 * inferred as a specific array type from a Zod schema.
 *
 * For type-safe JSON value operations, use the type guards from json-value.types.ts
 * (isJsonPrimitive, isJsonObject, isJsonArray, isJsonValue) to narrow types.
 */
export type LLMGeneratedContent = string | Record<string, unknown> | unknown[] | null;

/**
 * Helper type to infer the response data type from LLMCompletionOptions.
 * This type is format-aware and provides stronger type safety:
 * - When outputFormat is JSON with a schema, infers the type from that schema
 * - When outputFormat is JSON without a schema, returns Record<string, unknown>
 * - When outputFormat is TEXT, returns string
 * - Otherwise, defaults to LLMGeneratedContent
 *
 * This enables end-to-end type safety through the LLM call chain by allowing
 * the return type to be inferred from the options passed at the call site.
 */
export type InferResponseType<TOptions extends LLMCompletionOptions> = TOptions extends {
  outputFormat: LLMOutputFormat.JSON;
  jsonSchema: infer S;
}
  ? S extends z.ZodType
    ? z.infer<S>
    : Record<string, unknown>
  : TOptions extends { outputFormat: LLMOutputFormat.TEXT }
    ? string
    : LLMGeneratedContent;

/**
 * Type to define the LLM response with type-safe generated content.
 * The generic type parameter T represents the type of the generated content,
 * which is inferred from the Zod schema when JSON validation is used.
 *
 * @template T - The type of the generated content. Defaults to LLMGeneratedContent to allow
 * use as a base type when the specific content type isn't relevant (e.g., error handling, status checking).
 */
export interface LLMFunctionResponse<T = LLMGeneratedContent> {
  readonly status: LLMResponseStatus;
  readonly request: string;
  readonly modelKey: string;
  readonly context: LLMContext;
  readonly generated?: T;
  readonly tokensUsage?: LLMResponseTokensUsage;
  readonly error?: unknown;
  /**
   * Individual repair operations applied to fix JSON issues during processing.
   * Used for determining significance of changes. Contains entries from
   * REPAIR_STEP constants (e.g., "Removed code fences", "coerceStringToArray").
   */
  readonly repairs?: readonly string[];
  /**
   * High-level pipeline step descriptions (which sanitizers/phases ran during JSON processing).
   * Used for logging context about what processing occurred.
   */
  readonly pipelineSteps?: readonly string[];
}
