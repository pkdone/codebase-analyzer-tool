/**
 * Schema fixing transformation that recursively converts all `null` values to `undefined`.
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
import { deepMapObject } from "../utils/object-traversal";

export function convertNullToUndefined(
  value: unknown,
  _config?: import("../../config/llm-module-config.types").LLMSanitizerConfig,
  visited = new WeakSet<object>(),
): unknown {
  return deepMapObject(
    value,
    (val) => {
      // Convert null to undefined
      if (val === null) {
        return undefined;
      }
      return val;
    },
    {
      // Omit properties with undefined values
      shouldInclude: (_key, val) => val !== undefined,
    },
    visited,
  );
}
