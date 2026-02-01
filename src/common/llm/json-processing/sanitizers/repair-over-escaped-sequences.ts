/**
 * Repair over-escaped string sequences in JSON content.
 *
 * LLMs sometimes generate excessively escaped characters, particularly when dealing
 * with code snippets (especially SQL, regex, or strings that contain quotes). This
 * module provides functions to progressively reduce the number of backslashes to
 * produce valid JSON.
 *
 * Extracted from normalize-characters.ts for better modularity and reusability.
 */

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
export const OVER_ESCAPE_REPLACEMENT_PATTERNS: readonly ReplacementPattern[] = [
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
 * Repairs over-escaped sequences within JSON string content.
 *
 * LLMs sometimes generate excessively escaped characters, particularly when dealing
 * with code snippets (especially SQL, regex, or strings that contain quotes). This
 * function progressively reduces the number of backslashes to produce valid JSON.
 *
 * The patterns are applied in order from most-escaped to least-escaped to ensure
 * proper normalization without over-correcting.
 *
 * @param content - The JSON string content to repair
 * @returns The content with over-escaped sequences fixed
 *
 * @example
 * // SQL with over-escaped single quotes
 * repairOverEscapedStringSequences("SELECT * WHERE name = \\\\'John\\\\'")
 * // Returns: "SELECT * WHERE name = 'John'"
 *
 * @example
 * // Function call with over-escaped parentheses
 * repairOverEscapedStringSequences("myFunc\\\\(x\\\\)")
 * // Returns: "myFunc(x)"
 */
export function repairOverEscapedStringSequences(content: string): string {
  let fixed = content;

  for (const [pattern, replacement] of OVER_ESCAPE_REPLACEMENT_PATTERNS) {
    fixed = fixed.replaceAll(pattern, replacement);
  }

  return fixed;
}

/**
 * Checks if content contains any over-escaped sequences that can be repaired.
 *
 * @param content - The content to check
 * @returns True if the content contains patterns that would be fixed
 */
export function hasOverEscapedSequences(content: string): boolean {
  return OVER_ESCAPE_REPLACEMENT_PATTERNS.some(([pattern]) => pattern.test(content));
}
