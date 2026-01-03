/**
 * Type-safe JSON value types for representing JSON-serializable data.
 *
 * These types provide stronger type safety than Record<string, unknown> by
 * ensuring values are JSON-serializable and preventing assignment of
 * non-JSON types like Functions, Maps, Sets, etc.
 */

/**
 * JSON primitive values: string, number, boolean, or null.
 */
export type JsonPrimitive = string | number | boolean | null;

/**
 * JSON object type with string keys and JSON values.
 * Uses readonly for immutability in the LLM response context.
 */
export interface JsonObject {
  readonly [key: string]: JsonValue;
}

/**
 * JSON array type containing JSON values.
 * Uses readonly for immutability in the LLM response context.
 */
export type JsonArray = readonly JsonValue[];

/**
 * Union type representing any valid JSON value.
 * This recursive type accurately models the JSON specification.
 */
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;

/**
 * Mutable versions for contexts where modification is needed.
 */
export interface MutableJsonObject {
  [key: string]: MutableJsonValue;
}

export type MutableJsonArray = MutableJsonValue[];

export type MutableJsonValue = JsonPrimitive | MutableJsonObject | MutableJsonArray;

/**
 * Type guard to check if a value is a valid JSON primitive.
 */
export function isJsonPrimitive(value: unknown): value is JsonPrimitive {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

/**
 * Type guard to check if a value is a valid JSON object (plain object, not array).
 */
export function isJsonObject(value: unknown): value is JsonObject {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    value.constructor === Object
  );
}

/**
 * Type guard to check if a value is a valid JSON array.
 */
export function isJsonArray(value: unknown): value is JsonArray {
  return Array.isArray(value);
}

/**
 * Type guard to check if a value is a valid JSON value (recursive check).
 * Note: This performs a shallow check for performance. For deep validation,
 * use JSON.parse(JSON.stringify(value)) in a try-catch.
 */
export function isJsonValue(value: unknown): value is JsonValue {
  return isJsonPrimitive(value) || isJsonObject(value) || isJsonArray(value);
}
