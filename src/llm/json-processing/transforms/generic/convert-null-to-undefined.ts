/**
 * Post-parse transformation that recursively converts all `null` values to `undefined`.
 *
 * This is necessary because LLMs often return `null` for missing or inapplicable values,
 * but Zod schemas with `.optional()` expect `undefined` (or the field to be omitted entirely),
 * not `null`. Without this transformation, validation fails with "Expected string, received null"
 * errors even when the field is marked as optional.
 *
 * Example:
 *   Input:  { name: "foo", groupId: null, nested: { value: null } }
 *   Output: { name: "foo", nested: { value: undefined } }
 *   (Note: groupId is omitted since it was null)
 *
 * This transformation:
 * - Recursively processes all nested plain objects and arrays
 * - Converts `null` to `undefined` and omits those properties
 * - Preserves all other values unchanged, including Date, RegExp, and other built-in objects
 * - Handles circular references safely
 */
export function convertNullToUndefined(value: unknown, visited = new WeakSet<object>()): unknown {
  // Handle primitive null
  if (value === null) {
    return undefined;
  }

  // Handle primitives and functions
  if (typeof value !== "object") {
    return value;
  }

  // Prevent infinite recursion on circular references
  if (visited.has(value)) {
    return value;
  }
  visited.add(value);

  // Handle arrays
  if (Array.isArray(value)) {
    return value.map((item) => convertNullToUndefined(item, visited));
  }

  // Preserve special built-in objects (Date, RegExp, etc.) as-is
  // Only process plain objects from JSON.parse
  if (value.constructor !== Object) {
    return value;
  }

  // Handle plain objects
  const result: Record<string | symbol, unknown> = {};

  // Handle string keys
  for (const [key, val] of Object.entries(value)) {
    const converted = convertNullToUndefined(val, visited);
    // Only set the property if the converted value is not undefined
    // This ensures that null values are truly omitted from the object
    if (converted !== undefined) {
      result[key] = converted;
    }
  }

  // Handle symbol keys (preserve them as-is)
  const symbols = Object.getOwnPropertySymbols(value);
  for (const sym of symbols) {
    const val = (value as Record<symbol, unknown>)[sym];
    const converted = convertNullToUndefined(val, visited);
    if (converted !== undefined) {
      result[sym] = converted;
    }
  }

  return result;
}
