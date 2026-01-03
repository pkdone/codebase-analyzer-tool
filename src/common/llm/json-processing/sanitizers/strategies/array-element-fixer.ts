/**
 * Strategy for fixing array element issues in JSON.
 * Handles missing quotes, missing commas, and stray text in arrays.
 * Uses generic structural detection for schema-agnostic processing.
 */

import type { LLMSanitizerConfig } from "../../../config/llm-module-config.types";
import type { SanitizerStrategy, StrategyResult } from "../pipeline/sanitizer-pipeline.types";
import { isInStringAt, isDirectlyInArrayContext } from "../../utils/parser-context-utils";
import { looksLikeStrayArrayPrefix } from "../../utils/stray-text-detection";
import { processingConfig, parsingHeuristics } from "../../constants/json-processing.config";
import { looksLikeDotSeparatedIdentifier } from "../../utils/property-name-matcher";
import { DiagnosticCollector } from "../../utils/diagnostic-collector";

/**
 * Attempts to fix a truncated or corrupted identifier by applying
 * configured prefix replacements as a fallback.
 *
 * @param value - The potentially corrupted identifier
 * @param prefixReplacements - Map of truncated prefixes to full prefixes
 * @returns The fixed identifier or the original value
 */
function applyPrefixReplacements(
  value: string,
  prefixReplacements: Record<string, string>,
): { fixed: string; wasFixed: boolean } {
  for (const [prefix, replacement] of Object.entries(prefixReplacements)) {
    if (value.startsWith(prefix)) {
      return {
        fixed: replacement + value.substring(prefix.length),
        wasFixed: true,
      };
    }
  }
  return { fixed: value, wasFixed: false };
}

/**
 * Strategy that fixes array element issues in JSON.
 */
