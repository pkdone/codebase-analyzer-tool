import type { Sanitizer } from "./sanitizers-types";
import { SANITIZATION_STEP } from "../config/sanitization-steps.config";

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
 * Fixes invalid escape sequences within JSON string content.
 *
 * LLMs sometimes generate invalid escape sequences when describing code syntax
 * or other text that contains backslashes. For example:
 * - `\ ` (backslash-space) - invalid, used to describe XML catalog syntax
 * - `\x` - invalid, not supported in JSON (though valid in JavaScript)
 * - `\1` through `\9` - invalid, octal escapes not supported in JSON
 * - `\a`, `\c`, etc. - invalid, not valid JSON escape sequences
 * - `\u` without exactly 4 hex digits - invalid
 *
 * Valid JSON escape sequences are limited to:
 * - `\"`, `\\`, `\/`, `\b`, `\f`, `\n`, `\r`, `\t`, `\uXXXX`
 *
 * This sanitizer finds invalid escape sequences and fixes them by either:
 * 1. Replacing `\ ` with a space (removing the backslash, as space doesn't need escaping)
 * 2. Replacing other invalid escapes like `\x` with `\\x` (double backslash to represent literal backslash)
 * 3. Handling incomplete unicode escapes `\u` without 4 hex digits
 *
 * The sanitizer only operates on escape sequences within string literals (inside quotes),
 * not on the JSON structure itself.
 */
export function fixInvalidEscapeSequences(content: string): string {
  let result = "";
  let i = 0;
  let insideString = false;
  const diagnostics: string[] = [];
  let hasChanges = false;

  while (i < content.length) {
    const char = content[i];

    // Track when we enter/exit string literals
    if (char === '"') {
      // Check if this quote is escaped
      let backslashCount = 0;
      let j = i - 1;
      while (j >= 0 && content[j] === "\\") {
        backslashCount++;
        j--;
      }
      // If even number of backslashes (or zero), this quote is not escaped
      if (backslashCount % 2 === 0) {
        insideString = !insideString;
      }
      result += char;
      i++;
      continue;
    }

    // Only process escape sequences when inside a string
    if (insideString && char === "\\" && i + 1 < content.length) {
      const nextChar = content[i + 1];

      if (nextChar === "u") {
        // Handle \uXXXX unicode escape
        let hexDigits = "";
        let j = i + 2;
        // Read up to 4 hex digits
        while (j < content.length && hexDigits.length < 4 && isHexDigit(content[j])) {
          hexDigits += content[j];
          j++;
        }

        if (hexDigits.length === 4) {
          // Valid unicode escape - keep as is
          result += "\\u" + hexDigits;
          i = j;
          continue;
        } else {
          // Invalid: \u without 4 hex digits
          // Fix by escaping the backslash (making it literal)
          diagnostics.push(`Fixed invalid unicode escape \\u${hexDigits}`);
          result += "\\\\u" + hexDigits;
          i = j;
          hasChanges = true;
          continue;
        }
      } else if (nextChar === " ") {
        // Invalid: \ (backslash-space)
        // Fix by removing the backslash, keeping the space
        diagnostics.push("Fixed invalid escape sequence \\  (backslash-space)");
        result += " ";
        i += 2;
        hasChanges = true;
        continue;
      } else if (!VALID_ESCAPE_SEQUENCES.has(nextChar)) {
        // Invalid escape sequence (not in the valid set)
        // Fix by escaping the backslash (making it literal)
        diagnostics.push(`Fixed invalid escape sequence \\${nextChar}`);
        result += "\\\\" + nextChar;
        i += 2;
        hasChanges = true;
        continue;
      }
      // Valid escape sequence - keep as is
      result += "\\" + nextChar;
      i += 2;
      continue;
    }

    // Not an escape sequence or outside string - keep as is
    result += char;
    i++;
  }

  return hasChanges ? result : content;
}

export const fixInvalidEscapeSequencesSanitizer: Sanitizer = (input) => {
  let result = "";
  let i = 0;
  let insideString = false;
  const diagnostics: string[] = [];
  let hasChanges = false;

  while (i < input.length) {
    const char = input[i];

    // Track when we enter/exit string literals
    if (char === '"') {
      // Check if this quote is escaped
      let backslashCount = 0;
      let j = i - 1;
      while (j >= 0 && input[j] === "\\") {
        backslashCount++;
        j--;
      }
      // If even number of backslashes (or zero), this quote is not escaped
      if (backslashCount % 2 === 0) {
        insideString = !insideString;
      }
      result += char;
      i++;
      continue;
    }

    // Only process escape sequences when inside a string
    if (insideString && char === "\\" && i + 1 < input.length) {
      const nextChar = input[i + 1];

      if (nextChar === "u") {
        // Handle \uXXXX unicode escape
        let hexDigits = "";
        let j = i + 2;
        // Read up to 4 hex digits
        while (j < input.length && hexDigits.length < 4 && isHexDigit(input[j])) {
          hexDigits += input[j];
          j++;
        }

        if (hexDigits.length === 4) {
          // Valid unicode escape - keep as is
          result += "\\u" + hexDigits;
          i = j;
          continue;
        } else {
          // Invalid: \u without 4 hex digits
          // Fix by escaping the backslash (making it literal)
          diagnostics.push(`Fixed invalid unicode escape \\u${hexDigits}`);
          result += "\\\\u" + hexDigits;
          i = j;
          hasChanges = true;
          continue;
        }
      } else if (nextChar === " ") {
        // Invalid: \ (backslash-space)
        // Fix by removing the backslash, keeping the space
        diagnostics.push("Fixed invalid escape sequence \\  (backslash-space)");
        result += " ";
        i += 2;
        hasChanges = true;
        continue;
      } else if (!VALID_ESCAPE_SEQUENCES.has(nextChar)) {
        // Invalid escape sequence (not in the valid set)
        // Fix by escaping the backslash (making it literal)
        diagnostics.push(`Fixed invalid escape sequence \\${nextChar}`);
        result += "\\\\" + nextChar;
        i += 2;
        hasChanges = true;
        continue;
      }
      // Valid escape sequence - keep as is
      result += "\\" + nextChar;
      i += 2;
      continue;
    }

    // Not an escape sequence or outside string - keep as is
    result += char;
    i++;
  }

  if (hasChanges) {
    return {
      content: result,
      changed: true,
      description: SANITIZATION_STEP.FIXED_INVALID_ESCAPE_SEQUENCES,
      diagnostics: diagnostics.length > 0 ? diagnostics : undefined,
    };
  }
  return { content: input, changed: false };
};
