import { Sanitizer, SanitizerResult } from "./sanitizers-types";
import { logWarn } from "../../../utils/logging";
import { isInStringAt } from "../utils/parser-context-utils";

/**
 * Sanitizer that removes JavaScript-style comments from JSON-like text.
 *
 * LLMs sometimes include comments in their JSON output, which causes parsing to fail.
 * This sanitizer removes these comments while being careful not to remove content
 * that appears inside string values.
 *
 * ## Purpose
 * JSON does not support comments, but LLMs may include them in their responses.
 * This sanitizer removes:
 * - Single-line comments (starting with //)
 * - Multi-line comments (wrapped in slash-asterisk and asterisk-slash)
 *
 * ## Implementation
 * Uses regex patterns to identify and remove comments, with careful handling
 * to avoid removing content that appears inside string literals.
 *
 * @param input - The raw string content to sanitize
 * @returns Sanitizer result with comments removed
 */
export const removeComments: Sanitizer = (input: string): SanitizerResult => {
  try {
    if (!input) {
      return { content: input, changed: false };
    }

    let sanitized = input;
    const diagnostics: string[] = [];

    // Pattern 1: Remove multi-line comments /* ... */
    // Use non-greedy match to handle multiple comments
    const multiLineCommentPattern = /\/\*[\s\S]*?\*\//g;
    sanitized = sanitized.replace(multiLineCommentPattern, (match, offset: number) => {
      // Don't remove if we're inside a string
      if (isInStringAt(offset, sanitized)) {
        return match;
      }

      const matchStr = typeof match === "string" ? match : "";
      const preview = matchStr.length > 30 ? `${matchStr.substring(0, 27)}...` : matchStr;
      if (diagnostics.length < 10) {
        diagnostics.push(`Removed multi-line comment: /* ${preview} */`);
      }
      return "";
    });

    // Pattern 2: Remove single-line comments //
    // Match from // to end of line, but not if // is inside a string
    // Also match the newline after the comment if it's at the start of a line
    const singleLineCommentPattern = /\/\/.*(?:\n|$)/g;
    sanitized = sanitized.replace(singleLineCommentPattern, (match, offset: number) => {
      // Don't remove if we're inside a string
      if (isInStringAt(offset, sanitized)) {
        return match;
      }

      const matchStr = typeof match === "string" ? match : "";
      const preview = matchStr.length > 30 ? `${matchStr.substring(0, 27)}...` : matchStr;
      if (diagnostics.length < 10) {
        diagnostics.push(`Removed single-line comment: // ${preview}`);
      }
      // If comment is at the start of the string, remove it completely
      // Otherwise, replace with newline to preserve structure
      if (offset === 0) {
        return "";
      }
      // If the match ends with newline, keep it; otherwise return empty
      return matchStr.endsWith("\n") ? "\n" : "";
    });

    // Check if content actually changed
    if (sanitized === input) {
      return { content: input, changed: false };
    }

    return {
      content: sanitized,
      changed: true,
      description: "Removed comments from JSON",
      diagnostics: diagnostics.length > 0 ? diagnostics : undefined,
    };
  } catch (error) {
    logWarn(`removeComments sanitizer failed: ${String(error)}`);
    return {
      content: input,
      changed: false,
      description: undefined,
      diagnostics: [`Sanitizer failed: ${String(error)}`],
    };
  }
};
