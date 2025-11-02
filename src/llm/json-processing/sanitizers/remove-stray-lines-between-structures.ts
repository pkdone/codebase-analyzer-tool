import { Sanitizer, SanitizerResult } from "./sanitizers-types";
import { SANITIZATION_STEP } from "../config/sanitization-steps.config";

/**
 * Sanitizer that removes complete stray lines that appear between JSON structures.
 *
 * This sanitizer addresses cases where LLM responses contain complete lines of stray text
 * inserted between JSON properties or after arrays/objects close, which breaks JSON parsing.
 *
 * Examples of issues this sanitizer handles:
 * - A file path line appearing between properties:
 *   ```
 *   ],
 *   src/main/java/com/example/MyClass.java
 *   "publicConstants": []
 *   ```
 *   -> Removes the stray file path line
 *
 * - Comments or explanatory text between structures:
 *   ```
 *   },
 *   This is some explanation text
 *   "nextProperty": "value"
 *   ```
 *   -> Removes the stray explanation line
 *
 * Strategy:
 * Uses regex to identify patterns where a complete line appears between valid JSON structures.
 * The line must:
 * 1. Appear after a closing delimiter (], }, or comma with optional whitespace) followed by newline
 * 2. Not start with a valid JSON token (quote, brace, bracket, or whitespace + valid token)
 * 3. Be followed by a newline and then a valid JSON token (quote, brace, or bracket)
 *
 * This is different from other stray text sanitizers which handle:
 * - Text directly concatenated to property names (no newlines)
 * - Stray characters at the start of lines (prefixes)
 * - Stray characters after property values (suffixes)
 */
export const removeStrayLinesBetweenStructures: Sanitizer = (
  jsonString: string,
): SanitizerResult => {
  try {
    let sanitized = jsonString;
    let hasChanges = false;
    const diagnostics: string[] = [];

    // Pattern to match stray lines between JSON structures:
    // 1. After closing delimiter (], }, or ,) with optional whitespace, followed by newline
    // 2. A complete line that doesn't start with valid JSON tokens
    // 3. Followed by newline and then a valid JSON token (quote, brace, or bracket)
    //
    // The stray line pattern:
    // - Doesn't start with quote, brace, bracket
    // - Doesn't start with whitespace followed by quote, brace, bracket (valid indented JSON)
    // - Can contain any characters (file paths, text, etc.)
    //
    // Valid JSON line starts with:
    // - " (quoted property or value)
    // - { or [ (object/array start)
    // - } or ] (closing delimiter)
    // - whitespace + " or { or [ (indented JSON)
    //
    // Pattern breakdown:
    // - ([}\],]): closing delimiter (}, ], or comma)
    // - (\s*): optional whitespace after delimiter
    // - \n: newline
    // - ([^\s"{}[\]]): stray line starts with non-whitespace, non-JSON token character
    // - ([^\n]*): rest of the stray line (can contain anything except newline)
    // - \n: newline after stray line
    // - (\s*): optional whitespace before next token
    // - (["{\[]): next valid JSON token (quote, opening brace, or opening bracket)
    const precisePattern = /([}\],])(\s*)\n([^\s"{}[\]]+[^\n]*)\n(\s*)([{"[])/g;

    sanitized = sanitized.replace(precisePattern, (match, delimiter, whitespaceBefore, strayLine, whitespaceAfter, nextToken) => {
      // Type assertions for regex match groups
      const delimiterStr = typeof delimiter === "string" ? delimiter : "";
      const whitespaceBeforeStr = typeof whitespaceBefore === "string" ? whitespaceBefore : "";
      const strayLineStr = typeof strayLine === "string" ? strayLine : "";
      const whitespaceAfterStr = typeof whitespaceAfter === "string" ? whitespaceAfter : "";
      const nextTokenStr = typeof nextToken === "string" ? nextToken : "";

      // Verify the context: the stray line shouldn't be valid JSON
      // Check if the line starts with something that could be valid JSON
      const trimmedStrayLine = strayLineStr.trim();
      const startsWithValidJsonToken = /^["{}[\]]/.test(trimmedStrayLine);

      // Also check if it's just whitespace (which is valid between structures)
      const isJustWhitespace = /^\s*$/.test(strayLineStr);

      // Don't remove if it looks like valid JSON or is just whitespace
      if (startsWithValidJsonToken || isJustWhitespace) {
        return match;
      }

      // Verify the delimiter context - should be after a closing structure
      const isValidDelimiter = /[}\],]/.test(delimiterStr);

      // Verify the next token is valid JSON (quote, brace, or bracket)
      const isValidNextToken = /[{"[]/.test(nextTokenStr);

      if (isValidDelimiter && isValidNextToken) {
        hasChanges = true;
        // Abbreviate long stray lines in diagnostics
        const displayLine =
          strayLineStr.length > 60 ? `${strayLineStr.substring(0, 57)}...` : strayLineStr;
        diagnostics.push(`Removed stray line: "${displayLine}"`);

        // Reconstruct without the stray line: delimiter + whitespace + newline + next token with whitespace
        return `${delimiterStr}${whitespaceBeforeStr}\n${whitespaceAfterStr}${nextTokenStr}`;
      }

      return match;
    });

    // Ensure hasChanges reflects actual changes
    hasChanges = sanitized !== jsonString;

    return {
      content: sanitized,
      changed: hasChanges,
      description: hasChanges
        ? SANITIZATION_STEP.REMOVED_STRAY_LINES_BETWEEN_STRUCTURES
        : undefined,
      diagnostics: hasChanges && diagnostics.length > 0 ? diagnostics : undefined,
    };
  } catch (error) {
    // If sanitization fails, return the original string
    console.warn(`removeStrayLinesBetweenStructures sanitizer failed: ${String(error)}`);
    return {
      content: jsonString,
      changed: false,
      description: undefined,
      diagnostics: [`Sanitizer failed: ${String(error)}`],
    };
  }
};

