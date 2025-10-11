import { Sanitizer } from "./sanitizers-types";

/**
 * Trims leading and trailing whitespace from JSON content.
 *
 * ## Purpose
 * LLMs often include extra whitespace before or after the JSON content,
 * especially when the response includes explanatory text or formatting.
 * This sanitizer removes that extraneous whitespace.
 *
 * ## Patterns Fixed
 * - Leading whitespace: `   { "key": "value" }`
 * - Trailing whitespace: `{ "key": "value" }   `
 * - Both: `\n  { "key": "value" }  \n`
 *
 * ## Limitations
 * - Only removes whitespace at the start and end of the entire string
 * - Does not modify internal whitespace within the JSON
 * - Kept as a sanitizer (rather than just calling trim) for consistency
 *   so ordering within the pipeline can be reasoned about and unit tested
 *
 * @param input - The raw string content to sanitize
 * @returns Sanitizer result with trimmed content if changed, or original if unchanged
 */
export const trimWhitespace: Sanitizer = (input) => {
  const trimmed = input.trim();
  if (trimmed === input) return { content: input, changed: false };
  return { content: trimmed, changed: true, description: "Trimmed whitespace" };
};
