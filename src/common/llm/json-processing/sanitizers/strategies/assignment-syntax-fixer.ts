/**
 * Strategy for fixing assignment syntax issues in JSON.
 * Handles := instead of :, stray text between colon and value, missing quotes.
 */

import type { LLMSanitizerConfig } from "../../../config/llm-module-config.types";
import type { SanitizerStrategy, StrategyResult } from "../pipeline/sanitizer-pipeline.types";
import { isInStringAt } from "../../utils/parser-context-utils";
import { DiagnosticCollector } from "../../utils/diagnostic-collector";
import { processingConfig, parsingHeuristics } from "../../constants/json-processing.config";

/**
 * Strategy that normalizes property assignment syntax in JSON.
 */
export const assignmentSyntaxFixer: SanitizerStrategy = {
  name: "AssignmentSyntaxFixer",

  apply(input: string, _config?: LLMSanitizerConfig): StrategyResult {
    if (!input) {
      return { content: input, changed: false, repairs: [] };
    }

    let sanitized = input;
    const diagnostics = new DiagnosticCollector(processingConfig.MAX_DIAGNOSTICS_PER_STRATEGY);
    let hasChanges = false;

    // Fix stray text directly after colon (must run early)
    let previousStrayTextDirect = "";
    while (previousStrayTextDirect !== sanitized) {
      previousStrayTextDirect = sanitized;
      const strayTextDirectlyAfterColonPattern =
        /"([a-zA-Z_$][a-zA-Z0-9_$.]*)"\s*:([a-zA-Z_$0-9]{1,10})":\s*"([^"]+)"/g;

      sanitized = sanitized.replace(
        strayTextDirectlyAfterColonPattern,
        (_match, propertyName, strayText, value) => {
          const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
          const strayTextStr = typeof strayText === "string" ? strayText : "";
          const valueStr = typeof value === "string" ? value : "";

          hasChanges = true;
          diagnostics.add(
            `Removed stray text "${strayTextStr}" directly after colon: "${propertyNameStr}":${strayTextStr}":`,
          );
          return `"${propertyNameStr}": "${valueStr}"`;
        },
      );
    }

    // Fix := to :
    const assignmentPattern = /("([^"]+)")\s*:=\s*(\s*)/g;
    sanitized = sanitized.replace(
      assignmentPattern,
      (match, quotedProperty, propertyName, whitespaceAfter, offset: number) => {
        const quotedPropStr = typeof quotedProperty === "string" ? quotedProperty : "";
        const propNameStr = typeof propertyName === "string" ? propertyName : "";
        const wsAfter =
          typeof whitespaceAfter === "string" && whitespaceAfter ? whitespaceAfter : " ";

        if (offset > 0) {
          const beforeMatch = sanitized.substring(Math.max(0, offset - 20), offset);
          const isPropertyContext =
            /[{,\]]\s*$/.test(beforeMatch) || /\n\s*$/.test(beforeMatch) || offset <= 20;

          if (!isPropertyContext) {
            return match;
          }
        }

        if (offset > 0) {
          const beforeMatch = sanitized.substring(0, offset);
          let quoteCount = 0;
          let escape = false;
          for (const char of beforeMatch) {
            if (escape) {
              escape = false;
              continue;
            }
            if (char === "\\") {
              escape = true;
            } else if (char === '"') {
              quoteCount++;
            }
          }
          if (quoteCount % 2 === 1) {
            return match;
          }
        }

        hasChanges = true;
        diagnostics.add(`Fixed assignment syntax: "${propNameStr}":= -> "${propNameStr}":`);
        return `${quotedPropStr}:${wsAfter}`;
      },
    );

    // Fix stray minus signs before colons
    const strayMinusBeforeColonPattern = /("([^"]+)")\s*:-\s*/g;
    sanitized = sanitized.replace(
      strayMinusBeforeColonPattern,
      (match, quotedProperty, propertyName, offset: number) => {
        const quotedPropStr = typeof quotedProperty === "string" ? quotedProperty : "";

        if (offset > 0) {
          const beforeMatch = sanitized.substring(0, offset);
          let quoteCount = 0;
          let escape = false;
          for (const char of beforeMatch) {
            if (escape) {
              escape = false;
              continue;
            }
            if (char === "\\") {
              escape = true;
            } else if (char === '"') {
              quoteCount++;
            }
          }
          if (quoteCount % 2 === 1) {
            return match;
          }
        }

        hasChanges = true;
        const propNameStr = typeof propertyName === "string" ? propertyName : "";
        diagnostics.add(`Removed stray minus sign before colon: "${propNameStr}":-`);
        return `${quotedPropStr}: `;
      },
    );

    // Fix stray text between colon and opening quote
    let previousStrayText = "";
    while (previousStrayText !== sanitized) {
      previousStrayText = sanitized;
      const strayTextBetweenColonAndValuePattern =
        /"([a-zA-Z_$][a-zA-Z0-9_$.]*)"\s*:\s+([a-zA-Z_$0-9]{1,10})":\s*"([^"]+)"/g;

      sanitized = sanitized.replace(
        strayTextBetweenColonAndValuePattern,
        (match, propertyName, strayText, value, offset: number) => {
          const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
          const strayTextStr = typeof strayText === "string" ? strayText : "";
          const valueStr = typeof value === "string" ? value : "";

          if (isInStringAt(offset, sanitized)) {
            return match;
          }

          if (offset > 0) {
            const contextBefore = sanitized.substring(Math.max(0, offset - 50), offset);
            const hasPropertyNamePattern =
              /"\s*$/.test(contextBefore) || /[}\],\]]\s*$/.test(contextBefore);
            if (!hasPropertyNamePattern && !contextBefore.trim().endsWith('"')) {
              const trimmedContext = contextBefore.trim();
              const isInObjectOrArray =
                /[{]\s*$/.test(trimmedContext) || trimmedContext.includes("[");
              if (!isInObjectOrArray) {
                return match;
              }
            }
          }

          hasChanges = true;
          diagnostics.add(`Removed stray text "${strayTextStr}" between colon and value`);
          return `"${propertyNameStr}": "${valueStr}"`;
        },
      );
    }

    // Fix missing opening quotes after colon
    const missingOpeningQuotePattern =
      /"([a-zA-Z_$][a-zA-Z0-9_$]*)":\s*([a-zA-Z_$][a-zA-Z0-9_$]*)"([,}])/g;
    sanitized = sanitized.replace(
      missingOpeningQuotePattern,
      (match, propertyName, value, delimiter, offset, string) => {
        const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
        const valueStr = typeof value === "string" ? value : "";
        const delimiterStr = typeof delimiter === "string" ? delimiter : "";
        const offsetNum = typeof offset === "number" ? offset : undefined;
        const stringStr = typeof string === "string" ? string : sanitized;

        if (offsetNum !== undefined) {
          const beforeMatch = stringStr.substring(
            Math.max(0, offsetNum - parsingHeuristics.CONTEXT_LOOKBACK_LENGTH),
            offsetNum,
          );
          let quoteCount = 0;
          let escape = false;
          for (const char of beforeMatch) {
            if (escape) {
              escape = false;
              continue;
            }
            if (char === "\\") {
              escape = true;
            } else if (char === '"') {
              quoteCount++;
            }
          }
          if (quoteCount % 2 === 1) {
            return match;
          }

          const lowerValue = valueStr.toLowerCase();
          if (lowerValue === "true" || lowerValue === "false" || lowerValue === "null") {
            return match;
          }

          if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(valueStr)) {
            return match;
          }

          hasChanges = true;
          diagnostics.add(
            `Fixed missing quotes around property value: "${propertyNameStr}":${valueStr}"`,
          );
          return `"${propertyNameStr}": "${valueStr}"${delimiterStr}`;
        }

        return match;
      },
    );

    // Fix unquoted string values
    const unquotedStringValuePattern =
      /"([a-zA-Z_$][a-zA-Z0-9_$.]*)"\s*:\s*([a-zA-Z_$][a-zA-Z0-9_$.]+)(\s*[,}\]]|[,}\]]|$)/g;
    sanitized = sanitized.replace(
      unquotedStringValuePattern,
      (match, propertyName, unquotedValue, terminator, offset: number) => {
        const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
        const unquotedValueStr = typeof unquotedValue === "string" ? unquotedValue.trim() : "";
        const terminatorStr = typeof terminator === "string" ? terminator : "";

        if (isInStringAt(offset, sanitized)) {
          return match;
        }

        if (!unquotedValueStr || unquotedValueStr.length === 0) {
          return match;
        }

        const jsonKeywords = ["true", "false", "null", "undefined"];
        const lowerValue = unquotedValueStr.toLowerCase();
        if (jsonKeywords.includes(lowerValue)) {
          return match;
        }

        if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(unquotedValueStr)) {
          return match;
        }

        // Skip corrupted numeric values like _3 (will be handled by invalidLiteralFixer)
        if (/^_\d+$/.test(unquotedValueStr)) {
          return match;
        }

        if (unquotedValueStr.startsWith("{") || unquotedValueStr.startsWith("[")) {
          return match;
        }

        hasChanges = true;
        diagnostics.add(`Fixed unquoted string value: "${propertyNameStr}": ${unquotedValueStr}`);

        const colonIndex = match.indexOf(":");
        const afterColon = match.substring(colonIndex + 1);
        const whitespaceRegex = /^\s*/;
        const whitespaceMatch = whitespaceRegex.exec(afterColon);
        const whitespaceAfterColon = whitespaceMatch ? whitespaceMatch[0] : " ";

        return `"${propertyNameStr}":${whitespaceAfterColon}"${unquotedValueStr}"${terminatorStr}`;
      },
    );

    return {
      content: sanitized,
      changed: hasChanges,
      repairs: diagnostics.getAll(),
    };
  },
};