export const arrayElementFixer: SanitizerStrategy = {
  name: "ArrayElementFixer",

  apply(input: string, config?: LLMSanitizerConfig): StrategyResult {
    if (!input) {
      return { content: input, changed: false, diagnostics: [] };
    }

    // Keep fallback prefix replacements for backwards compatibility
    const PACKAGE_NAME_PREFIX_REPLACEMENTS = config?.packageNamePrefixReplacements ?? {};

    let sanitized = input;
    const diagnostics = new DiagnosticCollector(processingConfig.MAX_DIAGNOSTICS_PER_STRATEGY);
    let hasChanges = false;

    // Pattern 1: Fix missing opening quotes in array elements
    // Uses generic dot-separated identifier detection
    const missingQuoteInArrayPattern = /(\[|,\s*)(\s*)([a-zA-Z][a-zA-Z0-9_.]*)"(\s*,|\s*\])/g;
    sanitized = sanitized.replace(
      missingQuoteInArrayPattern,
      (match, prefix, whitespace, unquotedValue, terminator, offset: number) => {
        const prefixStr = typeof prefix === "string" ? prefix : "";
        const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
        const unquotedValueStr = typeof unquotedValue === "string" ? unquotedValue : "";
        const terminatorStr = typeof terminator === "string" ? terminator : "";

        if (isInStringAt(offset, sanitized)) {
          return match;
        }

        const foundArray = prefixStr === "[" || isDirectlyInArrayContext(offset, sanitized);

        if (foundArray) {
          let fixedValue = unquotedValueStr;

          // Strategy 1: Try prefix replacements FIRST to fix corrupted identifiers
          // This must come before generic detection because corrupted identifiers
          // like "orgapache.example.Class" still look like valid dot-separated identifiers
          const result = applyPrefixReplacements(
            unquotedValueStr,
            PACKAGE_NAME_PREFIX_REPLACEMENTS,
          );
          if (result.wasFixed) {
            fixedValue = result.fixed;
            hasChanges = true;
            diagnostics.add(
              `Fixed truncated identifier in array: ${unquotedValueStr} -> ${fixedValue}`,
            );
          } else if (looksLikeDotSeparatedIdentifier(unquotedValueStr)) {
            // Strategy 2: Generic dot-separated identifier detection
            hasChanges = true;
            diagnostics.add(
              `Fixed missing opening quote for identifier in array: ${unquotedValueStr}"`,
            );
          } else {
            // Strategy 3: Generic fix for any unquoted array element
            hasChanges = true;
            diagnostics.add(`Fixed missing opening quote in array element: ${unquotedValueStr}"`);
          }
          return `${prefixStr}${whitespaceStr}"${fixedValue}"${terminatorStr}`;
        }

        return match;
      },
    );

    // Pattern 2: Fix missing opening quotes in newline-separated array elements
    const missingQuoteInArrayNewlinePattern = /(\n\s*)([a-zA-Z][a-zA-Z0-9_.]*)"(\s*,|\s*\])/g;
    sanitized = sanitized.replace(
      missingQuoteInArrayNewlinePattern,
      (match, newlinePrefix, unquotedValue, terminator, offset: number) => {
        const newlinePrefixStr = typeof newlinePrefix === "string" ? newlinePrefix : "";
        const unquotedValueStr = typeof unquotedValue === "string" ? unquotedValue : "";
        const terminatorStr = typeof terminator === "string" ? terminator : "";

        if (isInStringAt(offset, sanitized)) {
          return match;
        }

        const beforeMatch = sanitized.substring(
          Math.max(0, offset - parsingHeuristics.CONTEXT_LOOKBACK_LENGTH),
          offset,
        );
        const prevLineEnd = beforeMatch.trimEnd();
        const isAfterCommaOrBracket = prevLineEnd.endsWith(",") || prevLineEnd.endsWith("[");

        const foundArray = isDirectlyInArrayContext(offset, sanitized) || isAfterCommaOrBracket;

        if (foundArray) {
          // Use generic dot-notation detection
          let fixedValue = unquotedValueStr;

          // Try prefix replacements for potentially corrupted identifiers
          const result = applyPrefixReplacements(
            unquotedValueStr,
            PACKAGE_NAME_PREFIX_REPLACEMENTS,
          );
          if (result.wasFixed) {
            fixedValue = result.fixed;
          }

          hasChanges = true;
          diagnostics.add(
            `Fixed missing opening quote in array element (newline): ${unquotedValueStr}"`,
          );
          return `${newlinePrefixStr}"${fixedValue}"${terminatorStr}`;
        }

        return match;
      },
    );

    // Pattern 3: Fix words before quoted strings in arrays (like "from" prefix)
    // Uses generic stray word detection instead of hardcoded word list
    const wordBeforeQuotedStringInArrayPattern =
      /(\[|,\s*)(\s*)([a-zA-Z]+)\s*"([^"]+)"(\s*,|\s*\])/g;
    sanitized = sanitized.replace(
      wordBeforeQuotedStringInArrayPattern,
      (match, prefix, whitespace, prefixWord, quotedValue, terminator, offset: number) => {
        const prefixStr = typeof prefix === "string" ? prefix : "";
        const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
        const prefixWordStr = typeof prefixWord === "string" ? prefixWord : "";
        const quotedValueStr = typeof quotedValue === "string" ? quotedValue : "";
        const terminatorStr = typeof terminator === "string" ? terminator : "";

        if (isInStringAt(offset, sanitized)) {
          return match;
        }

        const isInArray =
          prefixStr === "[" ||
          prefixStr.startsWith(",") ||
          isDirectlyInArrayContext(offset, sanitized);

        // Use generic stray word detection
        if (isInArray && looksLikeStrayArrayPrefix(prefixWordStr)) {
          hasChanges = true;
          diagnostics.add(`Removed prefix word '${prefixWordStr}' before quoted string in array`);
          return `${prefixStr}${whitespaceStr}"${quotedValueStr}"${terminatorStr}`;
        }

        return match;
      },
    );

    // Pattern 4: Fix unquoted constants in arrays (e.g., CRM_URL_TOKEN_KEY)
    let previousUnquotedArray = "";
    while (previousUnquotedArray !== sanitized) {
      previousUnquotedArray = sanitized;

      const unquotedArrayElementPattern =
        /(\n\s*)([A-Z][A-Z0-9_]{3,})(\s*\n\s*\]|\s*\]|\s*,|\s*\n)/g;
      sanitized = sanitized.replace(
        unquotedArrayElementPattern,
        (match, newlinePrefix, element, terminator, offset: number) => {
          if (isInStringAt(offset, sanitized)) {
            return match;
          }

          const newlinePrefixStr = typeof newlinePrefix === "string" ? newlinePrefix : "";
          const elementStr = typeof element === "string" ? element : "";
          const terminatorStr = typeof terminator === "string" ? terminator : "";

          const foundArray =
            terminatorStr.includes("]") || isDirectlyInArrayContext(offset, sanitized);

          if (foundArray && /^[A-Z][A-Z0-9_]+$/.test(elementStr) && elementStr.length > 3) {
            hasChanges = true;
            diagnostics.add(`Fixed unquoted array element: ${elementStr} -> "${elementStr}"`);

            const beforeMatch = sanitized.substring(
              Math.max(0, offset - parsingHeuristics.CONTEXT_LOOKBACK_LENGTH),
              offset,
            );
            const beforeTrimmed = beforeMatch.trim();
            // Only add comma if not after [ and not already after a comma
            const needsCommaBefore = !beforeTrimmed.endsWith("[") && !beforeTrimmed.endsWith(",");
            const commaBefore = needsCommaBefore ? "," : "";

            if (terminatorStr.trim().startsWith("]")) {
              const whitespaceMatch = /^(\s*\n\s*|\s*)/.exec(terminatorStr);
              const whitespaceBeforeBracket = whitespaceMatch?.[0] ?? "";
              return `${commaBefore}${newlinePrefixStr}"${elementStr}"${whitespaceBeforeBracket}]`;
            } else if (terminatorStr.trim().startsWith(",")) {
              // Already has comma after, don't add another
              return `${commaBefore}${newlinePrefixStr}"${elementStr}"${terminatorStr}`;
            } else {
              // Add comma after for next element
              return `${commaBefore}${newlinePrefixStr}"${elementStr}",${terminatorStr}`;
            }
          }

          return match;
        },
      );
    }

    // Pattern 5: Fix missing commas between array elements (same line)
    const missingCommaSameLinePattern = /"([^"]+)"\s+"([^"]+)"(\s*[,\]]|\s*$)/g;
    sanitized = sanitized.replace(
      missingCommaSameLinePattern,
      (match, value1, value2, terminator, offset: number) => {
        if (isInStringAt(offset, sanitized)) {
          return match;
        }

        const terminatorStr = typeof terminator === "string" ? terminator : "";
        const isInArray =
          terminatorStr.includes("]") || isDirectlyInArrayContext(offset, sanitized);

        if (isInArray) {
          const value1Str = typeof value1 === "string" ? value1 : "";
          const value2Str = typeof value2 === "string" ? value2 : "";

          hasChanges = true;
          diagnostics.add(
            `Added missing comma between array elements: "${value1Str}" "${value2Str}"`,
          );
          return `"${value1Str}", "${value2Str}"${terminatorStr}`;
        }

        return match;
      },
    );

    // Pattern 6: Fix missing commas between array elements (newline)
    const missingCommaAfterArrayElementPattern =
      /"([^"]+)"(\s*)\n(\s*)"([^"]+)"(\s*[,}\]]|[,}\]]|$)/g;
    sanitized = sanitized.replace(
      missingCommaAfterArrayElementPattern,
      (match, value1, _whitespace1, newlineWhitespace, value2, terminator, offset: number) => {
        if (isInStringAt(offset, sanitized)) {
          return match;
        }

        const terminatorStr = typeof terminator === "string" ? terminator : "";
        const isInArray =
          terminatorStr.includes("]") ||
          terminatorStr.includes(",") ||
          isDirectlyInArrayContext(offset, sanitized);

        if (isInArray) {
          const value1Str = typeof value1 === "string" ? value1 : "";
          const value2Str = typeof value2 === "string" ? value2 : "";
          const newlineWhitespaceStr =
            typeof newlineWhitespace === "string" ? newlineWhitespace : "";

          if (!terminatorStr.startsWith(",") && !terminatorStr.startsWith("]")) {
            hasChanges = true;
            diagnostics.add(`Added missing comma after array element: "${value1Str}"`);
            return `"${value1Str}",${newlineWhitespaceStr}"${value2Str}"${terminatorStr}`;
          }
        }

        return match;
      },
    );

    // Pattern 7: Generic fix for unquoted dot-separated identifiers in arrays
    // This is schema-agnostic and catches any dot-separated identifier
    const unquotedDotSeparatedPattern =
      /(\[|,)(\s*)([a-zA-Z_$][a-zA-Z0-9_$]*(?:\.[a-zA-Z_$][a-zA-Z0-9_$]*)+)(\s*[,\]])/g;
    sanitized = sanitized.replace(
      unquotedDotSeparatedPattern,
      (match, prefix, whitespace, identifier, terminator, offset: number) => {
        if (isInStringAt(offset, sanitized)) {
          return match;
        }

        const prefixStr = typeof prefix === "string" ? prefix : "";
        const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
        const identifierStr = typeof identifier === "string" ? identifier : "";
        const terminatorStr = typeof terminator === "string" ? terminator : "";

        // Verify it's a valid dot-separated identifier
        if (looksLikeDotSeparatedIdentifier(identifierStr)) {
          hasChanges = true;
          diagnostics.add(`Quoted unquoted identifier in array: ${identifierStr}`);
          return `${prefixStr}${whitespaceStr}"${identifierStr}"${terminatorStr}`;
        }

        return match;
      },
    );

    return {
      content: sanitized,
      changed: hasChanges,
      diagnostics: diagnostics.getAll(),
    };
  },
};
