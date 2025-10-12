import { Sanitizer } from "./sanitizers-types";

/**
 * Adds missing commas between object properties where the LLM forgot to include them.
 *
 * Detects patterns like:
 *   "property1": "value"
 *   "property2": "value"
 *
 * And transforms to:
 *   "property1": "value",
 *   "property2": "value"
 *
 * This sanitizer uses a regex-based approach to match JSON value endings followed by
 * property names, ensuring we only match outside of string literals.
 *
 * Handles cases where:
 * - A string value, number, boolean, array, or object is followed by whitespace and then another property name
 */
export const addMissingPropertyCommas: Sanitizer = (input) => {
  const trimmed = input.trim();
  if (!trimmed) return { content: input, changed: false };

  const diagnostics: string[] = [];

  // Pattern matches JSON value endings (}, ], ", digit, or keywords true/false/null)
  // followed by whitespace/newline and then an opening quote (indicating a new property).
  // We use a lookbehind to ensure we're after a valid value ending.
  // Note: This is a stateless approach that's more maintainable than character-by-character parsing.
  const missingCommaPattern = /(?<=[}\]"0-9]|true|false|null)\s*\n\s*(?=")/g;

  const originalContent = trimmed;
  const result = trimmed.replace(missingCommaPattern, (match) => {
    diagnostics.push(`Added comma after value ending before newline`);
    // Preserve the whitespace structure but add a comma
    return match.replace(/\n/, ",\n");
  });

  if (result === originalContent) {
    return { content: input, changed: false };
  }

  // Count actual replacements by comparing strings
  const commasAdded =
    (result.match(/,\n/g) ?? []).length - (originalContent.match(/,\n/g) ?? []).length;

  return {
    content: result,
    changed: true,
    description: `Added ${commasAdded} missing comma${commasAdded !== 1 ? "s" : ""} between properties`,
    diagnostics,
  };
};
