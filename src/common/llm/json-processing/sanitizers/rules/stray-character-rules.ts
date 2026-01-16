/**
 * Replacement rules for handling stray characters in JSON.
 * This module handles:
 * - Single character removal before properties and array elements
 * - Bullet points and asterisks before property names
 * - Stray text before and after JSON structures
 */

import type { ReplacementRule } from "./replacement-rule.types";
import { isAfterJsonDelimiter, isInArrayContext, isDeepArrayContext } from "./rule-executor";
import { isJsonKeyword, looksLikeStrayText } from "../../utils/stray-text-detection";
import { parsingHeuristics } from "../../constants/json-processing.config";

/**
 * Checks if text looks like stray non-JSON content before a property.
 * This is a specialized check that also validates against JSON structural characters.
 *
 * @param text - The text to check
 * @returns True if the text looks like stray content that should be removed
 */
function looksLikeStrayTextBeforeProperty(text: string): boolean {
  const trimmed = text.trim();

  // Empty or whitespace-only is not stray
  if (trimmed.length === 0) {
    return false;
  }

  // If it contains JSON structural characters, don't remove it
  if (/["{}[\]:,]/.test(trimmed)) {
    return false;
  }

  return looksLikeStrayText(trimmed, parsingHeuristics.STRAY_CHARACTER_DETECTION);
}

/**
 * Rules for removing stray characters from JSON content.
 */
export const STRAY_CHARACTER_RULES: readonly ReplacementRule[] = [
  // Rule: Generic removal of stray text before property names
  // Consolidates: extraCharBeforeProperty, strayTextBeforePropertyName, strayTextLongBeforeProperty
  // Catches single chars, short text, and longer text before properties
  // Pattern: `a  "prop":`, `stray text "prop":`, `running on a different machine "prop":`
  {
    name: "genericStrayTextBeforeProperty",
    pattern: /([}\],]|\n|^)(\s*)([a-z][a-z\s]{0,40}?)\s*("([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:)/g,
    replacement: (_match, groups) => {
      const [delimiter, whitespace, strayText, propertyWithQuote] = groups;
      const delimiterStr = delimiter ?? "";
      const whitespaceStr = whitespace ?? "";
      const strayTextStr = (strayText ?? "").trim();
      const propertyWithQuoteStr = propertyWithQuote ?? "";

      // Use structural detection to determine if this is stray text
      if (!looksLikeStrayTextBeforeProperty(strayTextStr)) {
        return null;
      }

      return `${delimiterStr}${whitespaceStr}${propertyWithQuoteStr}`;
    },
    diagnosticMessage: (_match, groups) => {
      const strayText = (groups[2] ?? "").trim();
      return `Removed stray text '${strayText}' before property`;
    },
    contextCheck: isAfterJsonDelimiter,
  },

  // Rule: Remove stray single characters before quoted strings in arrays
  // Pattern: `e"org.apache...` -> `"org.apache...`
  {
    name: "strayCharBeforeQuotedStringInArray",
    pattern: /([,[]\s*\n?\s*)([a-z])("([^"]+)"\s*,)/g,
    replacement: (_match, groups, context) => {
      if (!isDeepArrayContext(context)) {
        return null;
      }
      const [prefix, , quotedString] = groups;
      const prefixStr = prefix ?? "";
      const quotedStringStr = quotedString ?? "";
      const cleanPrefix = prefixStr.replace(/\s*$/, "");
      return `${cleanPrefix}\n    ${quotedStringStr}`;
    },
    diagnosticMessage: (_match, groups) => {
      const strayChar = groups[1] ?? "";
      return `Removed stray character '${strayChar}' before quoted string in array`;
    },
  },

  // Rule: Fix missing property name with single character before quote
  // Pattern: `y"name":` -> `"name":` or `{y"name":` -> `{"name":`
  {
    name: "singleCharBeforePropertyQuote",
    pattern: /([{,]\s*)([a-z])"([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:/g,
    replacement: (_match, groups) => {
      const [prefix, , propertyName] = groups;
      const prefixStr = prefix ?? "";
      const propertyNameStr = propertyName ?? "";
      return `${prefixStr}"${propertyNameStr}":`;
    },
    diagnosticMessage: (_match, groups) => {
      const extraChar = groups[1] ?? "";
      const propertyName = groups[2] ?? "";
      return `Removed extra character '${extraChar}' before property name "${propertyName}"`;
    },
  },

  // Rule: Generic removal of stray prefix (1-10 lowercase chars) before quoted strings in arrays
  // Consolidates: shortPrefixBeforeQuotedString, strayTextBeforeArrayString
  // Pattern: `ar"stringValue"`, `x"value"`, `stray"value",` -> `"value",`
  {
    name: "genericStrayPrefixInArray",
    pattern: /([}\],]|\n|^)(\s*)([a-z]{1,10})"([^"]+)"(\s*,|\s*\])/g,
    replacement: (_match, groups, context) => {
      if (!isInArrayContext(context)) {
        return null;
      }
      const strayPrefix = groups[2] ?? "";
      // Skip if the prefix is a JSON keyword
      if (isJsonKeyword(strayPrefix)) {
        return null;
      }
      const [delimiter, whitespace, , stringValue, terminator] = groups;
      const delimiterStr = delimiter ?? "";
      const whitespaceStr = whitespace ?? "";
      const stringValueStr = stringValue ?? "";
      const terminatorStr = terminator ?? "";
      return `${delimiterStr}${whitespaceStr}"${stringValueStr}"${terminatorStr}`;
    },
    diagnosticMessage: (_match, groups) => {
      const prefix = groups[2] ?? "";
      const stringValue = groups[3] ?? "";
      return `Removed '${prefix}' prefix before quoted string: "${stringValue.substring(0, 30)}..."`;
    },
  },

  // Rule: Generic removal of list markers/prefixes before property names
  // Consolidates: bulletPointBeforeProperty, asteriskBeforeProperty
  // Catches any non-alphanumeric, non-JSON-structural character acting as a list marker
  // Uses negated character class for future-proofing against new Unicode bullet characters
  // Pattern: `• "publicConstants":` or `* "purpose":` or `→ "item":` -> `"item":`
  {
    name: "genericListMarkerBeforeProperty",
    pattern: /([}\],]|\n|^)(\s*)([^\w\s"'{}[\],:])(?:\s+)("([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:)/g,
    replacement: (_match, groups) => {
      const [delimiter, whitespace, , propertyWithQuote] = groups;
      const delimiterStr = delimiter ?? "";
      const whitespaceStr = whitespace ?? "";
      const propertyWithQuoteStr = propertyWithQuote ?? "";
      return `${delimiterStr}${whitespaceStr}${propertyWithQuoteStr}`;
    },
    diagnosticMessage: (_match, groups) => {
      const marker = groups[2] ?? "";
      return `Removed list marker '${marker}' before property name`;
    },
    contextCheck: isAfterJsonDelimiter,
  },

  // Rule: Remove stray text after closing braces
  // Pattern: `},ce` -> `},`
  {
    name: "strayTextAfterBraceComma",
    pattern: /([}\]])\s*,\s*([a-z]{1,5})(\s*[}\]]|\s*\n\s*[{"])/g,
    replacement: (_match, groups) => {
      const strayText = groups[1] ?? "";
      if (isJsonKeyword(strayText)) {
        return null;
      }
      const delimiter = groups[0] ?? "";
      const nextToken = groups[2] ?? "";
      return `${delimiter},${nextToken}`;
    },
    diagnosticMessage: (_match, groups) => {
      const delimiter = groups[0] ?? "";
      const strayText = groups[1] ?? "";
      return `Removed stray text '${strayText}' after ${delimiter}`;
    },
  },

  // Rule: Remove stray single characters at start of lines in arrays
  // Pattern: `e    "stringValue",` -> `    "stringValue",`
  {
    name: "strayCharAtLineStartInArray",
    pattern: /([}\],]|\n|^)(\s*)([a-z])\s+("([a-zA-Z0-9_.]+)")/g,
    replacement: (_match, groups, context) => {
      const strayChar = groups[2] ?? "";
      if (!/^[a-z]$/.test(strayChar)) {
        return null;
      }
      if (!isInArrayContext(context)) {
        return null;
      }
      const [delimiter, whitespace, , quotedString] = groups;
      const delimiterStr = delimiter ?? "";
      const whitespaceStr = whitespace ?? "";
      const quotedStringStr = quotedString ?? "";
      return `${delimiterStr}${whitespaceStr}${quotedStringStr}`;
    },
    diagnosticMessage: (_match, groups) => {
      const strayChar = groups[2] ?? "";
      const quotedString = groups[3] ?? "";
      return `Removed stray character '${strayChar}' before array element: ${strayChar} ${quotedString}`;
    },
  },

  // Rule: Remove stray text after closing brace at end of JSON
  // Pattern: `}tribal-council-assistant-v1-final-answer` -> `}`
  {
    name: "strayTextAfterClosingBrace",
    pattern: /([}])\s*([a-zA-Z0-9\-_]{5,100})(\s*)$/g,
    replacement: (_match, groups, context) => {
      // Check if this is at the end of the JSON
      const { fullContent, offset } = context;
      const matchLen = _match.length;
      const afterMatch = fullContent.substring(offset + matchLen);
      if (afterMatch.trim().length !== 0) {
        return null;
      }
      const brace = groups[0] ?? "";
      return brace;
    },
    diagnosticMessage: (_match, groups) => {
      const strayText = groups[1] ?? "";
      return `Removed stray text after closing brace: ${strayText}`;
    },
  },

  // Rule: Remove placeholder text like _INSERT_DATABASE_INTEGRATION_
  // Pattern: `_INSERT_DATABASE_INTEGRATION_` -> remove
  {
    name: "removePlaceholderText",
    pattern: /([}\],]|\n|^)(\s*)_[A-Z_]+_(\s*)([}\],]|\n|$)/g,
    replacement: (_match, groups) => {
      const [before, , , after] = groups;
      const beforeStr = before ?? "";
      const afterStr = after ?? "";
      if (beforeStr.includes(",")) {
        return `${beforeStr}\n${afterStr}`;
      }
      return `${beforeStr}${afterStr}`;
    },
    diagnosticMessage: "Removed placeholder text",
  },

  // Rule: Remove Python-style triple quotes
  // Pattern: `extra_text="""` or `"""` -> remove
  {
    name: "pythonTripleQuotes",
    pattern: /([}\],]|\n|^)(\s*)(extra_[a-zA-Z_$]+\s*=\s*)?"(""|""")/g,
    replacement: (_match, groups) => {
      const [delimiter, whitespace] = groups;
      const delimiterStr = delimiter ?? "";
      const whitespaceStr = whitespace ?? "";
      return `${delimiterStr}${whitespaceStr}`;
    },
    diagnosticMessage: "Removed Python-style triple quotes",
  },

  // Rule: Remove Python-style triple quotes at end of JSON
  {
    name: "pythonTripleQuotesAtEnd",
    pattern: /"(""|""")\s*$/g,
    replacement: () => "",
    diagnosticMessage: "Removed Python-style triple quotes at end",
  },

  // Rule: Remove corrupted uppercase identifier references from arrays
  // Pattern: `_MODULE", _CODE", _CONSTANT_NAME"` -> remove
  {
    name: "corruptedUppercaseIdentifier",
    pattern: /([}\],])\s*\n\s*_[A-Z0-9_]+"\s*,?\s*\n/g,
    replacement: (_match, groups) => {
      const delimiter = groups[0] ?? "";
      return `${delimiter}\n`;
    },
    diagnosticMessage: "Removed corrupted uppercase identifier reference from array",
  },

  // Rule: Remove single character before opening brace
  // Pattern: `c{` -> `{`
  {
    name: "extraCharBeforeBrace",
    pattern: /([}\],]|\n|^)(\s*)([a-z])\s*{/g,
    replacement: (_match, groups) => {
      const [delimiter, whitespace] = groups;
      const delimiterStr = delimiter ?? "";
      const whitespaceStr = whitespace ?? "";
      return `${delimiterStr}${whitespaceStr}{`;
    },
    diagnosticMessage: (_match, groups) => {
      const extraChar = groups[2] ?? "";
      return `Removed extra character '${extraChar}' before opening brace`;
    },
    contextCheck: isAfterJsonDelimiter,
  },
];
