import type { Sanitizer } from "./sanitizers-types";
import { SANITIZATION_STEP } from "../config/sanitization-steps.config";

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
  // ═══════════════════════════════════════════════════════════════════════════
  // SINGLE QUOTE OVER-ESCAPING
  // ═══════════════════════════════════════════════════════════════════════════
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

  // ═══════════════════════════════════════════════════════════════════════════
  // SINGLE QUOTE + DOT COMBINATIONS
  // ═══════════════════════════════════════════════════════════════════════════
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

  // ═══════════════════════════════════════════════════════════════════════════
  // NULL CHARACTER OVER-ESCAPING
  // ═══════════════════════════════════════════════════════════════════════════
  [/\\\\\\0/g, "\\0", "Fixes 5-backslash null: \\\\\\\\\\0 → \\0"],
  [/\\\\0/g, "\\0", "Fixes 4-backslash null: \\\\\\\\0 → \\0"],

  // ═══════════════════════════════════════════════════════════════════════════
  // CODE SNIPPET PUNCTUATION (commas, parentheses)
  // ═══════════════════════════════════════════════════════════════════════════
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

  for (const [pattern, replacement] of REPLACEMENT_PATTERNS) {
    fixed = fixed.replaceAll(pattern, replacement);
  }

  return fixed;
}

export const overEscapedSequencesSanitizer: Sanitizer = (input) => {
  const result = repairOverEscapedStringSequences(input);
  if (result !== input) {
    return {
      content: result,
      changed: true,
      description: SANITIZATION_STEP.FIXED_OVER_ESCAPED_SEQUENCES,
    };
  }
  return { content: input, changed: false };
};
