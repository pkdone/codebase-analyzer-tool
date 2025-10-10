import type { Sanitizer } from "./sanitizers-types";

/**
 * Fix over-escaped sequences within JSON string content.
 *
 * LLMs sometimes generate excessively escaped characters, particularly when dealing
 * with code snippets (especially SQL, regex, or strings that contain quotes). This
 * function progressively reduces the number of backslashes to produce valid JSON.
 *
 * ## Common Over-Escaping Patterns
 *
 * When LLMs embed code containing special characters in JSON strings, they may
 * over-escape those characters multiple times:
 * - SQL: `REPLACE(field, '.', '')` becomes `REPLACE(field, \\\\\\'.\\\\\\'\\, \\\\\\'\\\\\\')`
 * - Path separators: `dir\file` becomes `dir\\\\file`
 * - Nested quotes: `"it's"` becomes `"it\\\\\\'s"`
 *
 * ## Replacement Strategy
 *
 * The replacements are applied in order from most-escaped to least-escaped patterns
 * to ensure proper normalization without over-correcting. Each regex targets a specific
 * malformation pattern commonly seen in LLM output.
 *
 * ## Known Limitations
 *
 * This is a best-effort heuristic approach. It handles the most common cases but may
 * not correctly handle all edge cases, especially:
 * - Mixed escaping levels within the same string
 * - Legitimate uses of multiple backslashes (rare in JSON but possible)
 * - Complex nested code snippets with multiple layers of escaping
 */
export function repairOverEscapedStringSequences(content: string): string {
  let fixed = content;

  // ═══════════════════════════════════════════════════════════════════════════
  // SINGLE QUOTE OVER-ESCAPING
  // ═══════════════════════════════════════════════════════════════════════════

  // Fixes 5-backslash quote: \\\\\' → '
  // Regex: /\\\\\\'/g
  // Literal pattern in source: 5 backslashes (escaped as 5× \\) + quote (escaped as \')
  // What it matches in actual string: 5 backslashes + single quote
  // Example: "it\\\\\\'s" (string with 5 backslashes before quote) → "it's"
  // Common in SQL like: REPLACE(field, \\\\\\'.\\\\\\'\\, \\\\\\'\\\\\\')"
  fixed = fixed.replaceAll(/\\\\\\'/g, "'");

  // Fixes 4-backslash quote: \\\\' → '
  // Regex: /\\\\'/g (4 escaped backslashes + escaped quote)
  // Example: "value\\\\'s" → "value's"
  fixed = fixed.replaceAll(/\\\\'/g, "'");

  // Fixes 3-backslash quote: \\' → '
  // Regex: /\\'/g (2 escaped backslashes + escaped quote)
  // Example: "value\\'s" → "value's"
  fixed = fixed.replaceAll(/\\'/g, "'");

  // ═══════════════════════════════════════════════════════════════════════════
  // SINGLE QUOTE + DOT COMBINATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  // Fixes 5-backslash quote followed by escaped dot: \\\\\\'\. → '.
  // Regex: /\\\\\\'\\\./g
  // Example: "user\\\\\\'\.name" → "user'.name"
  // Common in SQL column references with schemas
  fixed = fixed.replaceAll(/\\\\\\'\\\./g, "'.");

  // Fixes consecutive 5-backslash quotes: \\\\\\'\\\\\' → ''
  // Regex: /\\\\\\'\\\\\\'/g
  // Example: "\\\\\\'\\\\\\'" (two heavily escaped quotes) → "''"
  // Common in SQL empty string literals
  fixed = fixed.replaceAll(/\\\\\\'\\\\\\'/g, "''");

  // Fixes simple quote + dot: \\'\. → '.
  // Regex: /\\'\\\./g
  // Example: "user\\'\\.name" → "user'.name"
  fixed = fixed.replaceAll(/\\'\\\./g, "'.");

  // Fixes mixed quote escaping: \\'\\\\' → ''
  // Regex: /\\'\\\\'/g
  // Example: "\\'\\\\'" → "''"
  fixed = fixed.replaceAll(/\\'\\\\'/g, "''");

  // ═══════════════════════════════════════════════════════════════════════════
  // NULL CHARACTER OVER-ESCAPING
  // ═══════════════════════════════════════════════════════════════════════════

  // Fixes 5-backslash null: \\\\\0 → \0
  // Regex: /\\\\\\0/g
  // Example: "value\\\\\0" → "value\0"
  fixed = fixed.replaceAll(/\\\\\\0/g, "\\0");

  // Fixes 4-backslash null: \\\\0 → \0
  // Regex: /\\\\0/g
  // Example: "value\\\\0" → "value\0"
  fixed = fixed.replaceAll(/\\\\0/g, "\\0");

  // ═══════════════════════════════════════════════════════════════════════════
  // CODE SNIPPET PUNCTUATION (commas, parentheses)
  // ═══════════════════════════════════════════════════════════════════════════

  // Fixes 4-backslash comma: \\\\ , → ,
  // Regex: /\\\\\s*,/g
  // Example: "a\\\\, b" → "a, b"
  // Common in function parameters embedded in JSON
  fixed = fixed.replaceAll(/\\\\\s*,/g, ",");

  // Fixes 4-backslash closing paren: \\\\ ) → )
  // Regex: /\\\\\s*\)/g
  // Example: "func()\\\\)" → "func())"
  fixed = fixed.replaceAll(/\\\\\s*\)/g, ")");

  // Fixes 2-backslash comma: \\ , → ,
  // Regex: /\\,/g
  // Example: "a\\, b" → "a, b"
  fixed = fixed.replaceAll(/\\,/g, ",");

  // Fixes 2-backslash closing paren: \\ ) → )
  // Regex: /\\\)/g
  // Example: "func()\\)" → "func())"
  fixed = fixed.replaceAll(/\\\)/g, ")");

  return fixed;
}

export const overEscapedSequencesSanitizer: Sanitizer = (input) => {
  const result = repairOverEscapedStringSequences(input);
  if (result !== input) {
    return { content: result, changed: true, description: "Fixed over-escaped sequences" };
  }
  return { content: input, changed: false };
};
