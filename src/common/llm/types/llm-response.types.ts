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
 * - `object`: JSON object or array responses (covers all typed objects and arrays)
 * - `null`: Absence of content (error cases, empty responses)
 *
 * Note: Using `object` instead of `Record<string, unknown> | unknown[]` provides broader
 * type compatibility while maintaining the same runtime behavior. All JSON-serializable
 * values (objects and arrays) extend `object`, and actual type safety is enforced through
 * Zod schema validation at the call site. This enables strict Zod schemas (without
 * `.passthrough()`) to satisfy the `T extends LLMGeneratedContent` constraint.
 *
 * For type-safe JSON value operations, use the type guards from json-value.types.ts
 * (isJsonPrimitive, isJsonObject, isJsonArray, isJsonValue) to narrow types.
 */
export type LLMGeneratedContent = string | object | null;

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
 * Base fields common to all LLM response variants.
 */
interface LLMResponseBase {
  readonly request: string;
  readonly modelKey: string;
  readonly context: LLMContext;
}

/**
 * Response variant for successful completion with generated content.
 * Status is COMPLETED and the `generated` field contains the result.
 *
 * @template T - The type of the generated content. Defaults to LLMGeneratedContent.
 */
export interface LLMCompletedResponse<T = LLMGeneratedContent> extends LLMResponseBase {
  readonly status: typeof LLMResponseStatus.COMPLETED;
  readonly generated: T;
  readonly tokensUsage?: LLMResponseTokensUsage;
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

/**
 * Response variant for error conditions (ERRORED or INVALID status).
 * The `error` field contains details about what went wrong.
 */
export interface LLMErroredResponse extends LLMResponseBase {
  readonly status: typeof LLMResponseStatus.ERRORED | typeof LLMResponseStatus.INVALID;
  readonly error: unknown;
  readonly tokensUsage?: LLMResponseTokensUsage;
}

/**
 * Response variant for non-terminal status conditions that may trigger retries or fallbacks.
 * Includes EXCEEDED (token limit), OVERLOADED (rate limit), and UNKNOWN statuses.
 */
export interface LLMStatusResponse extends LLMResponseBase {
  readonly status:
    | typeof LLMResponseStatus.EXCEEDED
    | typeof LLMResponseStatus.OVERLOADED
    | typeof LLMResponseStatus.UNKNOWN;
  readonly tokensUsage?: LLMResponseTokensUsage;
}

/**
 * Discriminated union type for LLM responses with type-safe generated content.
 * The `status` field acts as the discriminant, enabling TypeScript to narrow
 * the type and provide compile-time guarantees about which fields are available.
 *
 * Usage:
 * ```typescript
 * if (response.status === LLMResponseStatus.COMPLETED) {
 *   // TypeScript knows `generated` exists here
 *   console.log(response.generated);
 * } else if (response.status === LLMResponseStatus.ERRORED) {
 *   // TypeScript knows `error` exists here
 *   console.log(response.error);
 * }
 * ```
 *
 * @template T - The type of the generated content. Defaults to LLMGeneratedContent to allow
 * use as a base type when the specific content type isn't relevant (e.g., error handling, status checking).
 */
export type LLMFunctionResponse<T = LLMGeneratedContent> =
  | LLMCompletedResponse<T>
  | LLMErroredResponse
  | LLMStatusResponse;

// ============================================================================
// Type Guards for Response Status Checking
// ============================================================================

/**
 * Type guard to check if a response is a completed response with generated content.
 * Enables TypeScript to narrow the type and access the `generated` field safely.
 *
 * @param response - The LLM function response to check
 * @returns True if the response is a completed response
 *
 * @example
 * ```typescript
 * if (isCompletedResponse(response)) {
 *   // TypeScript knows response.generated exists
 *   console.log(response.generated);
 * }
 * ```
 */
export function isCompletedResponse<T>(
  response: LLMFunctionResponse<T>,
): response is LLMCompletedResponse<T> {
  return response.status === LLMResponseStatus.COMPLETED;
}

/**
 * Type guard to check if a response is an error response (ERRORED or INVALID).
 * Enables TypeScript to narrow the type and access the `error` field safely.
 *
 * @param response - The LLM function response to check
 * @returns True if the response is an error response
 *
 * @example
 * ```typescript
 * if (isErrorResponse(response)) {
 *   // TypeScript knows response.error exists
 *   console.log(response.error);
 * }
 * ```
 */
export function isErrorResponse<T>(
  response: LLMFunctionResponse<T>,
): response is LLMErroredResponse {
  return (
    response.status === LLMResponseStatus.ERRORED || response.status === LLMResponseStatus.INVALID
  );
}

/**
 * Type guard to check if a response is a status-only response (EXCEEDED, OVERLOADED, or UNKNOWN).
 * These responses typically trigger retry or fallback behavior.
 *
 * @param response - The LLM function response to check
 * @returns True if the response is a status-only response
 *
 * @example
 * ```typescript
 * if (isStatusResponse(response)) {
 *   // Handle retry/fallback logic
 *   if (response.status === LLMResponseStatus.EXCEEDED) {
 *     // Token limit exceeded, may need to crop prompt
 *   }
 * }
 * ```
 */
export function isStatusResponse<T>(
  response: LLMFunctionResponse<T>,
): response is LLMStatusResponse {
  return (
    response.status === LLMResponseStatus.EXCEEDED ||
    response.status === LLMResponseStatus.OVERLOADED ||
    response.status === LLMResponseStatus.UNKNOWN
  );
}

/**
 * Type guard to check if a response indicates the LLM is overloaded.
 * Useful for determining when to apply retry logic with backoff.
 *
 * @param response - The LLM function response to check
 * @returns True if the response status is OVERLOADED
 */
export function isOverloadedResponse<T>(
  response: LLMFunctionResponse<T>,
): response is LLMStatusResponse & { status: typeof LLMResponseStatus.OVERLOADED } {
  return response.status === LLMResponseStatus.OVERLOADED;
}

/**
 * Type guard to check if a response indicates token limit was exceeded.
 * Useful for determining when to apply prompt cropping.
 *
 * @param response - The LLM function response to check
 * @returns True if the response status is EXCEEDED
 */
export function isExceededResponse<T>(
  response: LLMFunctionResponse<T>,
): response is LLMStatusResponse & { status: typeof LLMResponseStatus.EXCEEDED } {
  return response.status === LLMResponseStatus.EXCEEDED;
}
