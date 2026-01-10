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
