/**
 * Strategy for fixing unescaped quotes inside string values.
 * Handles HTML attribute quotes and escaped quote issues.
 */

import type { LLMSanitizerConfig } from "../../../config/llm-module-config.types";
import type { SanitizerStrategy, StrategyResult } from "../pipeline/sanitizer-pipeline.types";
import { parsingHeuristics } from "../../constants/json-processing.config";

/**
 * Strategy that escapes unescaped quotes in JSON string values.
 */
export const unescapedQuoteFixer: SanitizerStrategy = {
  name: "UnescapedQuoteFixer",

  apply(input: string, _config?: LLMSanitizerConfig): StrategyResult {
    if (!input) {
      return { content: input, changed: false, repairs: [] };
    }

    let sanitized = input;
    const repairs: string[] = [];
    let hasChanges = false;

    // Fix HTML attribute quotes
    const attributeQuotePattern = /(=\s*)"([^"]*)"(\s*[>]|\s+[a-zA-Z]|(?=\s*"))/g;
    sanitized = sanitized.replace(attributeQuotePattern, (match, equalsAndSpace, value, after) => {
      const matchIndex = sanitized.lastIndexOf(match);
      if (matchIndex === -1) return match;

      const contextBefore = sanitized.substring(
        Math.max(0, matchIndex - parsingHeuristics.CONTEXT_LOOKBACK_LENGTH),
        matchIndex,
      );

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
        repairs.push(`Escaped quote in HTML attribute: = "${value}"`);
        return `${equalsAndSpace}\\"${value}\\"${spacesAfter}${restAfter}`;
      }

      return match;
    });

    // Fix escaped quotes followed by unescaped quotes
    const escapedQuoteFollowedByUnescapedPattern = /(\\")"(\s*\+|\s*\]|\s*,|(?=\s*[a-zA-Z_$]))/g;
    sanitized = sanitized.replace(
      escapedQuoteFollowedByUnescapedPattern,
      (match, _escapedQuote, after, offset: number, fullString: string) => {
        const contextBefore = fullString.substring(
          Math.max(0, offset - parsingHeuristics.CONTEXT_LOOKBACK_LENGTH),
          offset,
        );

        const isInStringValue =
          /:\s*"[^"]*`/.test(contextBefore) ||
          /:\s*"[^"]*\\/.test(contextBefore) ||
          contextBefore.includes('": "') ||
          (contextBefore.includes(":") && !/"\s*$/.exec(contextBefore));

        if (isInStringValue) {
          hasChanges = true;
          const afterStr = typeof after === "string" ? after : "";
          repairs.push(`Fixed escaped quote followed by unescaped quote: \\"" -> \\"\\")`);
          return `\\"\\"${afterStr}`;
        }

        return match;
      },
    );

    return {
      content: sanitized,
      changed: hasChanges,
      repairs,
    };
  },
};
