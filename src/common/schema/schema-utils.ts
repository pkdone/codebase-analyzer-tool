import { z } from "zod";

// Central sentinel used by normalization helpers when a value is not recognized.
export const DEFAULT_INVALID_VALUE = "INVALID" as const;

/**
 * Creates a Zod schema for case-insensitive enum validation with fallback to INVALID.
 * Uses Zod's built-in features (toUpperCase, pipe, catch) instead of custom preprocessing.
 *
 * @param allowed - Array of allowed uppercase enum values
 * @returns Zod schema that uppercases input, validates against enum, and falls back to INVALID if invalid
 *
 * @example
 * const schema = createCaseInsensitiveEnumSchema(["ONE", "TWO", "THREE"]);
 * schema.parse("one") // "ONE"
 * schema.parse("four") // "INVALID"
 */
export function createCaseInsensitiveEnumSchema<T extends readonly [string, ...string[]]>(
  allowed: T,
): z.ZodType<T[number] | typeof DEFAULT_INVALID_VALUE> {
  return z.string().toUpperCase().pipe(z.enum(allowed).catch(DEFAULT_INVALID_VALUE));
}

/**
 * Normalizes input that may be a string or an array of strings into an array of enum values.
 * Each element is uppercased and validated; invalid entries become 'INVALID'.
 *
 * This function is kept as a custom implementation because it handles complex cases:
 * - Converts single strings to arrays
 * - Handles mixed valid/invalid values in arrays
 * - Filters out non-string values
 * - Zod's built-in array handling doesn't easily support this string-to-array conversion pattern
 */
export function normalizeEnumArray(value: unknown, allowed: readonly string[]): unknown {
  if (Array.isArray(value)) {
    return value
      .filter((v) => typeof v === "string")
      .map((v) => {
        const upper = v.toUpperCase();
        return allowed.includes(upper) ? upper : DEFAULT_INVALID_VALUE;
      });
  }
  if (typeof value === "string") {
    const upper = value.toUpperCase();
    return [allowed.includes(upper) ? upper : DEFAULT_INVALID_VALUE];
  }
  return value;
}
