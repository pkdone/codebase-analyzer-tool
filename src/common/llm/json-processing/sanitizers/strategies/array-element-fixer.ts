/**
 * Strategy for fixing array element issues in JSON.
 * Handles missing quotes, missing commas, and stray text in arrays.
 */

import type { LLMSanitizerConfig } from "../../../config/llm-module-config.types";
import type { SanitizerStrategy, StrategyResult } from "../pipeline/sanitizer-pipeline.types";
import { isInStringAt } from "../../utils/parser-context-utils";

/** Maximum diagnostics to collect */
const MAX_DIAGNOSTICS = 20;

/**
 * Checks if position is in an array context by scanning backwards.
 */
function isInArrayContextAt(offset: number, content: string): boolean {
  const beforeMatch = content.substring(Math.max(0, offset - 500), offset);
  let bracketDepth = 0;
  let braceDepth = 0;
  let inString = false;
  let escape = false;

  for (let i = beforeMatch.length - 1; i >= 0; i--) {
    const char = beforeMatch[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (char === "\\") {
      escape = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === "]") {
        bracketDepth++;
      } else if (char === "[") {
        // When scanning backwards, hitting '[' with bracketDepth 0 means we found our containing array
        if (bracketDepth === 0 && braceDepth === 0) {
          return true;
        }
        bracketDepth--;
      } else if (char === "}") {
        braceDepth++;
      } else if (char === "{") {
        braceDepth--;
      }
    }
  }
  return false;
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

    const PACKAGE_NAME_PREFIX_REPLACEMENTS = config?.packageNamePrefixReplacements ?? {};

    let sanitized = input;
    const diagnostics: string[] = [];
    let hasChanges = false;

    // Fix missing opening quotes in array elements
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

        const foundArray = prefixStr === "[" || isInArrayContextAt(offset, sanitized);

        if (foundArray) {
          let fixedValue = unquotedValueStr;
          let foundReplacement = false;
          for (const [pfx, replacement] of Object.entries(PACKAGE_NAME_PREFIX_REPLACEMENTS)) {
            if (unquotedValueStr.startsWith(pfx)) {
              fixedValue = replacement + unquotedValueStr.substring(pfx.length);
              hasChanges = true;
              foundReplacement = true;
              if (diagnostics.length < MAX_DIAGNOSTICS) {
                diagnostics.push(`Fixed truncated package name in array: ${unquotedValueStr} -> ${fixedValue}`);
              }
              break;
            }
          }
          if (!foundReplacement) {
            hasChanges = true;
            if (diagnostics.length < MAX_DIAGNOSTICS) {
              diagnostics.push(`Fixed missing opening quote in array element: ${unquotedValueStr}"`);
            }
          }
          return `${prefixStr}${whitespaceStr}"${fixedValue}"${terminatorStr}`;
        }

        return match;
      },
    );

    // Fix missing opening quotes in newline-separated array elements
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

        const beforeMatch = sanitized.substring(Math.max(0, offset - 500), offset);
        const prevLineEnd = beforeMatch.trimEnd();
        const isAfterCommaOrBracket = prevLineEnd.endsWith(",") || prevLineEnd.endsWith("[");

        const foundArray = isInArrayContextAt(offset, sanitized) || isAfterCommaOrBracket;

        if (foundArray) {
          let fixedValue = unquotedValueStr;
          for (const [pfx, replacement] of Object.entries(PACKAGE_NAME_PREFIX_REPLACEMENTS)) {
            if (unquotedValueStr.startsWith(pfx)) {
              fixedValue = replacement + unquotedValueStr.substring(pfx.length);
              break;
            }
          }

          hasChanges = true;
          if (diagnostics.length < MAX_DIAGNOSTICS) {
            diagnostics.push(`Fixed missing opening quote in array element (newline): ${unquotedValueStr}"`);
          }
          return `${newlinePrefixStr}"${fixedValue}"${terminatorStr}`;
        }

        return match;
      },
    );

    // Fix words before quoted strings in arrays (like "from" prefix)
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

        const prefixWordsToRemove = ["from", "stop", "package", "import"];
        const lowerPrefixWord = prefixWordStr.toLowerCase();
        const isInArray = prefixStr === "[" || prefixStr.startsWith(",") || isInArrayContextAt(offset, sanitized);

        if (isInArray && prefixWordsToRemove.includes(lowerPrefixWord)) {
          hasChanges = true;
          if (diagnostics.length < MAX_DIAGNOSTICS) {
            diagnostics.push(`Removed prefix word '${prefixWordStr}' before quoted string in array`);
          }
          return `${prefixStr}${whitespaceStr}"${quotedValueStr}"${terminatorStr}`;
        }

        return match;
      },
    );

    // Fix unquoted constants in arrays (e.g., CRM_URL_TOKEN_KEY)
    let previousUnquotedArray = "";
    while (previousUnquotedArray !== sanitized) {
      previousUnquotedArray = sanitized;

      const unquotedArrayElementPattern = /(\n\s*)([A-Z][A-Z0-9_]{3,})(\s*\n\s*\]|\s*\]|\s*,|\s*\n)/g;
      sanitized = sanitized.replace(
        unquotedArrayElementPattern,
        (match, newlinePrefix, element, terminator, offset: number) => {
          if (isInStringAt(offset, sanitized)) {
            return match;
          }

          const newlinePrefixStr = typeof newlinePrefix === "string" ? newlinePrefix : "";
          const elementStr = typeof element === "string" ? element : "";
          const terminatorStr = typeof terminator === "string" ? terminator : "";

          const foundArray = terminatorStr.includes("]") || isInArrayContextAt(offset, sanitized);

          if (foundArray && /^[A-Z][A-Z0-9_]+$/.test(elementStr) && elementStr.length > 3) {
            hasChanges = true;
            if (diagnostics.length < MAX_DIAGNOSTICS) {
              diagnostics.push(`Fixed unquoted array element: ${elementStr} -> "${elementStr}"`);
            }

            const beforeMatch = sanitized.substring(Math.max(0, offset - 500), offset);
            const beforeTrimmed = beforeMatch.trim();
            // Only add comma if not after [ and not already after a comma
            const needsCommaBefore =
              !beforeTrimmed.endsWith("[") && !beforeTrimmed.endsWith(",");
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

    // Fix missing commas between array elements (same line)
    const missingCommaSameLinePattern = /"([^"]+)"\s+"([^"]+)"(\s*[,\]]|\s*$)/g;
    sanitized = sanitized.replace(
      missingCommaSameLinePattern,
      (match, value1, value2, terminator, offset: number) => {
        if (isInStringAt(offset, sanitized)) {
          return match;
        }

        const terminatorStr = typeof terminator === "string" ? terminator : "";
        const isInArray = terminatorStr.includes("]") || isInArrayContextAt(offset, sanitized);

        if (isInArray) {
          const value1Str = typeof value1 === "string" ? value1 : "";
          const value2Str = typeof value2 === "string" ? value2 : "";

          hasChanges = true;
          if (diagnostics.length < MAX_DIAGNOSTICS) {
            diagnostics.push(`Added missing comma between array elements: "${value1Str}" "${value2Str}"`);
          }
          return `"${value1Str}", "${value2Str}"${terminatorStr}`;
        }

        return match;
      },
    );

    // Fix missing commas between array elements (newline)
    const missingCommaAfterArrayElementPattern =
      /"([^"]+)"(\s*)\n(\s*)"([^"]+)"(\s*[,}\]]|[,}\]]|$)/g;
    sanitized = sanitized.replace(
      missingCommaAfterArrayElementPattern,
      (match, value1, _whitespace1, newlineWhitespace, value2, terminator, offset: number) => {
        if (isInStringAt(offset, sanitized)) {
          return match;
        }

        const terminatorStr = typeof terminator === "string" ? terminator : "";
        const isInArray = terminatorStr.includes("]") || terminatorStr.includes(",") || isInArrayContextAt(offset, sanitized);

        if (isInArray) {
          const value1Str = typeof value1 === "string" ? value1 : "";
          const value2Str = typeof value2 === "string" ? value2 : "";
          const newlineWhitespaceStr = typeof newlineWhitespace === "string" ? newlineWhitespace : "";

          if (!terminatorStr.startsWith(",") && !terminatorStr.startsWith("]")) {
            hasChanges = true;
            if (diagnostics.length < MAX_DIAGNOSTICS) {
              diagnostics.push(`Added missing comma after array element: "${value1Str}"`);
            }
            return `"${value1Str}",${newlineWhitespaceStr}"${value2Str}"${terminatorStr}`;
          }
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

