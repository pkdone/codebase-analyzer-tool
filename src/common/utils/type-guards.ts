/**
 * Type guard utilities for runtime type checking.
 */

/**
 * Type guard to check if a value is defined (not null and not undefined).
 *
 * @param value - The value to check
 * @returns true if value is not null and not undefined
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Type guard to check if a value is not null.
 * Useful for filtering null values from arrays while maintaining type safety.
 *
 * @param value - The value to check
 * @returns true if value is not null
 *
 * @example
 * ```typescript
 * const results: (string | null)[] = ['a', null, 'b'];
 * const filtered = results.filter(isNotNull); // string[]
 * ```
 */
export function isNotNull<T>(value: T | null): value is T {
  return value !== null;
}

/**
 * Type guard to check if a value is a valid JSON object (not null, not array).
 *
 * @param value - The value to check
 * @returns true if value is a plain object (Record<string, unknown>)
 */
export function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Type guard to check if a value is indexable (can be accessed by string keys).
 * This includes both plain objects and arrays (since arrays are indexable by numeric string keys).
 * Useful for safe property access without type assertions.
 *
 * @param value - The value to check
 * @returns true if value is a non-null object (including arrays)
 *
 * @example
 * ```typescript
 * const data: unknown = { name: "test" };
 * if (isIndexable(data)) {
 *   const name = data["name"]; // Safe access, no assertion needed
 * }
 * ```
 */
export function isIndexable(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
