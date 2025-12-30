/**
 * Strategy for fixing unescaped quotes inside string values.
 * Handles HTML attribute quotes and escaped quote issues.
 */

import type { LLMSanitizerConfig } from "../../../config/llm-module-config.types";
import type { SanitizerStrategy, StrategyResult } from "../pipeline/sanitizer-pipeline.types";

/**
 * Strategy that escapes unescaped quotes in JSON string values.
 */
export const unescapedQuoteFixer: SanitizerStrategy = {
  name: "UnescapedQuoteFixer",

  apply(input: string, _config?: LLMSanitizerConfig): StrategyResult {
    if (!input) {
      return { content: input, changed: false, diagnostics: [] };
    }

    let sanitized = input;
    const diagnostics: string[] = [];
    let hasChanges = false;

    // Fix HTML attribute quotes
    const attributeQuotePattern = /(=\s*)"([^"]*)"(\s*[>]|\s+[a-zA-Z]|(?=\s*"))/g;
    sanitized = sanitized.replace(attributeQuotePattern, (match, equalsAndSpace, value, after) => {
      const matchIndex = sanitized.lastIndexOf(match);
      if (matchIndex === -1) return match;

      const contextBefore = sanitized.substring(Math.max(0, matchIndex - 500), matchIndex);

      const isInStringValue =
        /:\s*"[^"]*=/.test(contextBefore) ||
        /:\s*[^"]*=/.test(contextBefore) ||
        contextBefore.includes('": "') ||
        contextBefore.includes('":{') ||
        (contextBefore.includes(":") && !/"\s*$/.exec(contextBefore));

      if (isInStringValue) {
        hasChanges = true;
        const afterStr = typeof after === "string" ? after : "";
        const spacesAfterMatch = /^\s*/.exec(afterStr);
        const spacesAfter = spacesAfterMatch?.[0] ?? "";
        const restAfter = afterStr.substring(spacesAfter.length);
        diagnostics.push(`Escaped quote in HTML attribute: = "${value}"`);
        return `${equalsAndSpace}\\"${value}\\"${spacesAfter}${restAfter}`;
      }
      return match;
    });

    // Fix escaped quotes followed by unescaped quotes
    const escapedQuoteFollowedByUnescapedPattern = /(\\")"(\s*\+|\s*\]|\s*,|(?=\s*[a-zA-Z_$]))/g;
    sanitized = sanitized.replace(
      escapedQuoteFollowedByUnescapedPattern,
      (match, _escapedQuote, after, offset: number, string: unknown) => {
        const stringStr = typeof string === "string" ? string : sanitized;
        const contextBefore = stringStr.substring(Math.max(0, offset - 500), offset);

        const isInStringValue =
          /:\s*"[^"]*`/.test(contextBefore) ||
          /:\s*"[^"]*\\/.test(contextBefore) ||
          contextBefore.includes('": "') ||
          (contextBefore.includes(":") && !/"\s*$/.exec(contextBefore));

        if (isInStringValue) {
          hasChanges = true;
          const afterStr = typeof after === "string" ? after : "";
          diagnostics.push(`Fixed escaped quote followed by unescaped quote: \\"" -> \\"\\")`);
          return `\\"\\"${afterStr}`;
        }
        return match;
      },
    );

    return {
      content: sanitized,
      changed: hasChanges,
      diagnostics,
    };
  },
};

