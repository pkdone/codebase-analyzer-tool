import { Sanitizer } from "./sanitizers-types";
import { SANITIZATION_STEP } from "../config/sanitization-steps.config";

/**
 * Removes trailing commas from JSON objects and arrays.
 *
 * ## Purpose
 * LLMs sometimes include trailing commas after the last element in objects
 * or arrays, which is valid in JavaScript but invalid in strict JSON.
 *
 * ## Patterns Fixed
 * - Object trailing comma: `{ "a": 1, "b": 2, }`
 * - Array trailing comma: `[1, 2, 3, ]`
 * - With whitespace: `{ "key": "value",  }`
 * - Nested structures: `{ "arr": [1, 2, ] }`
 *
 * ## Examples
 * Before: `{ "name": "John", "age": 30, }`
 * After:  `{ "name": "John", "age": 30 }`
 *
 * Before: `[1, 2, 3, ]`
 * After:  `[1, 2, 3 ]`
 *
 * ## Implementation Notes
 * - Uses regex to match comma followed by optional whitespace and closing brace/bracket
 * - Replaces the entire match with just the closing delimiter
 * - Handles multiple occurrences throughout the content
 *
 * ## Limitations
 * - Does not validate the overall JSON structure
 * - May affect commas in string values that happen to be followed by } or ]
 *   (though this is rare in practice)
 *
 * @param input - The raw string content to sanitize
 * @returns Sanitizer result with trailing commas removed if found
 */
export const removeTrailingCommas: Sanitizer = (input) => {
  const updated = input.replaceAll(/,\s*([}\]])/g, "$1");
  return updated === input
    ? { content: input, changed: false }
    : { content: updated, changed: true, description: SANITIZATION_STEP.REMOVED_TRAILING_COMMAS };
};
