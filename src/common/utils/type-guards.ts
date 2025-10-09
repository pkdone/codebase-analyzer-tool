/**
 * Generic type guard to filter out null/undefined when building arrays of optional values.
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}
