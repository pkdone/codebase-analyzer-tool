/**
 * Schema fixing transformation that recursively coerces string values to empty arrays
 * for properties that are expected to be arrays.
 *
 * LLMs sometimes return descriptive strings for properties that should be arrays
 * (e.g., `"parameters": "59 parameters including id, accountNo, status, etc."`).
 * This transformation converts these string values to empty arrays for property names
 * specified in the configuration.
 *
 * Example:
 *   Input:  { parameters: "59 parameters...", dependencies: "several dependencies" }
 *   Output: { parameters: [], dependencies: [] }
 *
 * This transformation:
 * - Recursively processes all nested plain objects and arrays
 * - Converts string values to empty arrays for configured property names
 * - Works at any nesting level (not just specific paths)
 * - Leaves array values unchanged
 * - Preserves all other values unchanged
 * - Handles symbol keys and preserves them
 * - Skips transformation if no arrayPropertyNames are configured
 */

import { deepMap } from "../utils/object-traversal";

export function coerceStringToArray(
  value: unknown,
  config?: import("../../config/llm-module-config.types").LLMSanitizerConfig,
  visited = new WeakSet<object>(),
): unknown {
  const arrayPropertyNames = config?.arrayPropertyNames ?? [];

  // Skip transformation if no array property names are configured
  if (arrayPropertyNames.length === 0) {
    return value;
  }

  return deepMap(value, (val) => {
    // Handle primitives and null - return as-is
    if (val === null || typeof val !== "object") {
      return val;
    }

    // Handle arrays - return as-is (already processed by deepMap)
    if (Array.isArray(val)) {
      return val as unknown;
    }

    // Handle plain objects - transform string values for configured properties
    if (val.constructor === Object) {
      const obj = val as Record<string | symbol, unknown>;
      const result: Record<string | symbol, unknown> = {};

      // Process string keys
      for (const [key, propVal] of Object.entries(obj)) {
        // Convert string values to empty arrays for configured property names
        // Check the original value before it's processed recursively
        if (arrayPropertyNames.includes(key) && typeof propVal === "string") {
          result[key] = [] as unknown;
        } else {
          // Value will be processed recursively by deepMap
          result[key] = propVal;
        }
      }

      // Handle symbol keys (preserve them as-is, they'll be processed by deepMap)
      const symbols = Object.getOwnPropertySymbols(obj);
      for (const sym of symbols) {
        const symObj = obj as Record<symbol, unknown>;
        const resultSym = result as Record<symbol, unknown>;
        resultSym[sym] = symObj[sym];
      }

      // Return the object structure, deepMap will recursively process the values
      return result;
    }

    // Preserve special built-in objects (Date, RegExp, etc.) as-is
    return val;
  }, visited);
}
