import { Sanitizer, SanitizerResult } from "./sanitizers-types";
import { SANITIZATION_STEP } from "../config/sanitization-steps.config";

/**
 * Sanitizer that escapes control characters inside JSON string values.
 *
 * This sanitizer addresses cases where LLM responses contain control characters
 * (like \u0000-\u001F) inside string values, which break JSON parsing.
 *
 * Examples of issues this sanitizer handles:
 * - Control characters in string values that need to be escaped
 * - Characters like \n, \r, \t are already valid, but others need escaping
 *
 * The sanitizer identifies control characters within string values and
 * escapes them using JSON escape sequences.
 */
export const escapeControlCharsInStrings: Sanitizer = (
  jsonString: string,
): SanitizerResult => {
  try {
    const sanitized = jsonString;
    let hasChanges = false;
    const diagnostics: string[] = [];

    // Track if we're inside a string and handle escape sequences
    let inString = false;
    let escapeNext = false;
    let result = "";
    let controlCharCount = 0;

    for (let i = 0; i < sanitized.length; i++) {
      const char = sanitized[i];
      const code = char.charCodeAt(0);

      if (escapeNext) {
        // We're escaping this character, so add it as-is
        result += char;
        escapeNext = false;
        continue;
      }

      if (char === "\\") {
        // Check if this is an escape sequence
        if (i + 1 < sanitized.length) {
          const nextChar = sanitized[i + 1];
          // Valid JSON escape sequences: ", \, /, b, f, n, r, t, u
          if ('"\\/bfnrtu'.includes(nextChar)) {
            result += char;
            continue;
          }
        }
        // If not a valid escape, treat as escape for next char
        escapeNext = true;
        result += char;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        result += char;
        continue;
      }

      if (inString) {
        // Inside a string, check for control characters that need escaping
        // Valid whitespace control chars: \t (0x09), \n (0x0A), \r (0x0D)
        // All other control chars (0x00-0x08, 0x0B-0x0C, 0x0E-0x1F) need escaping
        if (code >= 0x00 && code <= 0x1f) {
          // Control character that needs escaping
          if (code === 0x09) {
            // Tab - already valid as \t
            result += char;
          } else if (code === 0x0a) {
            // Newline - already valid as \n
            result += char;
          } else if (code === 0x0d) {
            // Carriage return - already valid as \r
            result += char;
          } else {
            // Other control characters need to be escaped
            // Use Unicode escape sequence \uXXXX
            const hex = code.toString(16).padStart(4, "0");
            result += `\\u${hex}`;
            hasChanges = true;
            controlCharCount++;
          }
        } else {
          result += char;
        }
      } else {
        result += char;
      }
    }

    if (hasChanges) {
      diagnostics.push(
        `Escaped ${controlCharCount} control character${controlCharCount !== 1 ? "s" : ""} in string values`,
      );
    }

    return {
      content: hasChanges ? result : jsonString,
      changed: hasChanges,
      description: hasChanges
        ? SANITIZATION_STEP.ESCAPED_CONTROL_CHARS_IN_STRINGS
        : undefined,
      diagnostics: hasChanges && diagnostics.length > 0 ? diagnostics : undefined,
    };
  } catch (error) {
    // If sanitization fails, return the original string
    console.warn(`escapeControlCharsInStrings sanitizer failed: ${String(error)}`);
    return {
      content: jsonString,
      changed: false,
      description: undefined,
      diagnostics: [`Sanitizer failed: ${String(error)}`],
    };
  }
};

