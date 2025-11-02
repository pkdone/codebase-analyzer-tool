import { Sanitizer, SanitizerResult } from "./sanitizers-types";
import { SANITIZATION_STEP } from "../config/sanitization-steps.config";

/**
 * Sanitizer that fixes stray characters directly concatenated after string property values.
 *
 * This sanitizer addresses cases where LLM responses contain stray characters, words, or text
 * directly concatenated after the closing quote of a string value, which breaks JSON parsing.
 *
 * Examples of issues this sanitizer handles:
 * - `"type": "String"_` -> `"type": "String"`
 * - `"value": "test"word` -> `"value": "test"`
 * - `"name": "John"123` -> `"name": "John"`
 * - `"id": "abc"_word` -> `"id": "abc"`
 *
 * Strategy:
 * Uses regex to identify patterns where non-JSON characters appear directly after
 * a quoted string value, and removes the stray text while preserving proper JSON syntax.
 */
export const fixStrayCharsAfterPropertyValues: Sanitizer = (
  jsonString: string,
): SanitizerResult => {
  try {
    let sanitized = jsonString;
    let hasChanges = false;
    const diagnostics: string[] = [];

    // Pattern: quoted string value followed by stray characters before comma, closing delimiter, or newline
    // Matches: "value"strayChars where strayChars are not valid JSON tokens (comma, }, ], whitespace, etc.)
    // The stray characters can be underscores, word characters, or other non-JSON characters
    // Must be followed by whitespace then comma/closing delimiter, or newline (indicating end of property)
    // The (?:\s*[,}\]]|\s*\n) pattern matches either whitespace+delimiter or whitespace+newline
    const strayCharsAfterValuePattern =
      /("(?:[^"\\]|\\.)*")([a-zA-Z_$0-9]+)(?=\s*[,}\]]|\s*\n)/g;

    sanitized = sanitized.replace(
      strayCharsAfterValuePattern,
      (match, quotedValue, strayChars, offset, string) => {
        // Type assertions for regex match groups
        const quotedValueStr = typeof quotedValue === "string" ? quotedValue : "";
        const strayCharsStr = typeof strayChars === "string" ? strayChars : "";
        const offsetNum = typeof offset === "number" ? offset : undefined;
        const stringStr = typeof string === "string" ? string : sanitized;

        // Verify the context after the match to ensure we're in a valid property value position
        // Check what comes after the stray chars to ensure it's a valid terminator
        // The regex lookahead already ensures this, but we double-check for safety
        if (offsetNum !== undefined && stringStr && strayCharsStr.length > 0) {
          const afterMatchStart = offsetNum + match.length;
          const afterMatch = stringStr.substring(afterMatchStart, afterMatchStart + 20);
          const isValidAfterContext = /^\s*[,}\]]|^\s*\n/.test(afterMatch);

          if (isValidAfterContext) {
            hasChanges = true;
            diagnostics.push(
              `Removed stray characters "${strayCharsStr}" after value ${quotedValueStr}`,
            );
            // Return just the quoted value - the terminator after the stray chars will remain
            return quotedValueStr;
          }
        }

        return match;
      },
    );

    // Ensure hasChanges reflects actual changes
    hasChanges = sanitized !== jsonString;

    return {
      content: sanitized,
      changed: hasChanges,
      description: hasChanges
        ? SANITIZATION_STEP.FIXED_STRAY_CHARS_AFTER_PROPERTY_VALUES
        : undefined,
      diagnostics: hasChanges && diagnostics.length > 0 ? diagnostics : undefined,
    };
  } catch (error) {
    // If sanitization fails, return the original string
    console.warn(`fixStrayCharsAfterPropertyValues sanitizer failed: ${String(error)}`);
    return {
      content: jsonString,
      changed: false,
      description: undefined,
      diagnostics: [`Sanitizer failed: ${String(error)}`],
    };
  }
};

