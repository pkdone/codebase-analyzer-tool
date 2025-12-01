/**
 * Post-parse transformation that converts `undefined` values to empty strings
 * for common required string properties.
 *
 * This handles cases where LLMs omit required string fields or set them to undefined,
 * causing validation errors like "Expected string, received undefined".
 *
 * Common required string properties that should have default empty string values:
 * - name, type, purpose, description (common in source summaries)
 * - path, method (common in integration points)
 *
 * Example:
 *   Input:  { name: undefined, type: "CLASS" }
 *   Output: { name: "", type: "CLASS" }
 *
 * This transformation:
 * - Recursively processes all nested plain objects and arrays
 * - Converts `undefined` to `""` for known required string properties
 * - Preserves all other values unchanged
 * - Handles circular references safely
 */

/**
 * Common property names that are typically required strings and should default to empty string.
 */
const REQUIRED_STRING_PROPERTIES = new Set([
  "name",
  "type",
  "purpose",
  "description",
  "path",
  "method",
  "namespace",
  "kind",
  "mechanism",
  "value",
]);

export function convertUndefinedToString(
  value: unknown,
  visited = new WeakSet<object>(),
): unknown {
  // Handle primitives and functions
  if (typeof value !== "object" || value === null) {
    return value;
  }

  // Prevent infinite recursion on circular references
  if (visited.has(value)) {
    return value;
  }
  visited.add(value);

  // Handle arrays
  if (Array.isArray(value)) {
    return value.map((item) => convertUndefinedToString(item, visited));
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
    const lowerKey = key.toLowerCase();

    // If the property is undefined and it's a known required string property, convert to empty string
    if (val === undefined && REQUIRED_STRING_PROPERTIES.has(lowerKey)) {
      result[key] = "";
    } else {
      // Recursively process nested objects and arrays
      result[key] = convertUndefinedToString(val, visited);
    }
  }

  // Handle symbol keys (preserve them as-is)
  const symbols = Object.getOwnPropertySymbols(value);
  for (const sym of symbols) {
    const val = (value as Record<symbol, unknown>)[sym];
    result[sym] = convertUndefinedToString(val, visited);
  }

  return result;
}

