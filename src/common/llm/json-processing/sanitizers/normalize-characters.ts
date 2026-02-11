import { Sanitizer, SanitizerResult } from "./sanitizers-types";
import { REPAIR_STEP } from "../constants/repair-steps.config";
import { logWarn } from "../../../utils/logging";
import { createStringStateTracker } from "../utils/string-state-iterator";
import { repairOverEscapedStringSequences } from "./repair-over-escaped-sequences";

/**
 * Regex patterns for curly quote detection - hoisted for performance.
 * Matching Unicode quote variants:
 * - Double quotes: U+201C-U+201F (left/right double, double low-9, double high-reversed-9)
 * - Single quotes: U+2018-U+201B (left/right single, single low-9, single high-reversed-9)
 *                  U+02BB-U+02BC (modifier letter turned comma and apostrophe)
 */
const DOUBLE_QUOTE_PATTERN = /[\u201C-\u201F]/g;
const SINGLE_QUOTE_PATTERN = /[\u2018-\u201B\u02BB\u02BC]/g;

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
    // Note: Backticks (U+0060) and acute accent (U+00B4) are excluded as they have different semantic purposes
    const doubleQuoteMatches = result.match(DOUBLE_QUOTE_PATTERN) ?? [];
    const singleQuoteMatches = result.match(SINGLE_QUOTE_PATTERN) ?? [];

    const doubleQuoteCount = doubleQuoteMatches.length;
    const singleQuoteCount = singleQuoteMatches.length;

    if (doubleQuoteCount > 0 || singleQuoteCount > 0) {
      hasChanges = true;

      // Replace all double quote variants with ASCII double quote
      result = result.replace(DOUBLE_QUOTE_PATTERN, '"');

      // Replace all single quote variants with ASCII single quote
      result = result.replace(SINGLE_QUOTE_PATTERN, "'");

      if (doubleQuoteCount > 0) {
        repairs.push(
          `Converted ${doubleQuoteCount} curly/smart double quote${doubleQuoteCount !== 1 ? "s" : ""} to regular quote`,
        );
      }

      if (singleQuoteCount > 0) {
        repairs.push(
          `Converted ${singleQuoteCount} curly/smart single quote${singleQuoteCount !== 1 ? "s" : ""} to regular quote`,
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
    // Uses array buffer to avoid O(n²) string concatenation
    const processedChars: string[] = [];
    while (i < result.length) {
      const char = result[i];
      const code = char.codePointAt(0) ?? 0;

      if (escapeNext) {
        // Previous character was a backslash, this character is escaped
        processedChars.push(char);
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
                processedChars.push("\\u", hexDigits);
                i = j;
                continue;
              } else {
                // Invalid: \u without 4 hex digits - escape the backslash
                repairs.push(`Fixed invalid unicode escape \\u${hexDigits}`);
                processedChars.push("\\\\u", hexDigits);
                i = j;
                hasChanges = true;
                invalidEscapesFixed++;
                continue;
              }
            } else if (nextChar === " ") {
              // Invalid: \ (backslash-space) - remove backslash, keep space
              repairs.push("Fixed invalid escape sequence \\  (backslash-space)");
              processedChars.push(" ");
              i += 2;
              hasChanges = true;
              invalidEscapesFixed++;
              continue;
            } else if (VALID_ESCAPE_SEQUENCES.has(nextChar)) {
              // Valid escape sequence - keep as is
              processedChars.push("\\", nextChar);
              i += 2;
              continue;
            } else {
              // Invalid escape sequence - escape the backslash (make it literal)
              repairs.push(`Fixed invalid escape sequence \\${nextChar}`);
              processedChars.push("\\\\", nextChar);
              i += 2;
              hasChanges = true;
              invalidEscapesFixed++;
              continue;
            }
          } else {
            // Outside string: check if this is a valid escape (shouldn't happen in valid JSON, but handle gracefully)
            // Valid JSON escape sequences outside strings are not really a thing, but we'll preserve them
            if ('"\\/bfnrtu'.includes(nextChar)) {
              processedChars.push(char);
              escapeNext = true;
              i++;
              continue;
            }
            // If not a valid escape, treat as literal backslash
            processedChars.push(char);
            i++;
            continue;
          }
        } else {
          // Backslash at end of string - treat as literal
          processedChars.push(char);
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
        processedChars.push(char);
        i++;
        continue;
      }

      // Handle characters based on whether we're inside or outside a string
      if (inString) {
        // Inside string: escape control characters that need escaping
        // JSON does NOT allow raw control characters inside string literals - they must be escaped
        if (code >= 0x00 && code <= 0x1f) {
          // Control character - all control chars must be escaped in JSON strings
          if (code === 0x09) {
            // Tab - escape as \t
            processedChars.push("\\t");
            hasChanges = true;
            controlCharsEscaped++;
          } else if (code === 0x0a) {
            // Newline (LF) - escape as \n (raw newline is NOT valid in JSON strings)
            processedChars.push("\\n");
            hasChanges = true;
            controlCharsEscaped++;
          } else if (code === 0x0d) {
            // Carriage return - escape as \r
            processedChars.push("\\r");
            hasChanges = true;
            controlCharsEscaped++;
          } else {
            // Other control characters need to be escaped as unicode
            const hex = code.toString(16).padStart(4, "0");
            processedChars.push(`\\u${hex}`);
            hasChanges = true;
            controlCharsEscaped++;
          }
        } else if (code === 0x7f) {
          // DEL character (0x7F) - also needs escaping in JSON strings
          processedChars.push("\\u007f");
          hasChanges = true;
          controlCharsEscaped++;
        } else {
          processedChars.push(char);
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
          processedChars.push(char);
        }
      }

      i++;
    }

    result = processedChars.join("");

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
    const outputFinalChars: string[] = [];

    const tracker = createStringStateTracker(finalResult);

    while (tracker.position < tracker.length) {
      const state = tracker.getCurrentState();
      if (!state) break;

      const { char, index, inString, nextChar } = state;

      if (char === "\\") {
        if (nextChar !== undefined) {
          if (inString && nextChar === "0") {
            // Convert \0 to \u0000 (valid JSON)
            outputFinalChars.push("\\u0000");
            tracker.advanceTo(index + 2); // Skip both \ and 0
            fixedNullEscapes++;
            hasChanges = true;
            continue;
          }
        }
        outputFinalChars.push(char);
        tracker.advance();
        continue;
      }

      outputFinalChars.push(char);
      tracker.advance();
    }

    if (fixedNullEscapes > 0) {
      repairs.push(
        `Fixed ${fixedNullEscapes} null escape sequence${fixedNullEscapes !== 1 ? "s" : ""} (\\0 -> \\u0000)`,
      );
    }

    result = outputFinalChars.join("");

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
