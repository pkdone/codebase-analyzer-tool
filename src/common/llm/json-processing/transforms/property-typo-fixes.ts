/**
 * Schema fixing transformation that recursively fixes common property name typos
 * by removing trailing underscores from property keys.
 *
 * LLMs sometimes return property names with trailing underscores (e.g., `type_`, `name_`)
 * instead of the correct form (e.g., `type`, `name`). This transformation fixes these
 * typos by renaming properties that end with an underscore to their correct form.
 *
 * Example:
 *   Input:  { type_: "string", name_: "param1", value: 123 }
 *   Output: { type: "string", name: "param1", value: 123 }
 *
 * This transformation:
 * - Recursively processes all nested plain objects and arrays
 * - Renames any property key ending with underscore to its correct form
 * - Only renames if the correct property name doesn't already exist
 * - Preserves all other values unchanged
 * - Handles symbol keys and preserves them
 */
export function fixCommonPropertyNameTypos(
  value: unknown,
  _config?: import("../../config/llm-module-config.types").LLMSanitizerConfig,
  visited = new WeakSet<object>(),
): unknown {
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
    return value.map((item) => fixCommonPropertyNameTypos(item, _config, visited));
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
    let processedKey = key;
    let processedValue = val;

    // Fix property names ending with underscore
    if (typeof key === "string" && key.endsWith("_") && key.length > 1) {
      const correctKey = key.slice(0, -1);
      // Only rename if the correct property name doesn't already exist
      if (!(correctKey in obj)) {
        processedKey = correctKey;
      }
    }

    // Recursively process nested objects and arrays
    processedValue = fixCommonPropertyNameTypos(val, _config, visited);

    result[processedKey] = processedValue;
  }

  // Handle symbol keys (preserve them as-is)
  const symbols = Object.getOwnPropertySymbols(obj);
  for (const sym of symbols) {
    const symObj = obj as Record<symbol, unknown>;
    const resultSym = result as Record<symbol, unknown>;
    resultSym[sym] = fixCommonPropertyNameTypos(symObj[sym], _config, visited);
  }

  return result;
}
