/**
 * Schema fixing transformation that converts `null` values to empty strings (`""`)
 * in specific contexts where the field is expected to be a required string.
 *
 * This transformation addresses cases where LLMs return `null` for fields that
 * should contain a string value according to the schema. Unlike `convertNullToUndefined`
 * which removes null properties (causing "Required" validation errors), this transform
 * preserves the property with an empty string value.
 *
 * Heuristic: If an object has a `name` property with a string value and another property
 * with a `null` value, convert the null to empty string. This handles common patterns like:
 *   - `{ name: "tableName", fields: null }` -> `{ name: "tableName", fields: "" }`
 *   - `{ name: "constantName", value: null }` -> `{ name: "constantName", value: "" }`
 *
 * The heuristic is conservative to avoid incorrectly converting null values that are
 * intentionally null (e.g., for optional fields that should remain undefined).
 *
 * Example:
 *   Input:  { tables: [{ name: "m_deposit", fields: null }] }
 *   Output: { tables: [{ name: "m_deposit", fields: "" }] }
 */
import { deepMapObject, isPlainObject } from "../utils/object-traversal";

/**
 * Properties that commonly contain required string values and should have null converted to "".
 * These are properties that are expected to be strings according to common schema patterns.
 *
 * IMPORTANT: Only include properties that are truly required strings in schema definitions.
 * Properties like `value`, `description`, `purpose` etc. are often OPTIONAL and should
 * become undefined (via convertNullToUndefined) rather than empty string.
 *
 * The `fields` property is specifically for SQL table definitions where the schema requires
 * a string describing the table's columns.
 */
const STRING_FIELD_CANDIDATES = new Set([
  "fields", // table fields - specifically required in tablesSchema
]);

/**
 * Checks if an object matches the pattern where null should be converted to empty string.
 * The pattern is: object has a `name` property with a string value.
 *
 * @param obj - The object to check
 * @returns true if the object has a name property with a string value
 */
function isNamedObjectWithStringFields(obj: Record<string, unknown>): boolean {
  return typeof obj.name === "string";
}

/**
 * Converts null values to empty strings in objects that have a `name` property with a string value.
 * This handles cases where LLMs return null for fields that should be strings according to schemas.
 *
 * @param value - The value to transform
 * @param _config - Optional sanitizer configuration (unused, for interface compatibility)
 * @param visited - WeakSet for circular reference detection
 * @returns The transformed value with null converted to empty string where appropriate
 */
export function convertNullToEmptyStringForRequiredFields(
  value: unknown,
  _config?: import("../../config/llm-module-config.types").LLMSanitizerConfig,
  visited = new WeakSet<object>(),
): unknown {
  return deepMapObject(
    value,
    (val) => {
      // Only transform plain objects
      if (!isPlainObject(val)) {
        return val;
      }

      // Check if this object matches our heuristic pattern
      if (!isNamedObjectWithStringFields(val)) {
        return val;
      }

      // Create a new object with null values converted to empty strings
      // for fields that are commonly required string fields
      const result: Record<string | symbol, unknown> = {};
      let changed = false;

      for (const key in val) {
        if (Object.hasOwn(val, key)) {
          const propValue = val[key];

          // Convert null to empty string for candidate string fields
          if (propValue === null && STRING_FIELD_CANDIDATES.has(key)) {
            result[key] = "";
            changed = true;
          } else {
            result[key] = propValue;
          }
        }
      }

      // Preserve symbol keys - properly typed, no cast needed
      const symbols = Object.getOwnPropertySymbols(val);

      for (const sym of symbols) {
        result[sym] = val[sym];
      }

      return changed ? result : val;
    },
    {},
    visited,
  );
}
