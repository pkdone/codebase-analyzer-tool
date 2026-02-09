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
import { deepMapObject } from "../utils/object-traversal";

export function fixCommonPropertyNameTypos(
  value: unknown,
  _config?: import("../../config/llm-module-config.types").LLMSanitizerConfig,
  visited = new WeakSet<object>(),
): unknown {
  return deepMapObject(
    value,
    (val) => val, // No value transformation, only key transformation
    {
      transformKey: (key, _val, obj) => {
        // Fix property names ending with underscore
        if (key.endsWith("_") && key.length > 1) {
          const correctKey = key.slice(0, -1);
          // Only rename if the correct property name doesn't already exist
          if (!Object.hasOwn(obj, correctKey)) {
            return correctKey;
          }
        }

        return key;
      },
    },
    visited,
  );
}
