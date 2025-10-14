import { Sanitizer } from "./sanitizers-types";

/**
 * Removes stray characters at the beginning of lines within JSON structures.
 *
 * ## Purpose
 * LLMs sometimes output malformed JSON where random characters appear at the
 * start of lines, breaking the JSON structure. This commonly happens when:
 * - The LLM accidentally prefixes lines with partial words or single characters
 * - Text wrapping or formatting artifacts introduce spurious characters
 * - Copy-paste or tokenization issues cause character misplacement
 *
 * ## Pattern Detected
 * This sanitizer targets lines that match:
 * 1. Start of line (after a newline)
 * 2. One or more non-whitespace characters that don't belong
 * 3. Whitespace (spaces/tabs)
 * 4. Valid JSON token (quoted string, number, brace, bracket, comma, etc.)
 *
 * ## Examples
 * ### Example 1: Single character prefix before property
 * Before:
 * ```
 * "id",
 * e            "customerId",
 * ```
 * After:
 * ```
 * "id",
 *              "customerId",
 * ```
 *
 * ### Example 2: Single character prefix before closing delimiter
 * Before:
 * ```
 *     }
 * s  ],
 * ```
 * After:
 * ```
 *     }
 *   ],
 * ```
 *
 * ### Example 3: Word fragment prefix
 * Before:
 * ```
 * "name": "value",
 * desc      "description": "text"
 * ```
 * After:
 * ```
 * "name": "value",
 *           "description": "text"
 * ```
 *
 * ## Implementation Strategy
 * The sanitizer uses a regex pattern to identify and remove stray prefixes:
 * - Matches lines where non-whitespace chars are followed by whitespace and valid JSON
 * - Only removes the stray prefix, preserving the correct indentation
 * - Avoids false positives by requiring whitespace between prefix and valid JSON
 *
 * ## Safety Considerations
 * To avoid corrupting valid JSON, the sanitizer:
 * - Requires at least 2 spaces of whitespace after the stray characters
 * - Only targets lines within JSON structures (not top-level content)
 * - Preserves all valid JSON structural characters
 *
 * @param input - The raw string content to sanitize
 * @returns Sanitizer result with stray line prefixes removed if found
 */
export const removeStrayLinePrefixChars: Sanitizer = (input) => {
  const cleaned = stripStrayLinePrefixes(input);
  const changed = cleaned !== input;

  if (!changed) {
    return { content: input, changed: false };
  }

  // Count how many lines were fixed for diagnostics
  const originalLines = input.split("\n");
  const cleanedLines = cleaned.split("\n");
  let fixedCount = 0;
  const diagnostics: string[] = [];

  for (let i = 0; i < originalLines.length && i < cleanedLines.length; i++) {
    if (originalLines[i] !== cleanedLines[i]) {
      fixedCount++;
      // Capture first few examples for diagnostics (limit to 3)
      if (diagnostics.length < 3) {
        const original = originalLines[i].trim();
        const cleaned = cleanedLines[i].trim();
        if (original && cleaned) {
          diagnostics.push(`Line ${i + 1}: removed prefix from "${original.substring(0, 40)}..."`);
        }
      }
    }
  }

  return {
    content: cleaned,
    changed: true,
    description: `Removed stray prefix characters from ${fixedCount} line${fixedCount !== 1 ? "s" : ""}`,
    diagnostics: diagnostics.length > 0 ? diagnostics : undefined,
  };
};

/**
 * Internal function to strip stray characters from line beginnings.
 *
 * The regex pattern matches:
 * - `\n` - newline character
 * - `([a-zA-Z0-9_]+)` - one or more word characters (the stray prefix)
 * - `( {2,}|\t+)` - multiple spaces or tabs (required separation)
 * - `(["[{\]}]|[0-9]|true|false|null|,)` - valid JSON token (opening/closing delimiters, values, or comma)
 *
 * The replacement keeps only the newline, whitespace, and valid JSON token.
 *
 * @param input - The string to process
 * @returns String with stray line prefixes removed
 */
function stripStrayLinePrefixes(input: string): string {
  if (!input) return input;

  // Match: newline + stray chars + whitespace + valid JSON token
  // Capture groups: $1=stray, $2=whitespace, $3=valid JSON token
  const strayPrefixRegex = /\n([a-zA-Z0-9_]+)( {2,}|\t+)(["[{\]}]|[0-9]|true|false|null|,)/g;

  // Replace with: newline + whitespace + valid JSON (removing the stray prefix)
  return input.replaceAll(strayPrefixRegex, "\n$2$3");
}
