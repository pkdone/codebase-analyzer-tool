import { Sanitizer, SanitizerResult } from "./sanitizers-types";
import { REPAIR_STEP } from "../constants/repair-steps.config";
import { logWarn } from "../../../utils/logging";
import { createStringStateTracker } from "../utils/string-state-iterator";

/**
 * Replacement pattern tuple: [RegExp, replacement string, description]
 */
type ReplacementPattern = readonly [RegExp, string, string];

/**
 * Ordered list of replacement patterns for fixing over-escaped sequences.
 *
 * The replacements are applied in order from most-escaped to least-escaped patterns
 * to ensure proper normalization without over-correcting. Each regex targets a specific
 * malformation pattern commonly seen in LLM output.
 */
const REPLACEMENT_PATTERNS: readonly ReplacementPattern[] = [
  // SINGLE QUOTE OVER-ESCAPING
  [
    /\\\\\\'/g,
    "'",
    "Fixes 5-backslash quote: \\\\\\\\\\' → ' (Example: \"it\\\\\\\\\\'s\" → \"it's\", common in SQL)",
  ],
  [
    /\\\\'/g,
    "'",
    "Fixes 4-backslash quote: \\\\\\\\' → ' (Example: \"value\\\\\\'s\" → \"value's\")",
  ],
  [/\\'/g, "'", "Fixes 3-backslash quote: \\\\' → ' (Example: \"value\\'s\" → \"value's\")"],

  // SINGLE QUOTE + DOT COMBINATIONS
  [
    /\\\\\\'\\\./g,
    "'.",
    "Fixes 5-backslash quote + dot: \\\\\\\\\\'\\. → '. (Common in SQL column references)",
  ],
  [
    /\\\\\\'\\\\\\'/g,
    "''",
    "Fixes consecutive 5-backslash quotes: \\\\\\\\'\\\\\\\\' → '' (Common in SQL empty strings)",
  ],
  [/\\'\\\./g, "'.", "Fixes simple quote + dot: \\'\\. → '."],
  [/\\'\\\\'/g, "''", "Fixes mixed quote escaping: \\'\\\\\\' → ''"],

  // NULL CHARACTER OVER-ESCAPING
  [/\\\\\\0/g, "\\0", "Fixes 5-backslash null: \\\\\\\\\\0 → \\0"],
  [/\\\\0/g, "\\0", "Fixes 4-backslash null: \\\\\\\\0 → \\0"],

  // CODE SNIPPET PUNCTUATION (commas, parentheses)
  [/\\\\\s*,/g, ",", "Fixes 4-backslash comma: \\\\\\\\ , → , (Common in function parameters)"],
  [/\\\\\s*\)/g, ")", "Fixes 4-backslash closing paren: \\\\\\\\ ) → )"],
  [/\\,/g, ",", "Fixes 2-backslash comma: \\\\ , → ,"],
  [/\\\)/g, ")", "Fixes 2-backslash closing paren: \\\\ ) → )"],
] as const;

/**
 * Fix over-escaped sequences within JSON string content.
 *
 * LLMs sometimes generate excessively escaped characters, particularly when dealing
 * with code snippets (especially SQL, regex, or strings that contain quotes). This
 * function progressively reduces the number of backslashes to produce valid JSON.
 */
function repairOverEscapedStringSequences(content: string): string {
  let fixed = content;

  for (const [pattern, replacement] of REPLACEMENT_PATTERNS) {
    fixed = fixed.replaceAll(pattern, replacement);
  }

  return fixed;
}

/**
 * Valid JSON escape sequences as defined in RFC 8259.
 * These are the only escape sequences allowed in JSON strings.
 */
const VALID_ESCAPE_SEQUENCES = new Set([
  '"', // \"
  "\\", // \\
  "/", // \/
  "b", // \b (backspace)
  "f", // \f (form feed)
  "n", // \n (newline)
  "r", // \r (carriage return)
  "t", // \t (tab)
  "u", // \uXXXX (unicode)
]);

