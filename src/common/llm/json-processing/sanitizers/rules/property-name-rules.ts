/**
 * Replacement rules for handling property name issues in JSON.
 * This module handles:
 * - Missing quotes on property names
 * - Corrupted property names with extra characters
 * - Malformed property-value pairs
 * - Truncated property names
 */

import type { ReplacementRule } from "./replacement-rule.types";
import { isAfterJsonDelimiter, isInPropertyContext } from "./rule-executor";

/**
 * Rules for fixing property name issues in JSON content.
 */
export const PROPERTY_NAME_RULES: readonly ReplacementRule[] = [
  // Rule: Fix corrupted property names with extra text after colon
  // Pattern: `"name":g": "value"` -> `"name": "value"`
  {
    name: "corruptedPropertyNameExtraText",
    pattern: /"([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:\s*([a-zA-Z]+)\s*":(\s*[,}])/g,
    replacement: (_match, groups) => {
      const [propertyName, , terminator] = groups;
      const propertyNameStr = propertyName ?? "";
      const terminatorStr = terminator ?? "";
      return `"${propertyNameStr}":${terminatorStr}`;
    },
    diagnosticMessage: (_match, groups) => {
      const propertyName = groups[0] ?? "";
      const extraText = groups[1] ?? "";
      return `Fixed corrupted property name: "${propertyName}":${extraText}": -> "${propertyName}":`;
    },
  },

  // Rule: Fix corrupted property values with encoding markers
  // Pattern: `"propertyName":_CODE\`4,` -> `"propertyName": 4,`
  // Generic pattern catches _CODE, _VALUE, _DATA, etc. followed by backtick and number
  {
    name: "corruptedPropertyValue",
    pattern: /"([^"]+)"\s*:\s*_[A-Z]+`(\d+)(\s*[,}])/g,
    replacement: (_match, groups) => {
      const [propertyName, digits, terminator] = groups;
      const propertyNameStr = propertyName ?? "";
      const digitsStr = digits ?? "";
      const terminatorStr = terminator ?? "";
      return `"${propertyNameStr}": ${digitsStr}${terminatorStr}`;
    },
    diagnosticMessage: (_match, groups) => {
      const propertyName = groups[0] ?? "";
      const digits = groups[1] ?? "";
      return `Fixed corrupted property value: "${propertyName}":_...\`${digits} -> "${propertyName}": ${digits}`;
    },
  },

  // Rule: Fix missing quotes on property names followed by arrays/objects
  // Pattern: `propertyName: [` -> `"propertyName": [`
  {
    name: "missingQuotesOnPropertyWithArrayObject",
    pattern: /([}\],]|\n|^)(\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:\s*(\[|{)/g,
    replacement: (_match, groups) => {
      const [delimiter, whitespace, propertyName, valueStart] = groups;
      const delimiterStr = delimiter ?? "";
      const whitespaceStr = whitespace ?? "";
      const propertyNameStr = propertyName ?? "";
      const valueStartStr = valueStart ?? "";
      return `${delimiterStr}${whitespaceStr}"${propertyNameStr}": ${valueStartStr}`;
    },
    diagnosticMessage: (_match, groups) => {
      const propertyName = groups[2] ?? "";
      return `Fixed missing quotes on property: ${propertyName}: -> "${propertyName}":`;
    },
    contextCheck: isInPropertyContext,
  },

  // Rule: Fix missing opening quote on property names
  // Pattern: `name":` instead of `"name":`
  {
    name: "missingOpeningQuoteOnProperty",
    pattern: /([}\],]|\n|^)(\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:/g,
    replacement: (_match, groups, context) => {
      const [delimiter, whitespace, propertyName] = groups;
      const delimiterStr = delimiter ?? "";
      const whitespaceStr = whitespace ?? "";
      const propertyNameStr = propertyName ?? "";
      // Skip underscore-prefixed uppercase names - handled by missingPropertyNameWithFragment
      if (/^_[A-Z0-9_]+$/.test(propertyNameStr)) {
        return null;
      }
      // Skip Pattern 68 cases: in array context with `: "value",` pattern
      // These are handled by missingQuoteBeforePropertyValueInArray
      const { fullContent, offset } = context;
      const afterMatch = fullContent.substring(
        offset + (typeof _match === "string" ? _match.length : 0),
      );
      if (/^\s*"[^"]+"\s*,/.test(afterMatch)) {
        // Check if we're in an array by looking backwards
        let inString = false;
        let escape = false;
        for (let i = offset - 1; i >= 0; i--) {
          if (escape) {
            escape = false;
            continue;
          }
          if (fullContent[i] === "\\") {
            escape = true;
            continue;
          }
          if (fullContent[i] === '"') {
            inString = !inString;
            continue;
          }
          if (!inString) {
            if (fullContent[i] === "]" || fullContent[i] === "}") break;
            if (fullContent[i] === "[") return null; // In array, let Pattern 68 handle it
          }
        }
      }
      return `${delimiterStr}${whitespaceStr}"${propertyNameStr}":`;
    },
    diagnosticMessage: (_match, groups) => {
      const propertyName = groups[2] ?? "";
      return `Fixed missing opening quote: ${propertyName}" -> "${propertyName}"`;
    },
    contextCheck: isAfterJsonDelimiter,
  },

  // Rule: Fix space before quote in property names
  // Pattern: `"name "groupId",` -> `"name": "groupId",`
  {
    name: "spaceBeforeQuoteInProperty",
    pattern: /"([a-zA-Z_$][a-zA-Z0-9_$]*)\s+"([^"]+)"/g,
    replacement: (_match, groups) => {
      const [propertyName, value] = groups;
      const propertyNameStr = propertyName ?? "";
      const valueStr = value ?? "";
      return `"${propertyNameStr}": "${valueStr}"`;
    },
    diagnosticMessage: (_match, groups) => {
      const propertyName = groups[0] ?? "";
      return `Fixed space before quote: "${propertyName} " -> "${propertyName}": "..."`;
    },
    contextCheck: isInPropertyContext,
  },

  // Rule: Fix malformed property name with mixed colon/quote
  // Pattern: `"name":toBe": "apiRequestBodyAsJson"` -> `"name": "apiRequestBodyAsJson"`
  {
    name: "malformedPropertyColonQuote",
    pattern: /"([^"]+)"\s*:\s*([a-z]{2,10})"\s*:\s*"([^"]+)"/g,
    replacement: (_match, groups) => {
      const [propertyName, , actualValue] = groups;
      const propertyNameStr = propertyName ?? "";
      const actualValueStr = actualValue ?? "";
      return `"${propertyNameStr}": "${actualValueStr}"`;
    },
    diagnosticMessage: (_match, groups) => {
      const propertyName = groups[0] ?? "";
      const insertedWord = groups[1] ?? "";
      const actualValue = groups[2] ?? "";
      return `Fixed malformed property: "${propertyName}":${insertedWord}": "${actualValue}" -> "${propertyName}": "${actualValue}"`;
    },
    contextCheck: isInPropertyContext,
  },

  // Rule: Fix missing colon after property name
  // Pattern: `"type" "JsonCommand"` -> `"type": "JsonCommand"`
  {
    name: "missingColonAfterProperty",
    pattern: /"([a-zA-Z_$][a-zA-Z0-9_$]*)"\s+"([^"]+)"/g,
    replacement: (_match, groups) => {
      const [propertyName, value] = groups;
      const propertyNameStr = propertyName ?? "";
      const valueStr = value ?? "";
      return `"${propertyNameStr}": "${valueStr}"`;
    },
    diagnosticMessage: (_match, groups) => {
      const propertyName = groups[0] ?? "";
      return `Fixed missing colon: "${propertyName}" "..." -> "${propertyName}": "..."`;
    },
    contextCheck: isInPropertyContext,
  },

  // Rule: Fix truncated property names
  // Pattern: `se": "This test validates...` -> `"name": "This test validates...`
  {
    name: "truncatedPropertyName",
    pattern: /([}\],]|\n|^)(\s*)([a-z]{1,3})"\s*:\s*"([^"]{20,})/g,
    replacement: (_match, groups) => {
      const [delimiter, whitespace, , valueStart] = groups;
      const delimiterStr = delimiter ?? "";
      const whitespaceStr = whitespace ?? "";
      const valueStartStr = valueStart ?? "";
      const fullProperty = "name"; // Generic default for truncated property names
      return `${delimiterStr}${whitespaceStr}"${fullProperty}": "${valueStartStr}`;
    },
    diagnosticMessage: (_match, groups) => {
      const truncated = groups[2] ?? "";
      return `Fixed truncated property name: ${truncated}" -> "name"`;
    },
    contextCheck: isInPropertyContext,
  },

  // Rule: Fix missing property name before colon
  // Pattern: `": "value"` -> `"name": "value"`
  {
    name: "missingPropertyNameBeforeColon",
    pattern: /([{,]\s+)"\s*:\s*"([^"]{20,})"/g,
    replacement: (_match, groups) => {
      const [prefix, value] = groups;
      const prefixStr = prefix ?? "";
      const valueStr = value ?? "";
      const inferredProperty = "name";
      return `${prefixStr}"${inferredProperty}": "${valueStr}"`;
    },
    diagnosticMessage: () => 'Fixed missing property name before colon: ": -> "name":',
  },

  // Rule: Fix missing property name with underscore fragment
  // Pattern: `{_PARAM_TABLE": "table"` -> `{"name": "PARAM_TABLE"`
  {
    name: "missingPropertyNameWithFragment",
    pattern: /\{\s*([_][a-zA-Z0-9_]+)"\s*:\s*"([^"]+)"/g,
    replacement: (_match, groups) => {
      const fragment = groups[0] ?? "";
      const fixedValue = fragment.substring(1); // Remove leading underscore
      return `{"name": "${fixedValue}"`;
    },
    diagnosticMessage: (_match, groups) => {
      const fragment = groups[0] ?? "";
      const fixedValue = fragment.substring(1);
      return `Fixed missing property name with fragment: {${fragment}" -> {"name": "${fixedValue}"`;
    },
    skipInString: false,
  },

  // Rule: Fix duplicate property names
  // Pattern: `"purpose": "purpose": "value"` -> `"purpose": "value"`
  {
    name: "duplicatePropertyName",
    pattern: /"([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:\s*"\1"\s*:\s*"([^"]+)"/g,
    replacement: (_match, groups) => {
      const [propertyName, value] = groups;
      const propertyNameStr = propertyName ?? "";
      const valueStr = value ?? "";
      return `"${propertyNameStr}": "${valueStr}"`;
    },
    diagnosticMessage: (_match, groups) => {
      const propertyName = groups[0] ?? "";
      return `Fixed duplicate property name: "${propertyName}": "${propertyName}": -> "${propertyName}":`;
    },
  },

  // Rule: Fix missing opening quote on property names with values
  // Pattern: `propertyName": value` -> `"propertyName": value`
  {
    name: "missingOpeningQuoteOnPropertyWithValue",
    pattern: /([}\],]|\n|^)(\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:\s*([^,}\]]+)/g,
    replacement: (_match, groups, context) => {
      const [delimiter, whitespace, propertyName, value] = groups;
      const delimiterStr = delimiter ?? "";
      const whitespaceStr = whitespace ?? "";
      const propertyNameStr = propertyName ?? "";
      const valueStr = value ?? "";

      // Skip Pattern 68 cases: DIRECTLY in array context with string value
      // These are handled by missingQuoteBeforePropertyValueInArray
      if (/^"[^"]+"$/.test(valueStr.trim())) {
        const { fullContent, offset } = context;
        // Check what comes after this match - if comma, it's likely an array element
        const matchLen = typeof _match === "string" ? _match.length : 0;
        const afterMatch = fullContent.substring(offset + matchLen);
        if (/^\s*,/.test(afterMatch)) {
          // Check if we're DIRECTLY in an array (not inside an object within array)
          // by finding the first unmatched `[` or `{` looking backwards
          let inString = false;
          let escape = false;
          let braceDepth = 0;
          let bracketDepth = 0;
          for (let i = offset - 1; i >= 0; i--) {
            if (escape) {
              escape = false;
              continue;
            }
            if (fullContent[i] === "\\") {
              escape = true;
              continue;
            }
            if (fullContent[i] === '"') {
              inString = !inString;
              continue;
            }
            if (!inString) {
              if (fullContent[i] === "}") {
                braceDepth++;
                continue;
              }
              if (fullContent[i] === "]") {
                bracketDepth++;
                continue;
              }
              if (fullContent[i] === "{") {
                if (braceDepth > 0) {
                  braceDepth--;
                  continue;
                }
                break; // Found unmatched `{`, we're in an object
              }
              if (fullContent[i] === "[") {
                if (bracketDepth > 0) {
                  bracketDepth--;
                  continue;
                }
                return null; // Found unmatched `[`, DIRECTLY in array - let Pattern 68 handle
              }
            }
          }
        }
      }

      return `${delimiterStr}${whitespaceStr}"${propertyNameStr}": ${valueStr}`;
    },
    diagnosticMessage: (_match, groups) => {
      const propertyName = groups[2] ?? "";
      return `Fixed missing opening quote: ${propertyName}" -> "${propertyName}"`;
    },
    contextCheck: isInPropertyContext,
  },

  // Rule: Fix malformed property with backtick and colon
  // Pattern: `"name":\`:toBe":` -> `"name": "toBe",`
  {
    name: "malformedPropertyBacktickColon",
    pattern: /"([^"]+)"\s*:\s*`:\s*([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:/g,
    replacement: (_match, groups) => {
      const [propertyName, value] = groups;
      const propertyNameStr = propertyName ?? "";
      const valueStr = value ?? "";
      return `"${propertyNameStr}": "${valueStr}",`;
    },
    diagnosticMessage: (_match, groups) => {
      const propertyName = groups[0] ?? "";
      const value = groups[1] ?? "";
      return `Fixed malformed property: "${propertyName}":\`:${value}": -> "${propertyName}": "${value}",`;
    },
  },

  // Rule: Fix property names with embedded text matching value
  // Pattern: `"name payLoanCharge": "payLoanCharge"` -> `"name": "payLoanCharge"`
  {
    name: "propertyNameWithEmbeddedValue",
    pattern: /"(name|type|value|id|key|kind|text)\s+([^"]+)":\s*"([^"]+)"/gi,
    replacement: (_match, groups) => {
      const [propertyNamePart, embeddedPart, value] = groups;
      const propertyNamePartStr = propertyNamePart ?? "";
      const embeddedPartStr = embeddedPart ?? "";
      const valueStr = value ?? "";
      // Check if embedded matches value
      if (
        embeddedPartStr === valueStr ||
        embeddedPartStr.toLowerCase() === valueStr.toLowerCase()
      ) {
        return `"${propertyNamePartStr}": "${valueStr}"`;
      }
      // Return null to skip if not a match
      return null;
    },
    diagnosticMessage: (_match, groups) => {
      const propertyNamePart = groups[0] ?? "";
      const embeddedPart = groups[1] ?? "";
      return `Fixed property with embedded value: "${propertyNamePart} ${embeddedPart}" -> "${propertyNamePart}"`;
    },
  },

  // Rule: Fix non-ASCII quotes before property names
  // Pattern: `ʻlinesOfCode": 3` -> `"linesOfCode": 3`
  {
    name: "nonAsciiQuoteBeforeProperty",
    pattern: /([}\],]|\n|^)(\s*)[\u02BB\u2018\u2019\u201C\u201D]([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:/g,
    replacement: (_match, groups) => {
      const [delimiter, whitespace, propertyName] = groups;
      const delimiterStr = delimiter ?? "";
      const whitespaceStr = whitespace ?? "";
      const propertyNameStr = propertyName ?? "";
      return `${delimiterStr}${whitespaceStr}"${propertyNameStr}":`;
    },
    diagnosticMessage: (_match, groups) => {
      const propertyName = groups[2] ?? "";
      return `Fixed non-ASCII quote before property: "${propertyName}"`;
    },
  },

  // Rule: Fix type with embedded word
  // Pattern: `"type savory": "SavingsInterestCalculationType"` -> `"type": "SavingsInterestCalculationType"`
  {
    name: "typeWithEmbeddedWord",
    pattern: /"(type)\s+[a-z]+"\s*:\s*"([^"]+)"/gi,
    replacement: (_match, groups) => {
      const value = groups[1] ?? "";
      return `"type": "${value}"`;
    },
    diagnosticMessage: () => 'Fixed type with embedded word: "type ..." -> "type"',
  },

  // Rule: Fix missing opening quote on property values
  // Pattern: `"type":JsonCommand"` -> `"type": "JsonCommand"`
  {
    name: "missingOpeningQuoteOnPropertyValue",
    pattern: /"([^"]+)"\s*:\s*([a-zA-Z_$][a-zA-Z0-9_$]*)"(\s*[,}])/g,
    replacement: (_match, groups) => {
      const [propertyName, value, terminator] = groups;
      const propertyNameStr = propertyName ?? "";
      const valueStr = value ?? "";
      const terminatorStr = terminator ?? "";
      return `"${propertyNameStr}": "${valueStr}"${terminatorStr}`;
    },
    diagnosticMessage: (_match, groups) => {
      const propertyName = groups[0] ?? "";
      const value = groups[1] ?? "";
      return `Fixed missing opening quote on value: "${propertyName}":${value}" -> "${propertyName}": "${value}"`;
    },
  },

  // Rule: Fix corrupted property assignment
  // Pattern: `"name":alue": "LocalDate"` -> `"name": "LocalDate"`
  {
    name: "corruptedPropertyAssignment",
    pattern: /"([^"]+)"\s*:\s*([a-zA-Z]+)"\s*:\s*"([^"]+)"/g,
    replacement: (_match, groups) => {
      const [propertyName, , value] = groups;
      const propertyNameStr = propertyName ?? "";
      const valueStr = value ?? "";
      return `"${propertyNameStr}": "${valueStr}"`;
    },
    diagnosticMessage: (_match, groups) => {
      const propertyName = groups[0] ?? "";
      const corruptedPart = groups[1] ?? "";
      const value = groups[2] ?? "";
      return `Fixed corrupted property assignment: "${propertyName}":${corruptedPart}": "${value}" -> "${propertyName}": "${value}"`;
    },
  },

  // Rule: Fix malformed parameter objects with corrupted names
  // Pattern: `"name":toBeContinued": "true"` -> `"name": "toBeContinued"`
  {
    name: "malformedParameterObject",
    pattern: /"([^"]+)"\s*:\s*([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:\s*"([^"]+)"/g,
    replacement: (_match, groups) => {
      const [propertyName, unquotedValue] = groups;
      const propertyNameStr = propertyName ?? "";
      const unquotedValueStr = unquotedValue ?? "";
      return `"${propertyNameStr}": "${unquotedValueStr}"`;
    },
    diagnosticMessage: (_match, groups) => {
      const propertyName = groups[0] ?? "";
      const unquotedValue = groups[1] ?? "";
      return `Fixed malformed parameter: "${propertyName}":${unquotedValue}": ... -> "${propertyName}": "${unquotedValue}"`;
    },
  },

  // Rule: Remove dash before property name
  // Pattern: `- "externalReferences":` -> `"externalReferences":`
  {
    name: "dashBeforePropertyName",
    pattern: /([}\],]|\n|^)(\s*)-\s+("([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:)/g,
    replacement: (_match, groups) => {
      const [delimiter, whitespace, propertyWithQuote] = groups;
      const delimiterStr = delimiter ?? "";
      const whitespaceStr = whitespace ?? "";
      const propertyWithQuoteStr = propertyWithQuote ?? "";
      return `${delimiterStr}${whitespaceStr}${propertyWithQuoteStr}`;
    },
    diagnosticMessage: "Removed dash before property name",
    contextCheck: isAfterJsonDelimiter,
  },

  // Rule: Fix missing property name with underscore fragment (with whitespace, no opening brace)
  // Pattern: `      _PARAM_TABLE": "table"` -> `      "name": "PARAM_TABLE"`
  {
    name: "missingPropertyNameWithFragmentWhitespace",
    pattern: /(\s+)([_][A-Z0-9_]+)"\s*:\s*"([^"]+)"/g,
    replacement: (_match, groups, context) => {
      const { beforeMatch } = context;
      // Extract whitespace to preserve indentation - prefer from beforeMatch, fallback to groups
      const whitespaceRegex = /(\s+)$/;
      const whitespaceMatch = whitespaceRegex.exec(beforeMatch);
      const groupsRegex = /(\s+)/;
      const whitespaceFromGroups = groups[0] ? groupsRegex.exec(groups[0])?.[1] : undefined;
      const whitespace = whitespaceMatch ? whitespaceMatch[1] : (whitespaceFromGroups ?? "      ");

      const fragment = groups[1];
      const fragmentStr = fragment ?? "";
      // Remove leading underscore and use fragment as the value, ignore the original value
      const fixedValue = fragmentStr.substring(1);
      return `${whitespace}"name": "${fixedValue}"`;
    },
    diagnosticMessage: (_match, groups) => {
      const fragment = groups[1] ?? "";
      const fixedValue = fragment.substring(1);
      return `Fixed missing property name with fragment: ${fragment}" -> "name": "${fixedValue}"`;
    },
    skipInString: false, // This pattern should match even if quotes are present
  },

  // Rule: Fix duplicate property names
  // Pattern: `"purpose": "purpose": "value"` -> `"purpose": "value"`
  {
    name: "duplicatePropertyNameInDescription",
    pattern: /"([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:\s*"\1"\s*:\s*"([^"]+)"/g,
    replacement: (_match, groups) => {
      const [propertyName, value] = groups;
      const propertyNameStr = propertyName ?? "";
      const valueStr = value ?? "";
      return `"${propertyNameStr}": "${valueStr}"`;
    },
    diagnosticMessage: (_match, groups) => {
      const propertyName = groups[0] ?? "";
      return `Fixed duplicate property name: "${propertyName}": "${propertyName}": -> "${propertyName}":`;
    },
  },
];
