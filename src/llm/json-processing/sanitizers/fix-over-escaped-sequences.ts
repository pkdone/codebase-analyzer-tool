import type { Sanitizer } from "./sanitizers-types";

/**
 * Fix over-escaped sequences within JSON string content.
 *
 * LLMs sometimes generate excessively escaped characters, particularly when dealing
 * with code snippets or strings that contain quotes. This function progressively
 * reduces the number of backslashes to produce valid JSON.
 *
 * Common over-escaping patterns:
 * - Multiple backslashes before quotes: \\\\\' → '
 * - Over-escaped null characters: \\\\\0 → \0
 * - Escaped commas and parentheses: \\, → , or \\) → )
 *
 * The replacements are applied in order from most-escaped to least-escaped to
 * ensure proper normalization.
 */
export function repairOverEscapedStringSequences(content: string): string {
  let fixed = content;

  // Fix over-escaped single quotes (most to least escaped)
  // Pattern: \\\\\' (5 backslashes + quote) → '
  // Example: "it\\\\\\'s" → "it's"
  fixed = fixed.replace(/\\\\\\'/g, "'");

  // Pattern: \\\\' (4 backslashes + quote) → '
  // Example: "it\\\\'s" → "it's"
  fixed = fixed.replace(/\\\\'/g, "'");

  // Pattern: \\' (3 backslashes + quote) → '
  // Example: "it\\'s" → "it's"
  fixed = fixed.replace(/\\'/g, "'");

  // Fix over-escaped single quotes followed by period
  // Pattern: \\\\\\'\. (5 backslashes + quote + backslash + dot) → '.
  // Example: "user\\\\\\'\.name" → "user'.name"
  fixed = fixed.replace(/\\\\\\'\\\./g, "'.");

  // Pattern: \\\\\\'\\\\\\' (two 5-backslash quotes in sequence) → ''
  // Example: "\\\\\\'\\\\\\'" → "''"
  fixed = fixed.replace(/\\\\\\'\\\\\\'/g, "''");

  // Pattern: \\'\. (backslash + quote + backslash + dot) → '.
  // Example: "user\\'\\.name" → "user'.name"
  fixed = fixed.replace(/\\'\\\./g, "'.");

  // Pattern: \\'\\\\' (backslash + quote + backslash + backslash + quote) → ''
  // Example: "\\'\\\\'" → "''"
  fixed = fixed.replace(/\\'\\\\'/g, "''");

  // Fix over-escaped null characters
  // Pattern: \\\\\0 (5 backslashes + null) → \0
  // Example: "value\\\\\0" → "value\0"
  fixed = fixed.replace(/\\\\\\0/g, "\\0");

  // Pattern: \\\\0 (4 backslashes + null) → \0
  // Example: "value\\\\0" → "value\0"
  fixed = fixed.replace(/\\\\0/g, "\\0");

  // Fix over-escaped commas and parentheses (often from code snippets)
  // Pattern: \\\\ followed by comma → comma
  // Example: "a\\\\, b" → "a, b"
  fixed = fixed.replace(/\\\\\s*,/g, ",");

  // Pattern: \\\\ followed by closing parenthesis → )
  // Example: "func()\\\\)" → "func())"
  fixed = fixed.replace(/\\\\\s*\)/g, ")");

  // Pattern: \\ followed by comma → comma
  // Example: "a\\, b" → "a, b"
  fixed = fixed.replace(/\\,/g, ",");

  // Pattern: \\ followed by closing parenthesis → )
  // Example: "func()\\)" → "func())"
  fixed = fixed.replace(/\\\)/g, ")");

  return fixed;
}

export const overEscapedSequencesSanitizer: Sanitizer = (input) => {
  const result = repairOverEscapedStringSequences(input);
  if (result !== input) {
    return { content: result, changed: true, description: "Fixed over-escaped sequences" };
  }
  return { content: input, changed: false };
};
