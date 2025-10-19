/**
 * Normalizes a single string value against a set of allowed uppercase enum values.
 * - Uppercases input
 * - Returns the original value if not a string
 * - Returns 'INVALID' sentinel when not in allowed set.
 */
export function normalizeEnumValue(
  value: unknown,
  allowed: readonly string[],
  invalidValue: string,
): unknown {
  if (typeof value === "string") {
    const upper = value.toUpperCase();
    return allowed.includes(upper) ? upper : invalidValue;
  }
  return value;
}

/**
 * Normalizes input that may be a string or an array of strings into an array of enum values.
 * Each element is uppercased and validated; invalid entries become 'INVALID'.
 */
export function normalizeEnumArray(
  value: unknown,
  allowed: readonly string[],
  invalidValue: string,
): unknown {
  if (Array.isArray(value)) {
    return value
      .filter((v) => typeof v === "string")
      .map((v) => {
        const upper = v.toUpperCase();
        return allowed.includes(upper) ? upper : invalidValue;
      });
  }
  if (typeof value === "string") {
    const upper = value.toUpperCase();
    return [allowed.includes(upper) ? upper : invalidValue];
  }
  return value;
}

/**
 * Variant for optional single values: returns undefined if input is empty string after trim.
 */
export function normalizeOptionalEnumValue(
  value: unknown,
  allowed: readonly string[],
  invalidValue: string,
): unknown {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length === 0) return undefined;
    const upper = trimmed.toUpperCase();
    return allowed.includes(upper) ? upper : invalidValue;
  }
  return value;
}
