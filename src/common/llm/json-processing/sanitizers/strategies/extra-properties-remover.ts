/**
 * Strategy for removing extra_thoughts and extra_text properties from JSON.
 * These are LLM artifacts that should not be in the final output.
 */

import type { LLMSanitizerConfig } from "../../../config/llm-module-config.types";
import type { SanitizerStrategy, StrategyResult } from "../pipeline/sanitizer-pipeline.types";
import { isInStringAt } from "../../utils/parser-context-utils";

/**
 * Strategy that removes extra_thoughts and extra_text LLM artifact properties.
 */
export const extraPropertiesRemover: SanitizerStrategy = {
  name: "ExtraPropertiesRemover",

  apply(input: string, _config?: LLMSanitizerConfig): StrategyResult {
    if (!input) {
      return { content: input, changed: false, diagnostics: [] };
    }

    let sanitized = input;
    const diagnostics: string[] = [];
    let hasChanges = false;

    // Pattern 1: Handle malformed extra_text like `extra_text="  "property":`
    const malformedExtraTextPattern =
      /([,{])\s*extra_text\s*=\s*"\s*"\s*([a-zA-Z_$][a-zA-Z0-9_$]*"\s*:\s*)/g;
    sanitized = sanitized.replace(
      malformedExtraTextPattern,
      (match, delimiter, propertyNameWithQuote, offset: number) => {
        if (isInStringAt(offset, sanitized)) {
          return match;
        }

        hasChanges = true;
        diagnostics.push("Removed malformed extra_text property");
        const delimiterStr = typeof delimiter === "string" ? delimiter : "";
        const propertyNameWithQuoteStr =
          typeof propertyNameWithQuote === "string" ? propertyNameWithQuote : "";
        const fixedProperty = `"${propertyNameWithQuoteStr}`;
        return `${delimiterStr}\n    ${fixedProperty}`;
      },
    );

    // Pattern 2: Handle unquoted extra_thoughts/extra_text properties
    const unquotedExtraPropertyPattern = /([,{])\s*(extra_thoughts|extra_text)\s*:\s*/g;
    let previousUnquoted = "";
    while (previousUnquoted !== sanitized) {
      previousUnquoted = sanitized;
      const matches: { start: number; end: number; delimiter: string }[] = [];
      let match;
      const pattern = new RegExp(unquotedExtraPropertyPattern.source, unquotedExtraPropertyPattern.flags);
      while ((match = pattern.exec(sanitized)) !== null) {
        const numericOffset = match.index;
        if (isInStringAt(numericOffset, sanitized)) {
          continue;
        }

        const delimiterStr = match[1] || "";
        const valueStartPos = numericOffset + match[0].length;

        let valueEndPos = valueStartPos;
        let inString = false;
        let escaped = false;
        let braceCount = 0;
        let bracketCount = 0;

        while (valueEndPos < sanitized.length && /\s/.test(sanitized[valueEndPos])) {
          valueEndPos++;
        }

        if (valueEndPos >= sanitized.length) {
          continue;
        }

        const firstChar = sanitized[valueEndPos];
        if (firstChar === "{") {
          braceCount = 1;
          valueEndPos++;
          while (braceCount > 0 && valueEndPos < sanitized.length) {
            if (escaped) {
              escaped = false;
            } else if (sanitized[valueEndPos] === "\\") {
              escaped = true;
            } else if (sanitized[valueEndPos] === '"') {
              inString = !inString;
            } else if (!inString) {
              if (sanitized[valueEndPos] === "{") {
                braceCount++;
              } else if (sanitized[valueEndPos] === "}") {
                braceCount--;
              }
            }
            valueEndPos++;
          }
        } else if (firstChar === '"') {
          inString = true;
          valueEndPos++;
          let foundClosingQuote = false;
          while (valueEndPos < sanitized.length) {
            if (escaped) {
              escaped = false;
            } else if (sanitized[valueEndPos] === "\\") {
              escaped = true;
            } else if (sanitized[valueEndPos] === '"') {
              inString = false;
              foundClosingQuote = true;
              valueEndPos++;
              break;
            }
            valueEndPos++;
          }
          if (!foundClosingQuote) {
            const nextComma = sanitized.indexOf(",", valueStartPos);
            if (nextComma !== -1) {
              valueEndPos = nextComma + 1;
            } else {
              const nextNewline = sanitized.indexOf("\n", valueStartPos);
              if (nextNewline !== -1) {
                valueEndPos = nextNewline;
              }
            }
          }
        } else if (firstChar === "[") {
          bracketCount = 1;
          valueEndPos++;
          while (bracketCount > 0 && valueEndPos < sanitized.length) {
            if (escaped) {
              escaped = false;
            } else if (sanitized[valueEndPos] === "\\") {
              escaped = true;
            } else if (sanitized[valueEndPos] === '"') {
              inString = !inString;
            } else if (!inString) {
              if (sanitized[valueEndPos] === "[") {
                bracketCount++;
              } else if (sanitized[valueEndPos] === "]") {
                bracketCount--;
              }
            }
            valueEndPos++;
          }
        } else {
          const nextComma = sanitized.indexOf(",", valueStartPos);
          if (nextComma !== -1) {
            valueEndPos = nextComma + 1;
          } else {
            continue;
          }
        }

        while (valueEndPos < sanitized.length && /\s/.test(sanitized[valueEndPos])) {
          valueEndPos++;
        }
        if (valueEndPos < sanitized.length && sanitized[valueEndPos] === ",") {
          valueEndPos++;
        }

        matches.push({
          start: numericOffset,
          end: valueEndPos,
          delimiter: delimiterStr,
        });
      }

      for (let i = matches.length - 1; i >= 0; i--) {
        const m = matches[i];
        const before = sanitized.substring(0, m.start);
        let after = sanitized.substring(m.end);

        let replacement = "";
        if (m.delimiter === ",") {
          replacement = "";
          const beforeTrimmed = before.trimEnd();
          const afterTrimmed = after.trimStart();
          if (
            (beforeTrimmed.endsWith("]") || beforeTrimmed.endsWith("}")) &&
            afterTrimmed.startsWith('"')
          ) {
            replacement = ",";
          }
          after = after.trimStart();
          if (after.startsWith(",")) {
            after = after.substring(1).trimStart();
          }
        } else if (m.delimiter === "{") {
          replacement = "{";
        }

        sanitized = before + replacement + after;
        hasChanges = true;
        diagnostics.push("Removed unquoted extra_thoughts/extra_text property");
      }
    }

    // Pattern 3: Handle quoted extra_thoughts/extra_text properties
    const extraPropertyPattern = /([,{])\s*"(extra_thoughts|extra_text)"\s*:\s*/g;
    let previousExtraProperty = "";
    while (previousExtraProperty !== sanitized) {
      previousExtraProperty = sanitized;
      const matches: { start: number; end: number; delimiter: string }[] = [];
      let match;
      const pattern = new RegExp(extraPropertyPattern.source, extraPropertyPattern.flags);
      while ((match = pattern.exec(sanitized)) !== null) {
        const numericOffset = match.index;
        if (isInStringAt(numericOffset, sanitized)) {
          continue;
        }

        const delimiterStr = match[1] || "";
        const valueStartPos = numericOffset + match[0].length;

        let valueEndPos = valueStartPos;
        let inString = false;
        let escaped = false;

        while (valueEndPos < sanitized.length && /\s/.test(sanitized[valueEndPos])) {
          valueEndPos++;
        }

        if (valueEndPos >= sanitized.length) {
          continue;
        }

        const firstChar = sanitized[valueEndPos];

        if (firstChar === "{") {
          let braceCount = 1;
          valueEndPos++;
          while (braceCount > 0 && valueEndPos < sanitized.length) {
            if (escaped) {
              escaped = false;
            } else if (sanitized[valueEndPos] === "\\") {
              escaped = true;
            } else if (sanitized[valueEndPos] === '"') {
              inString = !inString;
            } else if (!inString) {
              if (sanitized[valueEndPos] === "{") {
                braceCount++;
              } else if (sanitized[valueEndPos] === "}") {
                braceCount--;
              }
            }
            valueEndPos++;
          }
        } else if (firstChar === '"') {
          inString = true;
          valueEndPos++;
          while (inString && valueEndPos < sanitized.length) {
            if (escaped) {
              escaped = false;
            } else if (sanitized[valueEndPos] === "\\") {
              escaped = true;
            } else if (sanitized[valueEndPos] === '"') {
              inString = false;
            }
            valueEndPos++;
          }
          valueEndPos++;
        } else {
          continue;
        }

        while (valueEndPos < sanitized.length && /\s/.test(sanitized[valueEndPos])) {
          valueEndPos++;
        }
        if (valueEndPos < sanitized.length && sanitized[valueEndPos] === ",") {
          valueEndPos++;
        }

        matches.push({
          start: numericOffset,
          end: valueEndPos,
          delimiter: delimiterStr,
        });
      }

      for (let i = matches.length - 1; i >= 0; i--) {
        const m = matches[i];
        const before = sanitized.substring(0, m.start);
        let after = sanitized.substring(m.end);

        let replacement = "";
        if (m.delimiter === ",") {
          replacement = "";
          const beforeTrimmed = before.trimEnd();
          const afterTrimmed = after.trimStart();
          if (
            (beforeTrimmed.endsWith("]") || beforeTrimmed.endsWith("}")) &&
            afterTrimmed.startsWith('"')
          ) {
            replacement = ",";
          }
          after = after.trimStart();
          if (after.startsWith(",")) {
            after = after.substring(1).trimStart();
          }
        } else if (m.delimiter === "{") {
          replacement = "{";
        }

        sanitized = before + replacement + after;
        hasChanges = true;
        diagnostics.push("Removed extra_thoughts/extra_text property");
      }
    }

    return {
      content: sanitized,
      changed: hasChanges,
      diagnostics,
    };
  },
};

