/**
 * Strategy for fixing string concatenation expressions in JSON.
 * Handles JavaScript-style string concatenation like "BASE + '/path'" or "str1" + "str2".
 */

import type { LLMSanitizerConfig } from "../../../config/llm-module-config.types";
import type { SanitizerStrategy, StrategyResult } from "../pipeline/sanitizer-pipeline.types";
import { CONCATENATION_REGEXES } from "../../constants/regex.constants";

/** Truncation length for diagnostic messages */
const DIAGNOSTIC_TRUNCATION_LENGTH = 30;

/**
 * Strategy that fixes concatenation chains in JSON values.
 * Handles cases like: "BASE + '/path'" -> ""/path""
 */
export const concatenationFixer: SanitizerStrategy = {
  name: "ConcatenationFixer",

  apply(input: string, _config?: LLMSanitizerConfig): StrategyResult {
    if (!input || !input.includes("+") || !input.includes('"')) {
      return { content: input, changed: false, diagnostics: [] };
    }

    let sanitized = input;
    const diagnostics: string[] = [];
    let changeCount = 0;

    // Step 1: Replace identifier-only chains with empty string
    sanitized = sanitized.replace(CONCATENATION_REGEXES.IDENTIFIER_ONLY_CHAIN, (_match, prefix) => {
      diagnostics.push("Replaced identifier-only chain with empty string");
      changeCount++;
      return `${prefix}""`;
    });

    // Step 2: Keep only literal when identifiers precede it
    sanitized = sanitized.replace(
      CONCATENATION_REGEXES.IDENTIFIER_THEN_LITERAL,
      (_match: string, prefix: string, literal: string) => {
        const truncatedLiteral =
          literal.length > DIAGNOSTIC_TRUNCATION_LENGTH
            ? `${literal.substring(0, DIAGNOSTIC_TRUNCATION_LENGTH)}...`
            : literal;
        diagnostics.push(`Kept literal "${truncatedLiteral}" from identifier chain`);
        changeCount++;
        return `${prefix}"${literal}"`;
      },
    );

    // Step 3: Keep only literal when identifiers follow it
    sanitized = sanitized.replace(
      CONCATENATION_REGEXES.LITERAL_THEN_IDENTIFIER,
      (_match: string, prefix: string, literal: string) => {
        const truncatedLiteral =
          literal.length > DIAGNOSTIC_TRUNCATION_LENGTH
            ? `${literal.substring(0, DIAGNOSTIC_TRUNCATION_LENGTH)}...`
            : literal;
        diagnostics.push(`Removed trailing identifiers after literal "${truncatedLiteral}"`);
        changeCount++;
        return `${prefix}"${literal}"`;
      },
    );

    // Step 4: Merge consecutive string literals
    sanitized = sanitized.replace(
      CONCATENATION_REGEXES.CONSECUTIVE_LITERALS,
      (match: string, prefix: string) => {
        const literalMatches = match.match(/"[^"\n]*"/g);
        if (!literalMatches || literalMatches.length < 2) {
          return match;
        }
        const merged = literalMatches.map((lit) => lit.slice(1, -1)).join("");
        diagnostics.push(`Merged ${literalMatches.length} consecutive string literals`);
        changeCount++;
        return `${prefix}"${merged}"`;
      },
    );

    return {
      content: sanitized,
      changed: changeCount > 0,
      diagnostics,
    };
  },
};
