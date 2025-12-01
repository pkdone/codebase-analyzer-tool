/**
 * Post-parse transformation that recursively coerces string values to empty arrays
 * for properties that are expected to be arrays.
 *
 * LLMs sometimes return descriptive strings for properties that should be arrays
 * (e.g., `"parameters": "59 parameters including id, accountNo, status, etc."`).
 * This transformation converts these string values to empty arrays for a predefined
 * list of property names that are expected to be arrays.
 *
 * Example:
 *   Input:  { parameters: "59 parameters...", dependencies: "several dependencies" }
 *   Output: { parameters: [], dependencies: [] }
 *
 * This transformation:
 * - Recursively processes all nested plain objects and arrays
 * - Converts string values to empty arrays for predefined property names
 * - Works at any nesting level (not just specific paths)
 * - Leaves array values unchanged
 * - Preserves all other values unchanged
 * - Handles symbol keys and preserves them
 */

/**
 * List of property names that are expected to be arrays.
 * If any of these properties have a string value, they will be converted to an empty array.
 */
const ARRAY_PROPERTY_NAMES = ["parameters", "dependencies", "references"] as const;

export function coerceStringToArray(value: unknown, visited = new WeakSet<object>()): unknown {
  // Handle primitives and null
  if (value === null || typeof value !== "object") {
    return value;
  }

  // Prevent infinite recursion on circular references
  if (visited.has(value)) {
    return value;
  }
  visited.add(value);

  // Handle arrays
  if (Array.isArray(value)) {
    return value.map((item) => coerceStringToArray(item, visited));
  }

  // Preserve special built-in objects (Date, RegExp, etc.) as-is
  // Only process plain objects from JSON.parse
  if (value.constructor !== Object) {
    return value;
  }

  // Handle plain objects
  const obj = value as Record<string | symbol, unknown>;
  const result: Record<string | symbol, unknown> = {};

  // Process string keys
  for (const [key, val] of Object.entries(obj)) {
    let processedValue = val;

    // Convert string values to empty arrays for predefined property names
    if (
      typeof key === "string" &&
      ARRAY_PROPERTY_NAMES.includes(key as (typeof ARRAY_PROPERTY_NAMES)[number]) &&
      typeof val === "string"
    ) {
      processedValue = [];
    } else {
      // Recursively process nested objects and arrays
      processedValue = coerceStringToArray(val, visited);
    }

    result[key] = processedValue;
  }

  // Handle symbol keys (preserve them as-is)
  const symbols = Object.getOwnPropertySymbols(obj);
  for (const sym of symbols) {
    const symObj = obj as Record<symbol, unknown>;
    const resultSym = result as Record<symbol, unknown>;
    resultSym[sym] = coerceStringToArray(symObj[sym], visited);
  }

  return result;
}
