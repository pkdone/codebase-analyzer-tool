/**
 * Type guard utilities for JSON processing.
 * Provides runtime type checking to improve type safety.
 */

/**
 * Type guard to check if a value is a valid JSON object (not null, not array).
 *
 * @param value - The value to check
 * @returns true if value is a plain object (Record<string, unknown>)
 *
 * @example
 * const data: unknown = JSON.parse(input);
 * if (isJsonObject(data)) {
 *   // data is now typed as Record<string, unknown>
 *   const name = data.name;
 * }
 */
export function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Type guard to check if a value is a valid JSON array.
 *
 * @param value - The value to check
 * @returns true if value is an array
 *
 * @example
 * const data: unknown = JSON.parse(input);
 * if (isJsonArray(data)) {
 *   // data is now typed as unknown[]
 *   const firstItem = data[0];
 * }
 */
export function isJsonArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/**
 * Type guard to check if a value is a string.
 *
 * @param value - The value to check
 * @returns true if value is a string
 *
 * @example
 * function processContent(content: unknown) {
 *   if (isString(content)) {
 *     // content is now typed as string
 *     return content.trim();
 *   }
 * }
 */
export function isString(value: unknown): value is string {
  return typeof value === "string";
}

/**
 * Type guard to check if a value is a number (excluding NaN and Infinity).
 *
 * @param value - The value to check
 * @returns true if value is a finite number
 *
 * @example
 * if (isFiniteNumber(data.count)) {
 *   // data.count is now typed as number and guaranteed to be finite
 *   const doubled = data.count * 2;
 * }
 */
export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * Type guard to check if a value is a boolean.
 *
 * @param value - The value to check
 * @returns true if value is a boolean
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

/**
 * Type guard to check if a value is null.
 *
 * @param value - The value to check
 * @returns true if value is null
 */
export function isNull(value: unknown): value is null {
  return value === null;
}

/**
 * Type guard to check if a value is a valid JSON primitive (string, number, boolean, or null).
 *
 * @param value - The value to check
 * @returns true if value is a JSON primitive type
 */
export function isJsonPrimitive(value: unknown): value is string | number | boolean | null {
  return isString(value) || isFiniteNumber(value) || isBoolean(value) || isNull(value);
}

/**
 * Type guard to check if a value is a valid JSON value (primitive, object, or array).
 *
 * @param value - The value to check
 * @returns true if value is a valid JSON value type
 */
export function isJsonValue(
  value: unknown,
): value is string | number | boolean | null | Record<string, unknown> | unknown[] {
  return isJsonPrimitive(value) || isJsonObject(value) || isJsonArray(value);
}