/**
 * Checks if a character is a valid hex digit (0-9, a-f, A-F).
 */
function isHexDigit(char: string): boolean {
  return /[0-9a-fA-F]/.test(char);
}

/**
 * Consolidated sanitizer that normalizes escape sequences, control characters, and curly quotes in JSON content.
 *
 * This sanitizer combines the functionality of multiple character-level sanitizers:
 * 1. Converts curly quotes (smart quotes) to regular ASCII quotes
 * 2. Removes control characters outside string literals
 * 3. Escapes control characters inside string literals
 * 4. Fixes invalid escape sequences inside string literals
 * 5. Fixes over-escaped sequences inside string literals
 *
 * ## Purpose
 * LLMs sometimes generate JSON with various character-level issues:
 * - Curly quotes (Unicode quotation marks) instead of ASCII quotes
 * - Control characters (invisible chars that break parsing)
 * - Invalid escape sequences (like `\ `, `\x`, `\1-\9`)
 * - Over-escaped sequences (like `\\\'` → `'`)
 * - Incomplete unicode escapes (like `\u41` without 4 hex digits)
 *
 * This sanitizer handles all these issues in a single, efficient pass.
 *
 * ## Implementation
 * Uses a stateful, character-by-character parser that:
 * - First converts curly quotes to ASCII quotes (global replacement)
 * - Tracks whether we're inside a string literal
 * - Removes control chars when outside strings
 * - Escapes control chars and fixes invalid escapes when inside strings
 * - Applies over-escape fixes after the initial pass
 *
 * @param input - The raw string content to sanitize
 * @returns Sanitizer result with normalized characters, escape sequences, and control characters
 */
