import { Sanitizer } from "./sanitizers-types";
import { SANITIZATION_STEP } from "../config/sanitization-steps.config";

/**
 * Removes zero-width and non-printable control characters from JSON content.
 *
 * ## Purpose
 * LLMs sometimes include invisible characters in their output, such as:
 * - Zero-width spaces (often from copy-paste or tokenization artifacts)
 * - Non-printable control characters
 * - Byte Order Marks (BOM)
 *
 * These characters are invisible to humans but break JSON parsing.
 *
 * ## Characters Removed
 * - `\u0000-\u0008`: Control chars before tab (NULL, SOH, STX, etc.)
 * - `\u000B-\u000C`: Vertical tab and form feed
 * - `\u000E-\u001F`: Control chars after carriage return
 * - `\u200B-\u200D`: Zero-width spaces (ZWSP, ZWNJ, ZWJ)
 * - `\uFEFF`: Zero-width no-break space (BOM)
 *
 * ## Characters Preserved
 * - `\t` (0x09): Tab - valid whitespace in JSON
 * - `\n` (0x0A): Newline - valid whitespace in JSON
 * - `\r` (0x0D): Carriage return - valid whitespace in JSON
 *
 * ## Examples
 * Before: (JSON with zero-width spaces between characters)
 * After:  `{"name": "value"}`
 *
 * ## Implementation Notes
 * Uses a single regex replacement for performance and maintainability.
 *
 * @param input - The raw string content to sanitize
 * @returns Sanitizer result with control characters removed if found
 */
export const removeControlChars: Sanitizer = (input) => {
  const cleaned = strip(input);
  return cleaned === input
    ? { content: input, changed: false }
    : { content: cleaned, changed: true, description: SANITIZATION_STEP.REMOVED_CONTROL_CHARS };
};

/**
 * Internal function to strip control and zero-width characters.
 * Uses regex for a declarative and maintainable approach.
 *
 * @param input - The string to process
 * @returns String with control characters removed
 */
function strip(input: string): string {
  if (!input) return input;
  // Regex matches all non-printable and zero-width characters except \t, \n, \r
  // eslint-disable-next-line no-control-regex
  const controlCharRegex = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u200B-\u200D\uFEFF]/g;
  return input.replaceAll(controlCharRegex, "");
}
