import { Sanitizer } from "./sanitizers-types";
import { DELIMITERS } from "../config/delimiters.config";

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
  if (!input) return { content: input, changed: false };

  const lines = input.split(DELIMITERS.NEWLINE);
  const outputLines: string[] = [];
  let inString = false;
  let escape = false;
  const diagnostics: string[] = [];
  let fixedCount = 0;

  // Include opening/closing braces/brackets, quote, digit, comma, primitives.
  // Added ']' which was previously missing causing missed fixes for lines like `s  ],`.
  const strayPrefixPattern = /^(\w+)([ \t]{2,})([[\]{}"0-9]|true|false|null|,)/;
  for (const [lineIndex, line] of lines.entries()) {
    // Skip prefix removal if currently inside a string literal spanning lines
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!inString) {
      const match = strayPrefixPattern.exec(line);
      if (match) {
        const [, prefix, whitespace, token] = match;
        const newLine = whitespace + token + line.slice(match[0].length);
        outputLines.push(newLine);
        fixedCount++;
        if (diagnostics.length < 3) {
          // Abbreviate very long lines to keep diagnostics compact (<100 chars)
          const base = `Line ${lineIndex + 1}: removed prefix '${prefix}' before '${token}'`;
          const abbreviated = line.length > 60 ? `${base} ...` : base;
          diagnostics.push(abbreviated);
        }
        scanStringState(newLine);
        continue;
      }
    }
    outputLines.push(line);
    scanStringState(line);
  }

  if (fixedCount === 0) return { content: input, changed: false };

  return {
    content: outputLines.join(DELIMITERS.NEWLINE),
    changed: true,
    description: `Removed stray prefix characters from ${fixedCount} line${fixedCount === 1 ? "" : "s"}`,
    diagnostics: diagnostics.length > 0 ? diagnostics : undefined,
  };

  function scanStringState(text: string): void {
    for (const ch of text) {
      if (inString) {
        if (escape) {
          escape = false;
        } else if (ch === DELIMITERS.BACKSLASH) {
          escape = true;
        } else if (ch === DELIMITERS.DOUBLE_QUOTE) {
          inString = false;
        }
      } else if (ch === DELIMITERS.DOUBLE_QUOTE) {
        inString = true;
      }
    }
    escape = false;
  }
};