export const normalizeCharacters: Sanitizer = (input: string): SanitizerResult => {
  try {
    if (!input) {
      return { content: input, changed: false };
    }

    let hasChanges = false;
    const repairs: string[] = [];
    let result = input;

    // First pass: convert curly quotes to ASCII quotes (before character-by-character processing)
    const leftDoubleCount = (result.match(/\u201C/g) ?? []).length;
    const rightDoubleCount = (result.match(/\u201D/g) ?? []).length;
    const leftSingleCount = (result.match(/\u2018/g) ?? []).length;
    const rightSingleCount = (result.match(/\u2019/g) ?? []).length;

    if (
      leftDoubleCount > 0 ||
      rightDoubleCount > 0 ||
      leftSingleCount > 0 ||
      rightSingleCount > 0
    ) {
      hasChanges = true;
      // Left double quotation mark (U+201C) -> regular double quote (U+0022)
      result = result.replaceAll("\u201C", '"');
      // Right double quotation mark (U+201D) -> regular double quote (U+0022)
      result = result.replaceAll("\u201D", '"');
      // Left single quotation mark (U+2018) -> regular single quote (U+0027)
      result = result.replaceAll("\u2018", "'");
      // Right single quotation mark (U+2019) -> regular single quote (U+0027)
      result = result.replaceAll("\u2019", "'");

      if (leftDoubleCount > 0) {
        repairs.push(
          `Converted ${leftDoubleCount} left double curly quote${leftDoubleCount !== 1 ? "s" : ""} (") to regular quote`,
        );
      }
      if (rightDoubleCount > 0) {
        repairs.push(
          `Converted ${rightDoubleCount} right double curly quote${rightDoubleCount !== 1 ? "s" : ""} (") to regular quote`,
        );
      }
      if (leftSingleCount > 0) {
        repairs.push(
          `Converted ${leftSingleCount} left single curly quote${leftSingleCount !== 1 ? "s" : ""} (') to regular quote`,
        );
      }
      if (rightSingleCount > 0) {
        repairs.push(
          `Converted ${rightSingleCount} right single curly quote${rightSingleCount !== 1 ? "s" : ""} (') to regular quote`,
        );
      }
    }

    let i = 0;

    // Track state for string detection and escape handling
    let inString = false;
    let escapeNext = false;
    let controlCharsRemoved = 0;
    let controlCharsEscaped = 0;
    let invalidEscapesFixed = 0;

    // Second pass: handle control chars and escape sequences (character-by-character)
    let processedResult = "";
    while (i < result.length) {
      const char = result[i];
      const code = char.charCodeAt(0);

      if (escapeNext) {
        // Previous character was a backslash, this character is escaped
        processedResult += char;
        escapeNext = false;
        i++;
        continue;
      }

      // Handle backslash (escape sequence start)
      if (char === "\\") {
        if (i + 1 < result.length) {
          const nextChar = result[i + 1];

          if (inString) {
            // Inside string: validate escape sequence
            if (nextChar === "u") {
              // Handle \uXXXX unicode escape
              let hexDigits = "";
              let j = i + 2;
              while (j < result.length && hexDigits.length < 4 && isHexDigit(result[j])) {
                hexDigits += result[j];
                j++;
              }

              if (hexDigits.length === 4) {
                // Valid unicode escape - keep as is
                processedResult += "\\u" + hexDigits;
                i = j;
                continue;
              } else {
                // Invalid: \u without 4 hex digits - escape the backslash
                repairs.push(`Fixed invalid unicode escape \\u${hexDigits}`);
                processedResult += "\\\\u" + hexDigits;
                i = j;
                hasChanges = true;
                invalidEscapesFixed++;
                continue;
              }
            } else if (nextChar === " ") {
              // Invalid: \ (backslash-space) - remove backslash, keep space
              repairs.push("Fixed invalid escape sequence \\  (backslash-space)");
              processedResult += " ";
              i += 2;
              hasChanges = true;
              invalidEscapesFixed++;
              continue;
            } else if (VALID_ESCAPE_SEQUENCES.has(nextChar)) {
              // Valid escape sequence - keep as is
              processedResult += "\\" + nextChar;
              i += 2;
              continue;
            } else {
              // Invalid escape sequence - escape the backslash (make it literal)
              repairs.push(`Fixed invalid escape sequence \\${nextChar}`);
              processedResult += "\\\\" + nextChar;
              i += 2;
              hasChanges = true;
              invalidEscapesFixed++;
              continue;
            }
          } else {
            // Outside string: check if this is a valid escape (shouldn't happen in valid JSON, but handle gracefully)
            // Valid JSON escape sequences outside strings are not really a thing, but we'll preserve them
            if ('"\\/bfnrtu'.includes(nextChar)) {
              processedResult += char;
              escapeNext = true;
              i++;
              continue;
            }
            // If not a valid escape, treat as literal backslash
            processedResult += char;
            i++;
            continue;
          }
        } else {
          // Backslash at end of string - treat as literal
          processedResult += char;
          i++;
          continue;
        }
      }

      // Handle quotes (string boundaries)
      if (char === '"') {
        // Check if this quote is escaped by counting preceding backslashes
        let backslashCount = 0;
        let j = i - 1;
        while (j >= 0 && result[j] === "\\") {
          backslashCount++;
          j--;
        }
        // If even number of backslashes (or zero), this quote is not escaped
        if (backslashCount % 2 === 0) {
          inString = !inString;
        }
        processedResult += char;
        i++;
        continue;
      }

      // Handle characters based on whether we're inside or outside a string
      if (inString) {
        // Inside string: escape control characters that need escaping
        if (code >= 0x00 && code <= 0x1f) {
          // Control character
          if (code === 0x09) {
            // Tab - already valid as \t, keep as is
            processedResult += char;
          } else if (code === 0x0a) {
            // Newline - already valid as \n, keep as is
            processedResult += char;
          } else if (code === 0x0d) {
            // Carriage return - already valid as \r, keep as is
            processedResult += char;
          } else {
            // Other control characters need to be escaped
            const hex = code.toString(16).padStart(4, "0");
            processedResult += `\\u${hex}`;
            hasChanges = true;
            controlCharsEscaped++;
          }
        } else if (code === 0x7f) {
          // DEL character (0x7F) - also needs escaping in JSON strings
          processedResult += "\\u007f";
          hasChanges = true;
          controlCharsEscaped++;
        } else {
          processedResult += char;
        }
      } else {
        // Outside string: remove control and zero-width characters
        // Check if character is in the control char ranges (excluding \t, \n, \r)
        const shouldRemove =
          (code >= 0x00 && code <= 0x08) || // Control chars before tab
          (code >= 0x0b && code <= 0x0c) || // Vertical tab and form feed
          (code >= 0x0e && code <= 0x1f) || // Control chars after carriage return
          code === 0x200b || // Zero-width space
          code === 0x200c || // Zero-width non-joiner
          code === 0x200d || // Zero-width joiner
          code === 0xfeff; // BOM
        if (shouldRemove) {
          // Control character - remove it
          hasChanges = true;
          controlCharsRemoved++;
        } else {
          processedResult += char;
        }
      }

      i++;
    }

    result = processedResult;

    // Third pass: apply over-escape fixes (this affects string content)
    const beforeOverEscape = result;
    result = repairOverEscapedStringSequences(result);
    const overEscapesFixed = result !== beforeOverEscape;
    if (overEscapesFixed) {
      hasChanges = true;
    }

    // Fourth pass: fix any invalid escapes that may have been created by over-escape fixes
    // (e.g., \0 is not valid JSON, should be \u0000)
    // This is a simplified version that only handles \0 since it's the main case
    // Uses the StringStateTracker for cleaner state management
    const finalResult = result;
    let fixedNullEscapes = 0;
    let outputFinal = "";

    const tracker = createStringStateTracker(finalResult);

    while (tracker.position < tracker.length) {
      const state = tracker.getCurrentState();
      if (!state) break;

      const { char, index, inString, nextChar } = state;

      if (char === "\\") {
        if (nextChar !== undefined) {
          if (inString && nextChar === "0") {
            // Convert \0 to \u0000 (valid JSON)
            outputFinal += "\\u0000";
            tracker.advanceTo(index + 2); // Skip both \ and 0
            fixedNullEscapes++;
            hasChanges = true;
            continue;
          }
        }
        outputFinal += char;
        tracker.advance();
        continue;
      }

      outputFinal += char;
      tracker.advance();
    }

    if (fixedNullEscapes > 0) {
      repairs.push(
        `Fixed ${fixedNullEscapes} null escape sequence${fixedNullEscapes !== 1 ? "s" : ""} (\\0 -> \\u0000)`,
      );
    }

    result = outputFinal;

    // Build repairs summary
    if (hasChanges) {
      if (controlCharsRemoved > 0) {
        repairs.push(
          `Removed ${controlCharsRemoved} control character${controlCharsRemoved !== 1 ? "s" : ""} outside strings`,
        );
      }
      if (controlCharsEscaped > 0) {
        repairs.push(
          `Escaped ${controlCharsEscaped} control character${controlCharsEscaped !== 1 ? "s" : ""} in string values`,
        );
      }
      if (invalidEscapesFixed > 0) {
        repairs.push(
          `Fixed ${invalidEscapesFixed} invalid escape sequence${invalidEscapesFixed !== 1 ? "s" : ""}`,
        );
      }
      if (overEscapesFixed) {
        repairs.push(REPAIR_STEP.FIXED_OVER_ESCAPED_SEQUENCES);
      }
    }

    return {
      content: result,
      changed: hasChanges,
      description: hasChanges ? REPAIR_STEP.NORMALIZED_ESCAPE_SEQUENCES : undefined,
      repairs: hasChanges && repairs.length > 0 ? repairs : undefined,
    };
  } catch (error) {
    // If sanitization fails, return the original string
    logWarn(`normalizeCharacters sanitizer failed: ${String(error)}`);
    return {
      content: input,
      changed: false,
      description: undefined,
      repairs: [`Sanitizer failed: ${String(error)}`],
    };
  }
};
