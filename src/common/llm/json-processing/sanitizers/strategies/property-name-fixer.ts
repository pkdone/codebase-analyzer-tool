/**
 * Strategy for fixing property name issues in JSON.
 * Handles missing quotes, typos, truncations, and concatenated property names.
 */

import type { LLMSanitizerConfig } from "../../../config/llm-module-config.types";
import type { SanitizerStrategy, StrategyResult } from "../pipeline/sanitizer-pipeline.types";
import { DELIMITERS, processingConfig } from "../../constants/json-processing.config";
import { isInStringAt } from "../../utils/parser-context-utils";

/**
 * Strategy that fixes various property name issues in JSON.
 */
export const propertyNameFixer: SanitizerStrategy = {
  name: "PropertyNameFixer",

  apply(input: string, config?: LLMSanitizerConfig): StrategyResult {
    if (!input) {
      return { content: input, changed: false, diagnostics: [] };
    }

    const PROPERTY_NAME_MAPPINGS = config?.propertyNameMappings ?? {};
    const PROPERTY_TYPO_CORRECTIONS = config?.propertyTypoCorrections ?? {};

    let sanitized = input;
    const diagnostics: string[] = [];
    let hasChanges = false;

    // Pass 1: Fix concatenated property names
    const concatenatedPattern = /"([^"]+)"\s*\+\s*"([^"]+)"(\s*\+\s*"[^"]+")*\s*:/g;
    sanitized = sanitized.replace(
      concatenatedPattern,
      (_match, firstPart, secondPart, additionalParts, offset: number) => {
        if (isInStringAt(offset, sanitized)) {
          return _match;
        }
        const allParts: string[] = [firstPart as string, secondPart as string];
        if (additionalParts) {
          const additionalMatches = (additionalParts as string).match(/"([^"]+)"/g);
          if (additionalMatches) {
            for (const additionalMatch of additionalMatches) {
              allParts.push(additionalMatch.slice(1, -1));
            }
          }
        }
        const mergedName = allParts.join("");
        hasChanges = true;
        if (diagnostics.length < processingConfig.MAX_DIAGNOSTICS_PER_STRATEGY) {
          diagnostics.push(
            `Merged concatenated property name: ${allParts.join('" + "')} -> ${mergedName}`,
          );
        }
        return `"${mergedName}":`;
      },
    );

    // Pass 2: Fix property names with missing opening quotes
    let previousPass2 = "";
    while (previousPass2 !== sanitized) {
      previousPass2 = sanitized;
      const missingOpeningQuotePattern = /(\s*)([a-zA-Z_$][a-zA-Z0-9_$.-]*)"\s*:/g;
      sanitized = sanitized.replace(
        missingOpeningQuotePattern,
        (match, whitespace, propertyName, offset: number) => {
          const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
          const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
          const lowerPropertyName = propertyNameStr.toLowerCase();
          const propertyNameStart = offset + whitespaceStr.length;

          if (
            propertyNameStart > 0 &&
            sanitized[propertyNameStart - 1] === DELIMITERS.DOUBLE_QUOTE
          ) {
            return match;
          }

          let isAfterPropertyBoundary = false;
          if (offset > 0) {
            const beforeMatch = sanitized.substring(Math.max(0, offset - 200), offset);
            isAfterPropertyBoundary =
              /[}\],]\s*$/.test(beforeMatch) || /[}\],]\s*\n\s*$/.test(beforeMatch);
          }

          if (!isAfterPropertyBoundary && isInStringAt(propertyNameStart, sanitized)) {
            return match;
          }

          let fixedName: string;
          if (lowerPropertyName.endsWith("_")) {
            const withoutUnderscore = propertyNameStr.slice(0, -1);
            fixedName = withoutUnderscore;
          } else {
            fixedName =
              PROPERTY_NAME_MAPPINGS[propertyNameStr] ||
              PROPERTY_NAME_MAPPINGS[lowerPropertyName] ||
              propertyNameStr;
          }

          hasChanges = true;
          if (diagnostics.length < processingConfig.MAX_DIAGNOSTICS_PER_STRATEGY) {
            diagnostics.push(
              `Fixed property name with missing opening quote: ${propertyNameStr}" -> "${fixedName}"`,
            );
          }
          return `${whitespaceStr}"${fixedName}":`;
        },
      );
    }

    // Pass 2b: Fix very short property names with missing opening quotes
    const veryShortPropertyNamePattern = /([}\],]|\n|^)(\s*)([a-z]{1,2})"\s*:\s*"([^"]+)"/g;
    sanitized = sanitized.replace(
      veryShortPropertyNamePattern,
      (match, delimiter, whitespace, shortName, value, offset: number) => {
        if (isInStringAt(offset, sanitized)) {
          return match;
        }

        const beforeMatch = sanitized.substring(Math.max(0, offset - 200), offset);
        const isAfterPropertyBoundary =
          /[}\],]\s*$/.test(beforeMatch) ||
          /[}\],]\s*\n\s*$/.test(beforeMatch) ||
          /\n\s*$/.test(beforeMatch) ||
          offset < 200;

        if (isAfterPropertyBoundary) {
          const shortNameStr = typeof shortName === "string" ? shortName : "";
          const valueStr = typeof value === "string" ? value : "";
          const lowerShortName = shortNameStr.toLowerCase();

          let fixedName: string | undefined;
          if (lowerShortName === "se") {
            fixedName = "name";
          } else {
            fixedName = PROPERTY_NAME_MAPPINGS[lowerShortName];
          }

          if (!fixedName) {
            const shortNameMappings: Record<string, string> = {
              e: "name",
              n: "name",
              m: "name",
              me: "name",
              na: "name",
              pu: "purpose",
              de: "description",
              ty: "type",
              va: "value",
            };
            fixedName = shortNameMappings[lowerShortName];
          }

          if (!fixedName) {
            return match;
          }

          hasChanges = true;
          const delimiterStr = typeof delimiter === "string" ? delimiter : "";
          const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
          if (diagnostics.length < processingConfig.MAX_DIAGNOSTICS_PER_STRATEGY) {
            diagnostics.push(`Fixed truncated property name: ${shortNameStr}" -> "${fixedName}"`);
          }
          return `${delimiterStr}${whitespaceStr}"${fixedName}": "${valueStr}"`;
        }

        return match;
      },
    );

    // Pass 2c: Fix completely unquoted property names
    const unquotedPropertyNamePattern =
      /([{,]\s*|\n\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:\s*([^",\n{[\]]+?)(\s*[,}])/g;
    sanitized = sanitized.replace(
      unquotedPropertyNamePattern,
      (match, prefix, propertyName, value, terminator, offset: number) => {
        if (isInStringAt(offset, sanitized)) {
          return match;
        }

        const beforeMatch = sanitized.substring(Math.max(0, offset - 200), offset);
        const isPropertyContext =
          /[{,]\s*$/.test(beforeMatch) ||
          /}\s*,\s*\n\s*$/.test(beforeMatch) ||
          /]\s*,\s*\n\s*$/.test(beforeMatch) ||
          /\n\s*$/.test(beforeMatch) ||
          offset < 200;

        if (isPropertyContext) {
          const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
          const valueStr = typeof value === "string" ? value.trim() : "";
          const terminatorStr = typeof terminator === "string" ? terminator : "";
          const prefixStr = typeof prefix === "string" ? prefix : "";

          const lowerPropertyName = propertyNameStr.toLowerCase();
          const jsonKeywords = ["true", "false", "null", "undefined"];
          const looksLikePropertyName =
            /^[a-zA-Z_$][a-zA-Z0-9_$.-]*$/.test(propertyNameStr) &&
            !jsonKeywords.includes(lowerPropertyName) &&
            propertyNameStr.length > 1;

          if (looksLikePropertyName) {
            hasChanges = true;
            let quotedValue = valueStr;
            // Don't quote values that are JSON literals, numbers, or corrupted numeric values
            if (
              !/^(true|false|null|\d+|_\d+)$/.test(valueStr) &&
              !valueStr.startsWith('"') &&
              !valueStr.startsWith("[") &&
              !valueStr.startsWith("{")
            ) {
              quotedValue = `"${valueStr}"`;
            }

            if (diagnostics.length < processingConfig.MAX_DIAGNOSTICS_PER_STRATEGY) {
              diagnostics.push(`Fixed unquoted property name: ${propertyNameStr}: ${valueStr}`);
            }
            return `${prefixStr}"${propertyNameStr}": ${quotedValue}${terminatorStr}`;
          }
        }

        return match;
      },
    );

    // Pass 3: Fix property names with missing colon (both patterns)
    let previousPass3 = "";
    while (previousPass3 !== sanitized) {
      previousPass3 = sanitized;
      // Pattern 3a: "name" "value" -> "name": "value" (missing colon between quoted strings)
      const missingColonBetweenQuotedPattern = /"([a-zA-Z_$][a-zA-Z0-9_$.-]*)"\s+"([^"]+)"/g;
      sanitized = sanitized.replace(
        missingColonBetweenQuotedPattern,
        (match, propertyName, value, offset: number) => {
          const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
          const valueStr = typeof value === "string" ? value : "";

          if (isInStringAt(offset, sanitized)) {
            return match;
          }

          // Check we're in a valid property context
          if (offset > 0) {
            const beforeMatch = sanitized.substring(Math.max(0, offset - 50), offset);
            const isAfterPropertyBoundary =
              /[{}\],][\s\n]*$/.test(beforeMatch) || /\[\s*$/.test(beforeMatch) || offset < 10;

            if (!isAfterPropertyBoundary) {
              const largerContext = sanitized.substring(Math.max(0, offset - 200), offset);
              let quoteCount = 0;
              let escape = false;
              for (const char of largerContext) {
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
          }

          hasChanges = true;
          if (diagnostics.length < processingConfig.MAX_DIAGNOSTICS_PER_STRATEGY) {
            diagnostics.push(
              `Fixed missing colon: "${propertyNameStr}" "${valueStr}" -> "${propertyNameStr}": "${valueStr}"`,
            );
          }
          return `"${propertyNameStr}": "${valueStr}"`;
        },
      );

      // Pattern 3b: "name "value" -> "name": "value" (missing closing quote and colon)
      const missingClosingQuoteAndColonPattern = /"([a-zA-Z_$][a-zA-Z0-9_$.-]*)\s+"([^"]+)"/g;
      sanitized = sanitized.replace(
        missingClosingQuoteAndColonPattern,
        (match, propertyName, value, offset: number) => {
          const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
          const valueStr = typeof value === "string" ? value : "";

          if (isInStringAt(offset, sanitized)) {
            return match;
          }

          if (offset > 0) {
            const beforeMatch = sanitized.substring(Math.max(0, offset - 50), offset);
            const isAfterPropertyBoundary =
              /[}\],][\s\n]*$/.test(beforeMatch) || /\[\s*$/.test(beforeMatch);

            if (!isAfterPropertyBoundary && offset > 20) {
              const largerContext = sanitized.substring(Math.max(0, offset - 200), offset);
              let quoteCount = 0;
              let escape = false;
              for (const char of largerContext) {
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
          }

          hasChanges = true;
          if (diagnostics.length < processingConfig.MAX_DIAGNOSTICS_PER_STRATEGY) {
            diagnostics.push(`Fixed property name with missing colon: "${propertyNameStr} "`);
          }
          return `"${propertyNameStr}": "${valueStr}"`;
        },
      );
    }

    // Pass 4: Fix truncated property names (quoted)
    const truncatedQuotedPattern = /(\s*)"([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*(?=:|,|\})/g;
    sanitized = sanitized.replace(truncatedQuotedPattern, (match, whitespace, propertyName) => {
      const lowerPropertyName = (propertyName as string).toLowerCase();
      if (PROPERTY_NAME_MAPPINGS[lowerPropertyName]) {
        const fixedName = PROPERTY_NAME_MAPPINGS[lowerPropertyName];
        hasChanges = true;
        if (diagnostics.length < processingConfig.MAX_DIAGNOSTICS_PER_STRATEGY) {
          diagnostics.push(
            `Fixed truncated property name: ${propertyName as string} -> ${fixedName}`,
          );
        }
        return `${whitespace}"${fixedName}"`;
      }
      return match;
    });

    // Pass 5: Fix trailing underscores in property names (removes ALL trailing underscores)
    const trailingUnderscorePattern = /("[\w]+_+")(\s*:)/g;
    sanitized = sanitized.replace(
      trailingUnderscorePattern,
      (match, quotedNameWithUnderscore, colonWithWhitespace, offset: number) => {
        const quotedNameStr =
          typeof quotedNameWithUnderscore === "string" ? quotedNameWithUnderscore : "";
        const colonStr = typeof colonWithWhitespace === "string" ? colonWithWhitespace : "";

        if (isInStringAt(offset, sanitized)) {
          return match;
        }

        // Remove quotes, strip all trailing underscores, add quotes back
        const nameWithoutQuotes = quotedNameStr.slice(1, -1);
        const fixedNameContent = nameWithoutQuotes.replace(/_+$/, "");
        const fixedName = `"${fixedNameContent}"`;
        hasChanges = true;
        if (diagnostics.length < processingConfig.MAX_DIAGNOSTICS_PER_STRATEGY) {
          diagnostics.push(
            `Fixed trailing underscore in property name: ${quotedNameStr} -> ${fixedName}`,
          );
        }
        return `${fixedName}${colonStr}`;
      },
    );

    // Pass 5b: Fix double underscores in property names (also strips trailing underscores)
    const doubleUnderscorePattern = /("[\w]*__+[\w]*")/g;
    sanitized = sanitized.replace(doubleUnderscorePattern, (match, quotedName, offset: number) => {
      const quotedNameStr = typeof quotedName === "string" ? quotedName : "";

      if (isInStringAt(offset, sanitized)) {
        return match;
      }

      const nameWithoutQuotes = quotedNameStr.slice(1, -1);
      // Replace double underscores with single, then remove trailing underscores
      let fixedName = nameWithoutQuotes.replace(/__+/g, "_");
      fixedName = fixedName.replace(/_+$/, "");
      hasChanges = true;
      if (diagnostics.length < processingConfig.MAX_DIAGNOSTICS_PER_STRATEGY) {
        diagnostics.push(
          `Fixed double underscores in property name: ${quotedNameStr} -> "${fixedName}"`,
        );
      }
      return `"${fixedName}"`;
    });

    // Pass 5c: Fix property name typos using mappings
    const quotedPropertyPattern = /"([^"]+)"\s*:/g;
    sanitized = sanitized.replace(
      quotedPropertyPattern,
      (match, propertyName: unknown, offset: number) => {
        const propertyNameStr = typeof propertyName === "string" ? propertyName : "";

        if (isInStringAt(offset, sanitized)) {
          return match;
        }

        if (PROPERTY_TYPO_CORRECTIONS[propertyNameStr]) {
          const fixedName = PROPERTY_TYPO_CORRECTIONS[propertyNameStr];
          hasChanges = true;
          if (diagnostics.length < processingConfig.MAX_DIAGNOSTICS_PER_STRATEGY) {
            diagnostics.push(`Fixed property name typo: "${propertyNameStr}" -> "${fixedName}"`);
          }
          return `"${fixedName}":`;
        }

        return match;
      },
    );

    // Pass 5d: Fix property names with embedded text that matches the value
    // e.g., "name payLoanCharge": "payLoanCharge" -> "name": "payLoanCharge"
    const embeddedValuePattern = /"(\w+)\s+([^"]+)":\s*"([^"]+)"/g;
    sanitized = sanitized.replace(
      embeddedValuePattern,
      (match, propertyNamePart, embeddedPart, value, offset: number) => {
        const propertyNamePartStr = typeof propertyNamePart === "string" ? propertyNamePart : "";
        const embeddedPartStr = typeof embeddedPart === "string" ? embeddedPart : "";
        const valueStr = typeof value === "string" ? value : "";

        if (isInStringAt(offset, sanitized)) {
          return match;
        }

        // Known short property names that commonly have embedded text
        const knownShortPropertyNames = ["name", "type", "value", "id", "key", "kind", "text"];
        const isKnownPropertyName = knownShortPropertyNames.includes(
          propertyNamePartStr.toLowerCase(),
        );

        // Check if embedded part matches the value, or if it's a known property name
        const embeddedMatchesValue =
          embeddedPartStr === valueStr || embeddedPartStr.toLowerCase() === valueStr.toLowerCase();

        if (embeddedMatchesValue || isKnownPropertyName) {
          hasChanges = true;
          if (diagnostics.length < processingConfig.MAX_DIAGNOSTICS_PER_STRATEGY) {
            diagnostics.push(
              `Fixed property with embedded value: "${propertyNamePartStr} ${embeddedPartStr}" -> "${propertyNamePartStr}"`,
            );
          }
          return `"${propertyNamePartStr}": "${valueStr}"`;
        }

        return match;
      },
    );

    // Pass 6: Fix completely unquoted property names (generalized)
    const unquotedPropertyPattern = /([{,}\],]|\n|^)(\s*)([a-zA-Z_$][a-zA-Z0-9_$.-]*)\s*:/g;
    sanitized = sanitized.replace(
      unquotedPropertyPattern,
      (match, delimiter, whitespace, propertyName, offset: number) => {
        const delimiterStr = typeof delimiter === "string" ? delimiter : "";
        const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
        const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
        const lowerPropertyName = propertyNameStr.toLowerCase();

        const propertyStartOffset = offset + delimiterStr.length + whitespaceStr.length;
        if (
          propertyStartOffset > 0 &&
          sanitized[propertyStartOffset - 1] === DELIMITERS.DOUBLE_QUOTE
        ) {
          return match;
        }

        if (isInStringAt(offset, sanitized)) {
          return match;
        }

        let isValidContext = false;
        if (
          /[{,}\],]/.test(delimiterStr) ||
          delimiterStr === "\n" ||
          delimiterStr === "" ||
          offset === 0
        ) {
          isValidContext = true;
        }

        if (!isValidContext && offset > 0) {
          const charBefore = sanitized[offset - 1];
          if (
            charBefore === "," ||
            charBefore === "}" ||
            charBefore === "]" ||
            charBefore === "\n" ||
            charBefore === "{"
          ) {
            isValidContext = true;
          }
        }

        if (isValidContext) {
          const jsonKeywords = ["true", "false", "null", "undefined"];
          if (jsonKeywords.includes(lowerPropertyName)) {
            return match;
          }

          const fixedName =
            PROPERTY_NAME_MAPPINGS[propertyNameStr] ||
            PROPERTY_NAME_MAPPINGS[lowerPropertyName] ||
            propertyNameStr;

          hasChanges = true;
          if (diagnostics.length < processingConfig.MAX_DIAGNOSTICS_PER_STRATEGY) {
            diagnostics.push(`Fixed unquoted property name: ${propertyNameStr} -> "${fixedName}"`);
          }
          return `${delimiterStr}${whitespaceStr}"${fixedName}":`;
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
