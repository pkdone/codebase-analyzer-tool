/**
 * Replacement rules for handling property name issues in JSON.
 * This module handles:
 * - Missing quotes on property names
 * - Corrupted property names with extra characters
 * - Malformed property-value pairs
 * - Truncated property names
 *
 * Rules can use schema metadata (when available via context.config) for smarter
 * property name inference, with graceful fallback to generic defaults.
 */

import type { ReplacementRule } from "../replacement-rule.types";
import { isAfterJsonDelimiter, isInPropertyContext } from "../../../utils/parser-context-utils";
import { inferPropertyName, isKnownProperty } from "../../../utils/property-name-inference";
import { safeGroup, safeGroups3, safeGroups4 } from "../../../utils/safe-group-extractor";

/**
 * Rules for fixing property name issues in JSON content.
 */
export const PROPERTY_NAME_RULES: readonly ReplacementRule[] = [
  // Rule: Fix corrupted property names with extra text after colon
  // Pattern: `"name":g": "value"` -> `"name": "value"`
  // Pattern: `"name":123": "value"` -> `"name": "value"` (alphanumeric corruption)
  // Pattern: `"name":@#$": "value"` -> `"name": "value"` (special char corruption)
  // Uses generic character class to catch any non-structural garbage characters
  {
    name: "corruptedPropertyNameExtraText",
    pattern: /"([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:\s*([^\s":,}\][\n]{1,20})\s*":(\s*[,}])/g,
    replacement: (_match, groups) => {
      const [propertyName, , terminator] = safeGroups3(groups);
      return `"${propertyName}":${terminator}`;
    },
    diagnosticMessage: (_match, groups) => {
      const propertyName = safeGroup(groups, 0);
      const extraText = safeGroup(groups, 1);
      return `Fixed corrupted property name: "${propertyName}":${extraText}": -> "${propertyName}":`;
    },
  },

  // Rule: Fix corrupted property values with encoding markers
  // Pattern: `"propertyName":_CODE\`4,` -> `"propertyName": 4,`
  // Pattern: `"propertyName":_VALUE\`123,` -> `"propertyName": 123,`
  // Pattern: `"propertyName":__TAG__\`5,` -> `"propertyName": 5,`
  // Generic pattern catches any _UPPERCASE marker (including underscores) followed by backtick and number
  {
    name: "corruptedPropertyValue",
    pattern: /"([^"]+)"\s*:\s*_[A-Z_]+`(\d+)(\s*[,}])/g,
    replacement: (_match, groups) => {
      const [propertyName, digits, terminator] = safeGroups3(groups);
      return `"${propertyName}": ${digits}${terminator}`;
    },
    diagnosticMessage: (_match, groups) => {
      const propertyName = safeGroup(groups, 0);
      const digits = safeGroup(groups, 1);
      return `Fixed corrupted property value: "${propertyName}":_...\`${digits} -> "${propertyName}": ${digits}`;
    },
  },

  // Rule: Fix missing quotes on property names followed by arrays/objects
  // Pattern: `propertyName: [` -> `"propertyName": [`
  {
    name: "missingQuotesOnPropertyWithArrayObject",
    pattern: /([}\],]|\n|^)(\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:\s*(\[|{)/g,
    replacement: (_match, groups) => {
      const [delimiter, whitespace, propertyName, valueStart] = safeGroups4(groups);
      return `${delimiter}${whitespace}"${propertyName}": ${valueStart}`;
    },
    diagnosticMessage: (_match, groups) => {
      const propertyName = safeGroup(groups, 2);
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
      const [delimiter, whitespace, propertyName] = safeGroups3(groups);
      // Skip underscore-prefixed uppercase names - handled by missingPropertyNameWithFragment
      if (/^_[A-Z0-9_]+$/.test(propertyName)) {
        return null;
      }
      // Skip cases in array context with `: "value",` pattern
      // (handled by missingQuoteBeforePropertyValueInArray)
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
            if (fullContent[i] === "[") return null; // In array context, skip this rule
          }
        }
      }
      return `${delimiter}${whitespace}"${propertyName}":`;
    },
    diagnosticMessage: (_match, groups) => {
      const propertyName = safeGroup(groups, 2);
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
      const [propertyName, value] = safeGroups3(groups);
      return `"${propertyName}": "${value}"`;
    },
    diagnosticMessage: (_match, groups) => {
      const propertyName = safeGroup(groups, 0);
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
      const [propertyName, , actualValue] = safeGroups3(groups);
      return `"${propertyName}": "${actualValue}"`;
    },
    diagnosticMessage: (_match, groups) => {
      const propertyName = safeGroup(groups, 0);
      const insertedWord = safeGroup(groups, 1);
      const actualValue = safeGroup(groups, 2);
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
      const [propertyName, value] = safeGroups3(groups);
      return `"${propertyName}": "${value}"`;
    },
    diagnosticMessage: (_match, groups) => {
      const propertyName = safeGroup(groups, 0);
      return `Fixed missing colon: "${propertyName}" "..." -> "${propertyName}": "..."`;
    },
    contextCheck: isInPropertyContext,
  },

  // Rule: Fix truncated property names
  // Pattern: `se": "This test validates...` -> `"name": "This test validates...`
  // Uses schema-aware inference when config is available
  {
    name: "truncatedPropertyName",
    pattern: /([}\],]|\n|^)(\s*)([a-z]{1,3})"\s*:\s*"([^"]{20,})/g,
    replacement: (_match, groups, context) => {
      const [delimiter, whitespace, truncatedPart, valueStart] = safeGroups4(groups);

      // Use schema-aware inference when config is available
      const knownProperties = context.config?.knownProperties;
      const fullProperty = inferPropertyName(truncatedPart, knownProperties);

      return `${delimiter}${whitespace}"${fullProperty}": "${valueStart}`;
    },
    diagnosticMessage: (_match, groups) => {
      const truncated = safeGroup(groups, 2);
      return `Fixed truncated property name: ${truncated}" -> inferred property`;
    },
    contextCheck: isInPropertyContext,
  },

  // Rule: Fix missing property name before colon
  // Pattern: `": "value"` -> `"name": "value"`
  // Uses schema-aware inference when config is available
  {
    name: "missingPropertyNameBeforeColon",
    pattern: /([{,]\s+)"\s*:\s*"([^"]{20,})"/g,
    replacement: (_match, groups, context) => {
      const [prefix, value] = safeGroups3(groups);

      // Use schema-aware inference when config is available
      const knownProperties = context.config?.knownProperties;
      const inferredProperty = inferPropertyName("", knownProperties);

      return `${prefix}"${inferredProperty}": "${value}"`;
    },
    diagnosticMessage: () => 'Fixed missing property name before colon: ": -> inferred property',
  },

  // Rule: Fix missing property name with underscore fragment
  // Pattern: `{_PARAM_TABLE": "table"` -> `{"name": "PARAM_TABLE"`
  {
    name: "missingPropertyNameWithFragment",
    pattern: /\{\s*([_][a-zA-Z0-9_]+)"\s*:\s*"([^"]+)"/g,
    replacement: (_match, groups) => {
      const fragment = safeGroup(groups, 0);
      const fixedValue = fragment.substring(1); // Remove leading underscore
      return `{"name": "${fixedValue}"`;
    },
    diagnosticMessage: (_match, groups) => {
      const fragment = safeGroup(groups, 0);
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
      const [propertyName, value] = safeGroups3(groups);
      return `"${propertyName}": "${value}"`;
    },
    diagnosticMessage: (_match, groups) => {
      const propertyName = safeGroup(groups, 0);
      return `Fixed duplicate property name: "${propertyName}": "${propertyName}": -> "${propertyName}":`;
    },
  },

  // Rule: Fix missing opening quote on property names with values
  // Pattern: `propertyName": value` -> `"propertyName": value`
  {
    name: "missingOpeningQuoteOnPropertyWithValue",
    pattern: /([}\],]|\n|^)(\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:\s*([^,}\]]+)/g,
    replacement: (_match, groups, context) => {
      const [delimiter, whitespace, propertyName, value] = safeGroups4(groups);

      // Skip cases directly in array context with string value
      // (handled by missingQuoteBeforePropertyValueInArray)
      if (/^"[^"]+"$/.test(value.trim())) {
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
                return null; // Found unmatched `[`, directly in array - skip this rule
              }
            }
          }
        }
      }

      return `${delimiter}${whitespace}"${propertyName}": ${value}`;
    },
    diagnosticMessage: (_match, groups) => {
      const propertyName = safeGroup(groups, 2);
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
      const [propertyName, value] = safeGroups3(groups);
      return `"${propertyName}": "${value}",`;
    },
    diagnosticMessage: (_match, groups) => {
      const propertyName = safeGroup(groups, 0);
      const value = safeGroup(groups, 1);
      return `Fixed malformed property: "${propertyName}":\`:${value}": -> "${propertyName}": "${value}",`;
    },
  },

  // Rule: Fix property names with embedded text matching value
  // Pattern: `"name payLoanCharge": "payLoanCharge"` -> `"name": "payLoanCharge"`
  // Uses schema-aware checking when config is available
  {
    name: "propertyNameWithEmbeddedValue",
    pattern: /"([a-zA-Z_$][a-zA-Z0-9_$]*)\s+([^"]+)":\s*"([^"]+)"/gi,
    replacement: (_match, groups, context) => {
      const [propertyNamePart, embeddedPart, value] = safeGroups3(groups);

      // Check if the property name part is a known property (schema-aware or fallback)
      const knownProperties = context.config?.knownProperties;
      if (!isKnownProperty(propertyNamePart, knownProperties)) {
        // Not a known property, skip this replacement
        return null;
      }

      // Check if embedded matches value
      if (embeddedPart === value || embeddedPart.toLowerCase() === value.toLowerCase()) {
        return `"${propertyNamePart}": "${value}"`;
      }
      // Return null to skip if not a match
      return null;
    },
    diagnosticMessage: (_match, groups) => {
      const propertyNamePart = safeGroup(groups, 0);
      const embeddedPart = safeGroup(groups, 1);
      return `Fixed property with embedded value: "${propertyNamePart} ${embeddedPart}" -> "${propertyNamePart}"`;
    },
  },

  // Rule: Fix non-ASCII quotes before property names
  // Pattern: `ʻlinesOfCode": 3` -> `"linesOfCode": 3`
  // Uses Unicode category for "quotation mark-like" characters including:
  // - U+02BB (ʻ), U+02BC (ʼ) - modifier letters
  // - U+2018-U+201F - general punctuation quotes (', ', ", ", ‟, etc.)
  // - U+0060 (`) - backtick (grave accent)
  // - U+00B4 (´) - acute accent
  {
    name: "nonAsciiQuoteBeforeProperty",
    pattern:
      /([}\],]|\n|^)(\s*)[\u02BB\u02BC\u2018\u2019\u201A\u201B\u201C\u201D\u201E\u201F\u0060\u00B4]([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:/g,
    replacement: (_match, groups) => {
      const [delimiter, whitespace, propertyName] = safeGroups3(groups);
      return `${delimiter}${whitespace}"${propertyName}":`;
    },
    diagnosticMessage: (_match, groups) => {
      const propertyName = safeGroup(groups, 2);
      return `Fixed non-ASCII quote before property: "${propertyName}"`;
    },
  },

  // Rule: Fix known property names with embedded word
  // Pattern: `"type savory": "SavingsInterestCalculationType"` -> `"type": "SavingsInterestCalculationType"`
  // Uses schema-aware checking when config is available
  {
    name: "typeWithEmbeddedWord",
    pattern: /"([a-zA-Z_$][a-zA-Z0-9_$]*)\s+[a-z]+"\s*:\s*"([^"]+)"/gi,
    replacement: (_match, groups, context) => {
      const [propertyName, value] = safeGroups3(groups);

      // Check if the property name is known (schema-aware or fallback)
      const knownProperties = context.config?.knownProperties;
      if (!isKnownProperty(propertyName, knownProperties)) {
        return null;
      }

      return `"${propertyName}": "${value}"`;
    },
    diagnosticMessage: (_match, groups) => {
      const propertyName = safeGroup(groups, 0);
      return `Fixed property with embedded word: "${propertyName} ..." -> "${propertyName}"`;
    },
  },

  // Rule: Fix missing opening quote on property values
  // Pattern: `"type":JsonCommand"` -> `"type": "JsonCommand"`
  {
    name: "missingOpeningQuoteOnPropertyValue",
    pattern: /"([^"]+)"\s*:\s*([a-zA-Z_$][a-zA-Z0-9_$]*)"(\s*[,}])/g,
    replacement: (_match, groups) => {
      const [propertyName, value, terminator] = safeGroups3(groups);
      return `"${propertyName}": "${value}"${terminator}`;
    },
    diagnosticMessage: (_match, groups) => {
      const propertyName = safeGroup(groups, 0);
      const value = safeGroup(groups, 1);
      return `Fixed missing opening quote on value: "${propertyName}":${value}" -> "${propertyName}": "${value}"`;
    },
  },

  // Rule: Fix corrupted property assignment
  // Pattern: `"name":alue": "LocalDate"` -> `"name": "LocalDate"`
  {
    name: "corruptedPropertyAssignment",
    pattern: /"([^"]+)"\s*:\s*([a-zA-Z]+)"\s*:\s*"([^"]+)"/g,
    replacement: (_match, groups) => {
      const [propertyName, , value] = safeGroups3(groups);
      return `"${propertyName}": "${value}"`;
    },
    diagnosticMessage: (_match, groups) => {
      const propertyName = safeGroup(groups, 0);
      const corruptedPart = safeGroup(groups, 1);
      const value = safeGroup(groups, 2);
      return `Fixed corrupted property assignment: "${propertyName}":${corruptedPart}": "${value}" -> "${propertyName}": "${value}"`;
    },
  },

  // Rule: Fix malformed parameter objects with corrupted names
  // Pattern: `"name":toBeContinued": "true"` -> `"name": "toBeContinued"`
  {
    name: "malformedParameterObject",
    pattern: /"([^"]+)"\s*:\s*([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:\s*"([^"]+)"/g,
    replacement: (_match, groups) => {
      const [propertyName, unquotedValue] = safeGroups3(groups);
      return `"${propertyName}": "${unquotedValue}"`;
    },
    diagnosticMessage: (_match, groups) => {
      const propertyName = safeGroup(groups, 0);
      const unquotedValue = safeGroup(groups, 1);
      return `Fixed malformed parameter: "${propertyName}":${unquotedValue}": ... -> "${propertyName}": "${unquotedValue}"`;
    },
  },

  // Rule: Remove dash before property name
  // Pattern: `- "externalReferences":` -> `"externalReferences":`
  {
    name: "dashBeforePropertyName",
    pattern: /([}\],]|\n|^)(\s*)-\s+("([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:)/g,
    replacement: (_match, groups) => {
      const [delimiter, whitespace, propertyWithQuote] = safeGroups3(groups);
      return `${delimiter}${whitespace}${propertyWithQuote}`;
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

      const fragment = safeGroup(groups, 1);
      // Remove leading underscore and use fragment as the value, ignore the original value
      const fixedValue = fragment.substring(1);
      return `${whitespace}"name": "${fixedValue}"`;
    },
    diagnosticMessage: (_match, groups) => {
      const fragment = safeGroup(groups, 1);
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
      const [propertyName, value] = safeGroups3(groups);
      return `"${propertyName}": "${value}"`;
    },
    diagnosticMessage: (_match, groups) => {
      const propertyName = safeGroup(groups, 0);
      return `Fixed duplicate property name: "${propertyName}": "${propertyName}": -> "${propertyName}":`;
    },
  },
];
