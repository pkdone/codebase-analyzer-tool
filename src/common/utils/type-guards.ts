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
 * Assertion function that throws if value is null or undefined.
 * Use when you want to fail fast if a value is missing.
 *
 * @param value - The value to check
 * @param message - Optional custom error message
 * @throws Error if value is null or undefined
 *
 * @example
 * ```typescript
 * const user = await findUser(id);
 * assertIsDefined(user, `User ${id} not found`);
 * // TypeScript now knows user is not null/undefined
 * console.log(user.name);
 * ```
 */
export function assertIsDefined<T>(
  value: T | null | undefined,
  message?: string,
): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(message ?? "Expected value to be defined but received null or undefined");
  }
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
 * Assertion function that throws if value is null.
 * Use when you want to fail fast if a value is null (but undefined is acceptable).
 *
 * @param value - The value to check
 * @param message - Optional custom error message
 * @throws Error if value is null
 *
 * @example
 * ```typescript
 * const result = await fetchData();
 * assertIsNotNull(result, "Fetch returned null");
 * // TypeScript now knows result is not null
 * console.log(result.data);
 * ```
 */
export function assertIsNotNull<T>(value: T | null, message?: string): asserts value is T {
  if (value === null) {
    throw new Error(message ?? "Expected value to not be null");
  }
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
