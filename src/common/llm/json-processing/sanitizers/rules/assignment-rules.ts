/**
 * Replacement rules for fixing assignment syntax issues in JSON.
 * This module handles:
 * - `:=` instead of `:` assignment operators
 * - Stray text between colon and value
 * - Missing quotes around property values
 * - Stray characters like minus signs before colons
 *
 * These rules replace the imperative logic in assignment-syntax-fixer.ts
 * with a declarative approach consistent with other rule modules.
 */

import type { ReplacementRule, ContextInfo } from "./replacement-rule.types";
import { isInStringAt } from "../../utils/parser-context-utils";
import { isJsonKeyword } from "../../utils/stray-text-detection";

/** Pattern for JSON numeric values (integers, floats, scientific notation) */
const JSON_NUMBER_PATTERN = /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/;

/**
 * Checks if the match is in a valid property context by verifying we're not inside a string.
 * Uses quote counting to determine string state.
 */
function isNotInsideString(context: ContextInfo): boolean {
  const { beforeMatch } = context;
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

  return quoteCount % 2 === 0;
}

/**
 * Checks if we're in a valid property context (after {, [, ], }, comma, or newline).
 */
function isInPropertyContext(context: ContextInfo): boolean {
  const { beforeMatch, offset } = context;

  // Accept matches near the start of content
  if (offset <= 20) {
    return true;
  }

  return /[{,\]]\s*$/.test(beforeMatch) || /\n\s*$/.test(beforeMatch);
}

/**
 * Rules for fixing assignment syntax issues in JSON content.
 */
