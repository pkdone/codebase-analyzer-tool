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
    // 2. A complete line that doesn't start with valid JSON tokens (even with leading whitespace)
    // 3. Followed by newline and then a valid JSON token (quote, brace, or bracket)
    //
    // The stray line pattern:
    // - Can have leading whitespace (but should not be valid indented JSON)
    // - Doesn't start with quote, brace, bracket (even after whitespace)
    // - Doesn't match valid indented JSON pattern (whitespace + quote/brace/bracket)
    // - Can contain any characters (file paths, text, hyphenated words, etc.)
    //
    // Valid JSON line starts with:
    // - " (quoted property or value)
    // - { or [ (object/array start)
    // - } or ] (closing delimiter)
    // - whitespace + " or { or [ (indented JSON)
    //
    // Pattern breakdown:
    // - ([}\],]|"): closing delimiter (}, ], comma, or closing quote followed by comma)
    // - (\s*): optional whitespace after delimiter
    // - \n: newline
    // - (\s*): optional leading whitespace on stray line
    // - ([^"{}[\n]+): stray line content (doesn't start with quote, brace, bracket even after whitespace)
    //   This includes hyphenated words, file paths, and other text
    // - \n: newline after stray line
    // - (\s*): optional whitespace before next token
    // - (["{\[]): next valid JSON token (quote, opening brace, or opening bracket)
    //
    // Note: We also need to handle cases where the delimiter is ], or }, (closing bracket/brace + comma)
    // And cases where we have ", followed by newline (closing quote + comma in property value)
    // This requires multiple patterns to match different scenarios
    const precisePattern = /([}\],]|",)(\s*)\n(\s*)([^"{}[\n]+)\n(\s*)([{"[])/g;

    // Second pattern: Handle cases where delimiter is ], or }, (closing bracket/brace + comma on newline)
    // Matches: ],\nprocrastinate\n  "property" or },\ntext\n  "property" or ],\n procrastinate\n  "property"
    // Updated to handle stray lines with leading whitespace
    const delimiterCommaPattern = /([}\]]\s*,\s*)\n(\s*)([^"{}[\n]+)\n(\s*)([{"[])/g;

    sanitized = sanitized.replace(
      precisePattern,
      (
        match,
        delimiter,
        whitespaceBefore,
        strayLineWhitespace,
        strayLineContent,
        whitespaceAfter,
        nextToken,
      ) => {
        // Type assertions for regex match groups
        const delimiterStr = typeof delimiter === "string" ? delimiter : "";
        const whitespaceBeforeStr = typeof whitespaceBefore === "string" ? whitespaceBefore : "";
        const strayLineWhitespaceStr =
          typeof strayLineWhitespace === "string" ? strayLineWhitespace : "";
        const strayLineContentStr = typeof strayLineContent === "string" ? strayLineContent : "";
        const whitespaceAfterStr = typeof whitespaceAfter === "string" ? whitespaceAfter : "";
        const nextTokenStr = typeof nextToken === "string" ? nextToken : "";

        // Reconstruct the full stray line (whitespace + content)
        const fullStrayLine = strayLineWhitespaceStr + strayLineContentStr;

        // Verify the context: the stray line shouldn't be valid JSON
        // Check if the line (after trimming) starts with something that could be valid JSON
        const trimmedStrayLine = fullStrayLine.trim();
        const startsWithValidJsonToken = /^["{}[\]]/.test(trimmedStrayLine);

        // Check if it's valid indented JSON (whitespace + quote/brace/bracket)
        const isIndentedJson = /^\s+["{[]/.test(fullStrayLine);

        // Also check if it's just whitespace (which is valid between structures)
        const isJustWhitespace = /^\s*$/.test(fullStrayLine);

        // Don't remove if it looks like valid JSON or is just whitespace
        if (startsWithValidJsonToken || isJustWhitespace || isIndentedJson) {
          return match;
        }

        // Verify the delimiter context - should be after a closing structure
        // Also handle ", pattern (closing quote + comma from property value)
        const isValidDelimiter = /[}\],]|",/.test(delimiterStr);

        // Verify the next token is valid JSON (quote, brace, or bracket)
        const isValidNextToken = /[{"[]/.test(nextTokenStr);

        if (isValidDelimiter && isValidNextToken) {
          hasChanges = true;
          // Abbreviate long stray lines in diagnostics
          const displayLine =
            trimmedStrayLine.length > 60
              ? `${trimmedStrayLine.substring(0, 57)}...`
              : trimmedStrayLine;
          diagnostics.push(`Removed stray line: "${displayLine}"`);

          // Reconstruct without the stray line: delimiter + whitespace + newline + next token with whitespace
          return `${delimiterStr}${whitespaceBeforeStr}\n${whitespaceAfterStr}${nextTokenStr}`;
        }

        return match;
      },
    );

    // Second pass: Handle cases where the delimiter includes a comma (], or },)
    sanitized = sanitized.replace(
      delimiterCommaPattern,
      (
        match,
        delimiterComma,
        strayLineWhitespace,
        strayLineContent,
        whitespaceAfter,
        nextToken,
      ) => {
        // Type assertions for regex match groups
        const delimiterCommaStr = typeof delimiterComma === "string" ? delimiterComma : "";
        const strayLineWhitespaceStr =
          typeof strayLineWhitespace === "string" ? strayLineWhitespace : "";
        const strayLineContentStr = typeof strayLineContent === "string" ? strayLineContent : "";
        const whitespaceAfterStr = typeof whitespaceAfter === "string" ? whitespaceAfter : "";
        const nextTokenStr = typeof nextToken === "string" ? nextToken : "";

        // Reconstruct the full stray line (whitespace + content)
        const fullStrayLine = strayLineWhitespaceStr + strayLineContentStr;

        // Verify the context: the stray line shouldn't be valid JSON
        const trimmedStrayLine = fullStrayLine.trim();
        const startsWithValidJsonToken = /^["{}[\]]/.test(trimmedStrayLine);

        // Check if it's valid indented JSON (whitespace + quote/brace/bracket)
        const isIndentedJson = /^\s+["{[]/.test(fullStrayLine);

        const isJustWhitespace = /^\s*$/.test(fullStrayLine);

        // Don't remove if it looks like valid JSON or is just whitespace
        if (startsWithValidJsonToken || isJustWhitespace || isIndentedJson) {
          return match;
        }

        // Verify the delimiter context - should be after a closing bracket/brace with comma
        const isValidDelimiterComma = /[}\]]\s*,\s*$/.test(delimiterCommaStr);

        // Verify the next token is valid JSON (quote, brace, or bracket)
        const isValidNextToken = /[{"[]/.test(nextTokenStr);

        if (isValidDelimiterComma && isValidNextToken) {
          hasChanges = true;
          // Abbreviate long stray lines in diagnostics
          const displayLine =
            trimmedStrayLine.length > 60
              ? `${trimmedStrayLine.substring(0, 57)}...`
              : trimmedStrayLine;
          diagnostics.push(`Removed stray line: "${displayLine}"`);

          // Reconstruct without the stray line: delimiter+comma + newline + next token with whitespace
          return `${delimiterCommaStr}\n${whitespaceAfterStr}${nextTokenStr}`;
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
