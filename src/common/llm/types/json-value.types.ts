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
