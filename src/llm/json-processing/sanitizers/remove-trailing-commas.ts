import { Sanitizer, SanitizerResult } from "./sanitizers-types";
import { SANITIZATION_STEP } from "../config/sanitization-steps.config";

/**
 * Sanitizer that removes trailing commas before closing braces or brackets.
 *
 * Trailing commas are valid in JavaScript but not in strict JSON. This sanitizer
 * removes them to ensure valid JSON parsing.
 *
 * ## Examples
 * - `{"a": 1, "b": 2, }` -> `{"a": 1, "b": 2}`
 * - `[1, 2, 3, ]` -> `[1, 2, 3]`
 * - `{"nested": {"a": 1, }, }` -> `{"nested": {"a": 1}, }`
 *
 * @param input - The raw string content to sanitize
 * @returns Sanitizer result with trailing commas removed
 */
export const removeTrailingCommas: Sanitizer = (input: string): SanitizerResult => {
  const trimmed = input.trim();
  if (!trimmed) {
    return { content: input, changed: false };
  }

  // Pattern: Match comma followed by optional whitespace and closing brace or bracket
  // This pattern handles trailing commas in both objects and arrays
  const trailingCommaPattern = /,\s*([}\]])/g;

  const beforeRemoval = trimmed;
  const sanitized = trimmed.replaceAll(trailingCommaPattern, "$1");

  if (sanitized !== beforeRemoval) {
    return {
      content: sanitized,
      changed: true,
      description: SANITIZATION_STEP.REMOVED_TRAILING_COMMAS,
      diagnostics: [SANITIZATION_STEP.REMOVED_TRAILING_COMMAS],
    };
  }

  return { content: input, changed: false };
};