export const ASSIGNMENT_RULES: readonly ReplacementRule[] = [
  // Rule: Fix stray text directly after colon
  // Pattern: `"name":strayText": "value"` -> `"name": "value"`
  // This must run early to fix the most common corruption pattern
  {
    name: "strayTextDirectlyAfterColon",
    pattern: /"([a-zA-Z_$][a-zA-Z0-9_$.]*)"\s*:([a-zA-Z_$0-9]{1,10})":\s*"([^"]+)"/g,
    replacement: (_match, groups) => {
      const [propertyName, , value] = groups;
      const propertyNameStr = propertyName ?? "";
      const valueStr = value ?? "";
      return `"${propertyNameStr}": "${valueStr}"`;
    },
    diagnosticMessage: (_match, groups) => {
      const propertyName = groups[0] ?? "";
      const strayText = groups[1] ?? "";
      return `Removed stray text "${strayText}" directly after colon: "${propertyName}":${strayText}":`;
    },
    skipInString: false, // Pattern itself handles string context
  },

  // Rule: Fix := assignment operator to standard :
  // Pattern: `"prop":= value` -> `"prop": value`
  {
    name: "assignmentOperatorToColon",
    pattern: /("([^"]+)")\s*:=\s*(\s*)/g,
    replacement: (_match, groups, context) => {
      const [quotedProperty, _propertyName, whitespaceAfter] = groups;
      const quotedPropStr = quotedProperty ?? "";
      const wsAfter = whitespaceAfter && whitespaceAfter.trim() === "" ? whitespaceAfter : " ";

      // Verify we're in a property context and not inside a string
      if (!isInPropertyContext(context) || !isNotInsideString(context)) {
        return null;
      }

      return `${quotedPropStr}:${wsAfter}`;
    },
    diagnosticMessage: (_match, groups) => {
      const propertyName = groups[1] ?? "";
      return `Fixed assignment syntax: "${propertyName}":= -> "${propertyName}":`;
    },
    skipInString: true,
    contextLookback: 100,
  },

  // Rule: Fix stray minus signs before colons
  // Pattern: `"prop":- value` -> `"prop": value`
  {
    name: "strayMinusBeforeColon",
    pattern: /("([^"]+)")\s*:-\s*/g,
    replacement: (_match, groups, context) => {
      const [quotedProperty] = groups;
      const quotedPropStr = quotedProperty ?? "";

      if (!isNotInsideString(context)) {
        return null;
      }

      return `${quotedPropStr}: `;
    },
    diagnosticMessage: (_match, groups) => {
      const propertyName = groups[1] ?? "";
      return `Removed stray minus sign before colon: "${propertyName}":-`;
    },
    skipInString: true,
  },

  // Rule: Fix stray text between colon and opening quote (with space)
  // Pattern: `"name": strayText": "value"` -> `"name": "value"`
  {
    name: "strayTextBetweenColonAndValue",
    pattern: /"([a-zA-Z_$][a-zA-Z0-9_$.]*)"\s*:\s+([a-zA-Z_$0-9]{1,10})":\s*"([^"]+)"/g,
    replacement: (_match, groups, context) => {
      const [propertyName, _strayText, value] = groups;
      const propertyNameStr = propertyName ?? "";
      const valueStr = value ?? "";

      // Skip if inside a string literal
      if (isInStringAt(context.offset, context.fullContent)) {
        return null;
      }

      // Verify property context
      const { beforeMatch } = context;
      const hasPropertyNamePattern = /"\s*$/.test(beforeMatch) || /[}\],\]]\s*$/.test(beforeMatch);

      if (!hasPropertyNamePattern && !beforeMatch.trim().endsWith('"')) {
        const trimmedContext = beforeMatch.trim();
        const isInObjectOrArray = /[{]\s*$/.test(trimmedContext) || trimmedContext.includes("[");
        if (!isInObjectOrArray) {
          return null;
        }
      }

      return `"${propertyNameStr}": "${valueStr}"`;
    },
    diagnosticMessage: (_match, groups) => {
      const strayText = groups[1] ?? "";
      return `Removed stray text "${strayText}" between colon and value`;
    },
    skipInString: false, // We handle this manually
    contextLookback: 100,
  },

  // Rule: Fix missing opening quotes on property values
  // Pattern: `"type":JsonCommand"` -> `"type": "JsonCommand"`
  // Excludes JSON keywords and numeric values
  {
    name: "missingOpeningQuoteOnValue",
    pattern: /"([a-zA-Z_$][a-zA-Z0-9_$]*)":\s*([a-zA-Z_$][a-zA-Z0-9_$]*)"([,}])/g,
    replacement: (_match, groups, context) => {
      const [propertyName, value, delimiter] = groups;
      const propertyNameStr = propertyName ?? "";
      const valueStr = value ?? "";
      const delimiterStr = delimiter ?? "";

      // Verify we're not inside a string
      if (!isNotInsideString(context)) {
        return null;
      }

      // Skip JSON keywords (true, false, null, undefined)
      if (isJsonKeyword(valueStr)) {
        return null;
      }

      // Skip numeric values
      if (JSON_NUMBER_PATTERN.test(valueStr)) {
        return null;
      }

      return `"${propertyNameStr}": "${valueStr}"${delimiterStr}`;
    },
    diagnosticMessage: (_match, groups) => {
      const propertyName = groups[0] ?? "";
      const value = groups[1] ?? "";
      return `Fixed missing quotes around property value: "${propertyName}":${value}"`;
    },
    skipInString: true,
    contextLookback: 200,
  },

  // Rule: Fix unquoted string values
  // Pattern: `"prop": unquotedValue,` -> `"prop": "unquotedValue",`
  // Excludes JSON keywords, numbers, objects, and arrays
  {
    name: "unquotedStringValue",
    pattern: /"([a-zA-Z_$][a-zA-Z0-9_$.]*)"\s*:\s*([a-zA-Z_$][a-zA-Z0-9_$.]+)(\s*[,}\]]|[,}\]]|$)/g,
    replacement: (match, groups, context) => {
      const [propertyName, unquotedValue, terminator] = groups;
      const propertyNameStr = propertyName ?? "";
      const unquotedValueStr = unquotedValue?.trim() ?? "";
      const terminatorStr = terminator ?? "";

      // Skip if inside a string literal
      if (isInStringAt(context.offset, context.fullContent)) {
        return null;
      }

      // Skip empty values
      if (!unquotedValueStr || unquotedValueStr.length === 0) {
        return null;
      }

      // Skip JSON keywords (true, false, null, undefined)
      if (isJsonKeyword(unquotedValueStr)) {
        return null;
      }

      // Skip numeric values
      if (JSON_NUMBER_PATTERN.test(unquotedValueStr)) {
        return null;
      }

      // Skip corrupted numeric values like _3 (handled by invalidLiteralFixer)
      if (/^_\d+$/.test(unquotedValueStr)) {
        return null;
      }

      // Skip if value starts with object or array
      if (unquotedValueStr.startsWith("{") || unquotedValueStr.startsWith("[")) {
        return null;
      }

      // Preserve original whitespace after colon
      const colonIndex = match.indexOf(":");
      const afterColon = match.substring(colonIndex + 1);
      const whitespaceMatch = /^\s*/.exec(afterColon);
      const whitespaceAfterColon = whitespaceMatch ? whitespaceMatch[0] : " ";

      return `"${propertyNameStr}":${whitespaceAfterColon}"${unquotedValueStr}"${terminatorStr}`;
    },
    diagnosticMessage: (_match, groups) => {
      const propertyName = groups[0] ?? "";
      const unquotedValue = groups[1] ?? "";
      return `Fixed unquoted string value: "${propertyName}": ${unquotedValue}`;
    },
    skipInString: false, // We handle this manually
  },
];
