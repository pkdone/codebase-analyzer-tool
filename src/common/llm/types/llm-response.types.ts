/**
 * LLM response-related types: status, token usage, and generated content.
 */

import type { LLMExecutionContext } from "./llm-request.types";

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
 * Type to define the token counts.
 * All fields are optional - undefined indicates the value is unknown.
 * This is more idiomatic TypeScript than using sentinel values like -1.
 */
export interface LLMResponseTokensUsage {
  readonly promptTokens?: number;
  readonly completionTokens?: number;
  readonly maxTotalTokens?: number;
}

/**
 * Creates a standardized token usage record, passing through undefined for unknown values.
 * This helper accepts raw (potentially undefined) token counts and preserves them
 * in the output, using undefined to represent unknown values rather than magic numbers.
 *
 * @param promptTokens - Number of tokens in the prompt (undefined if unknown)
 * @param completionTokens - Number of tokens in the completion (undefined if unknown)
 * @param maxTotalTokens - Maximum total tokens allowed (undefined if unknown)
 * @returns A standardized LLMResponseTokensUsage object
 */
export function createTokenUsageRecord(
  promptTokens?: number,
  completionTokens?: number,
  maxTotalTokens?: number,
): LLMResponseTokensUsage {
  return {
    promptTokens,
    completionTokens,
    maxTotalTokens,
  };
}

/**
 * Type representing all possible payload types returned by LLM providers.
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
 * `.passthrough()`) to satisfy the `T extends LLMResponsePayload` constraint.
 *
 * For type-safe JSON value operations, use the types from json-value.types.ts
 * (JsonValue, JsonObject, JsonArray, JsonPrimitive) for stronger typing.
 */
export type LLMResponsePayload = string | object | null;

/**
 * Base fields common to all LLM response variants.
 * Uses LLMExecutionContext because responses are created after executing
 * against a specific model, so modelKey is always known.
 */
interface LLMResponseBase {
  readonly request: string;
  readonly modelKey: string;
  readonly context: LLMExecutionContext;
}

/**
 * Response variant for successful completion with generated content.
 * Status is COMPLETED and the `generated` field contains the result.
 *
 * @template T - The type of the generated content. Defaults to LLMResponsePayload.
 */
export interface LLMCompletedResponse<T = LLMResponsePayload> extends LLMResponseBase {
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
 * @template T - The type of the generated content. Defaults to LLMResponsePayload to allow
 * use as a base type when the specific content type isn't relevant (e.g., error handling, status checking).
 */
export type LLMFunctionResponse<T = LLMResponsePayload> =
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
