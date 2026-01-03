/**
 * Replacement rules for handling structural JSON issues.
 * This module handles:
 * - Duplicate/extra closing braces/brackets
 * - Unclosed arrays and objects
 * - Malformed objects
 * - Truncated responses
 * - Trailing commas
 */

import type { ReplacementRule, ContextInfo } from "./replacement-rule.types";
import { isAfterJsonDelimiter, isInArrayContext } from "./rule-executor";
import { parsingHeuristics } from "../../constants/json-processing.config";

/**
 * Checks if a context is valid for structural fixes.
 */
function isValidStructuralContext(context: ContextInfo): boolean {
  const { beforeMatch } = context;
  return (
    /[}\],]\s*$/.test(beforeMatch) ||
    /^\s*$/.test(beforeMatch) ||
    context.offset < parsingHeuristics.START_OF_FILE_OFFSET_LIMIT
  );
}

/**
 * Rules for fixing structural issues in JSON content.
 */
export const STRUCTURAL_RULES: readonly ReplacementRule[] = [
  // Rule: Remove duplicate closing braces at end
  // Pattern: Multiple `}` at the end of the file
  {
    name: "duplicateClosingBraces",
    pattern: /(})\s*\n\s*(}\s*\n\s*){2,}\s*$/g,
    replacement: () => "}\n",
    diagnosticMessage: "Removed duplicate closing braces at end",
  },

  // Rule: Remove extra closing brackets
  // Pattern: `]\n]\n]\n}` -> `}`
  {
    name: "extraClosingBrackets",
    pattern: /([}\]])\s*\n\s*(\]\s*\n\s*){2,}([}\]]|$)/g,
    replacement: (_match, groups, context) => {
      // Only remove if NOT in an array
      if (isInArrayContext(context)) {
        return null;
      }
      const before = groups[0] ?? "";
      const after = groups[2] ?? "";
      return `${before}\n${after}`;
    },
    diagnosticMessage: "Removed extra closing brackets",
  },

  // Rule: Fix malformed objects with unquoted properties
  // Pattern: `{hoge}` -> `{}`
  {
    name: "malformedObjectUnquotedProp",
    pattern: /([}\],]|\n|^)(\s*){([a-zA-Z_$][a-zA-Z0-9_$]*)}\s*([,}\]]|$)/g,
    replacement: (_match, groups) => {
      const [delimiter, whitespace, , terminator] = groups;
      const delimiterStr = delimiter ?? "";
      const whitespaceStr = whitespace ?? "";
      const terminatorStr = terminator ?? "";
      return `${delimiterStr}${whitespaceStr}{}${terminatorStr}`;
    },
    diagnosticMessage: (_match, groups) => {
      const invalidProp = groups[2] ?? "";
      return `Removed malformed object: {${invalidProp}}`;
    },
    contextCheck: isAfterJsonDelimiter,
  },

  // Rule: Fix truncated responses ending with ...]
  // Pattern: `...]` at end -> remove
  {
    name: "truncatedEndingWithBracket",
    pattern: /\.\.\.\s*\]\s*$/g,
    replacement: (_match, _groups, context) => {
      const { fullContent } = context;
      // Find the last proper closing bracket/brace
      const beforeTruncation = fullContent.substring(0, fullContent.length - 4);
      const lastBracket = beforeTruncation.lastIndexOf("]");
      const lastBrace = beforeTruncation.lastIndexOf("}");
      const lastOpenBracket = beforeTruncation.lastIndexOf("[");
      const lastOpenBrace = beforeTruncation.lastIndexOf("{");

      if (lastOpenBracket > lastBracket) {
        return "]";
      } else if (lastOpenBrace > lastBrace) {
        return "}";
      }
      return "";
    },
    diagnosticMessage: "Removed truncated ending ...]",
  },

  // Rule: Fix stray dashes after delimiters
  // Pattern: `],-` -> `],` or `,-` -> `,`
  {
    name: "strayDashAfterDelimiter",
    pattern: /([}\],])\s*-\s*([,}\]]|\n|$)/g,
    replacement: (_match, groups) => {
      const [delimiter, after] = groups;
      const delimiterStr = delimiter ?? "";
      const afterStr = after ?? "";
      return `${delimiterStr}${afterStr}`;
    },
    diagnosticMessage: "Removed stray dash after delimiter",
    contextCheck: isValidStructuralContext,
  },

  // Rule: Fix stray single characters on their own lines
  // Pattern: `    g\n    {` -> `    {`
  {
    name: "strayCharOnOwnLine",
    pattern: /([}\],]|\n|^)(\s+)([a-z])\s*\n\s*([{"])/g,
    replacement: (_match, groups, context) => {
      const { beforeMatch } = context;
      const isValidContext =
        /[}\],]\s*$/.test(beforeMatch) ||
        /^\s*$/.test(beforeMatch) ||
        /,\s*\n\s*$/.test(beforeMatch);
      if (!isValidContext) {
        return null;
      }
      const [delimiter, whitespace, , nextToken] = groups;
      const delimiterStr = delimiter ?? "";
      const whitespaceStr = whitespace ?? "";
      const nextTokenStr = nextToken ?? "";
      return `${delimiterStr}${whitespaceStr}${nextTokenStr}`;
    },
    diagnosticMessage: (_match, groups) => {
      const strayChar = groups[2] ?? "";
      return `Removed stray character '${strayChar}' on its own line`;
    },
  },

  // Rule: Fix stray characters before closing braces
  // Pattern: `s    },` -> `    },`
  {
    name: "strayCharBeforeClosingBrace",
    pattern: /([}\],]|\n|^)(\s+)([a-z])\s+([}])/g,
    replacement: (_match, groups, context) => {
      const { beforeMatch } = context;
      const isValidContext =
        /"\s*$/.test(beforeMatch) ||
        /,\s*$/.test(beforeMatch) ||
        /]\s*$/.test(beforeMatch) ||
        /}\s*$/.test(beforeMatch) ||
        /:\s*[^"]+$/.test(beforeMatch);
      if (!isValidContext) {
        return null;
      }
      const [delimiter, whitespace, , closingBrace] = groups;
      const delimiterStr = delimiter ?? "";
      const whitespaceStr = whitespace ?? "";
      const closingBraceStr = closingBrace ?? "";
      return `${delimiterStr}${whitespaceStr}${closingBraceStr}`;
    },
    diagnosticMessage: (_match, groups) => {
      const strayChar = groups[2] ?? "";
      return `Removed stray character '${strayChar}' before closing brace`;
    },
  },

  // Rule: Fix malformed property start
  // Pattern: `{- "name":` -> `{ "name":`
  {
    name: "malformedPropertyStart",
    pattern: /\{-\s*"([^"]+)"\s*:/g,
    replacement: (_match, groups) => {
      const propertyName = groups[0] ?? "";
      return `{ "${propertyName}":`;
    },
    diagnosticMessage: (_match, groups) => {
      const propertyName = groups[0] ?? "";
      return `Fixed malformed property start: {- "${propertyName}" -> { "${propertyName}"`;
    },
  },

  // Rule: Fix string arrays instead of actual arrays
  // Pattern: `"parameters": "[]"` -> `"parameters": []`
  {
    name: "stringArrayToActual",
    pattern: /"([^"]+)"\s*:\s*"(\[\])"/g,
    replacement: (_match, groups) => {
      const propertyName = groups[0] ?? "";
      return `"${propertyName}": []`;
    },
    diagnosticMessage: (_match, groups) => {
      const propertyName = groups[0] ?? "";
      return `Fixed string array to actual array: "${propertyName}": "[]" -> "${propertyName}": []`;
    },
  },

  // Rule: Fix explanatory text breaking JSON structure
  // Pattern: `},\nthere are more methods...` -> `},`
  {
    name: "explanatoryTextBreakingJson",
    pattern:
      /([}\]])\s*,\s*\n\s*(there are|but the response|getting too long|I will stop|I'll stop|for brevity)[^}]*\n\s*([{"])/gi,
    replacement: (_match, groups) => {
      const [delimiter, , nextToken] = groups;
      const delimiterStr = delimiter ?? "";
      const nextTokenStr = nextToken ?? "";
      return `${delimiterStr},\n    ${nextTokenStr}`;
    },
    diagnosticMessage: "Removed explanatory text breaking JSON structure",
  },

  // Rule: Remove truncated/explanatory text after final closing brace
  // Pattern: `}\nthere are more methods, but the response is too long.` -> `}`
  {
    name: "truncatedTextAfterFinalBrace",
    pattern:
      /(})\s*\n\s*([a-z\s]{10,200}?)(?:\.\.\.|I will|stop here|for brevity|so many|methods|I'll|truncated|there are|but the response)[^}]*$/i,
    replacement: (_match, groups, context) => {
      // Check if this is at the end of the JSON
      const { fullContent, offset } = context;
      const afterMatch = fullContent.substring(offset + _match.length);
      if (afterMatch.trim().length !== 0) {
        return null;
      }

      const strayText = groups[1] ?? "";
      const isTruncatedText =
        /(so many|I will|stop here|for brevity|methods|I'll|truncated|there are|but the response|\.\.\.)/i.test(
          strayText,
        ) &&
        !strayText.includes('"') &&
        !strayText.includes("{") &&
        !strayText.includes("}") &&
        !strayText.includes("[") &&
        !strayText.includes("]");

      if (!isTruncatedText) {
        return null;
      }

      const closingBrace = groups[0] ?? "}";
      return closingBrace;
    },
    diagnosticMessage: (_match, groups) => {
      const strayText = (groups[1] ?? "").substring(0, 50);
      return `Removed truncated/explanatory text after final closing brace: "${strayText}..."`;
    },
  },

  // Rule: Fix stray underscore after property value
  // Pattern: `"value",_ "type":` -> `"value", "type":`
  {
    name: "strayUnderscoreAfterPropertyValue",
    pattern: /"([^"]+)"\s*,\s*_(\s*"[a-zA-Z_$][a-zA-Z0-9_$]*"\s*:)/g,
    replacement: (_match, groups, context) => {
      const { beforeMatch } = context;
      const isInArrayOrObject =
        /\[\s*$/.test(beforeMatch) ||
        /,\s*\n\s*$/.test(beforeMatch) ||
        /"\s*,\s*\n\s*$/.test(beforeMatch) ||
        /{\s*$/.test(beforeMatch);
      if (!isInArrayOrObject) {
        return null;
      }
      const [value, nextProperty] = groups;
      const valueStr = value ?? "";
      const nextPropertyStr = nextProperty ?? "";
      return `"${valueStr}",${nextPropertyStr}`;
    },
    diagnosticMessage: (_match, groups) => {
      const value = groups[0] ?? "";
      return `Removed stray underscore after property value: "${value}",_`;
    },
  },

  // Rule: Fix stray text like .json after opening brace
  // Pattern: `{.json` -> `{`
  {
    name: "strayTextAfterOpeningBrace",
    pattern: /(\{\s*)\.([a-z]+)(\s*")/g,
    replacement: (_match, groups) => {
      const [brace, , property] = groups;
      const braceStr = brace ?? "";
      const propertyStr = property ?? "";
      return `${braceStr}${propertyStr}`;
    },
    diagnosticMessage: "Removed stray text after opening brace",
  },

  // Rule: Fix truncated text markers
  // Pattern: `property: value,_OF_CODE` -> `property: value,`
  {
    name: "truncatedTextMarker",
    pattern: /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:\s*([^,}]+),(_[A-Z_]+)/g,
    replacement: (_match, groups) => {
      const [propertyName, value] = groups;
      const propertyNameStr = propertyName ?? "";
      const valueStr = value ?? "";
      return `${propertyNameStr}: ${valueStr},`;
    },
    diagnosticMessage: (_match, groups) => {
      const propertyName = groups[0] ?? "";
      const truncationMarker = groups[2] ?? "";
      return `Removed truncation marker: ${propertyName}: ...,${truncationMarker}`;
    },
  },

  // Rule: Fix stray comma after closing bracket before property
  // Pattern: `],,"propertyName":` -> `],"propertyName":`
  {
    name: "doubleCommaAfterBracket",
    pattern: /(\])\s*,\s*,(\s*"[a-zA-Z_$][a-zA-Z0-9_$]*"\s*:)/g,
    replacement: (_match, groups) => {
      const [bracket, property] = groups;
      const bracketStr = bracket ?? "";
      const propertyStr = property ?? "";
      return `${bracketStr},${propertyStr}`;
    },
    diagnosticMessage: "Fixed double comma after closing bracket",
  },

  // Rule: Fix missing comma between array and next property
  // Pattern: `]"propertyName":` -> `],"propertyName":`
  {
    name: "missingCommaAfterArray",
    pattern: /(\])\s*("[a-zA-Z_$][a-zA-Z0-9_$]*"\s*:)/g,
    replacement: (_match, groups, context) => {
      // Don't add comma if we're inside a string or this is invalid context
      const { beforeMatch } = context;
      const isValidContext =
        /\[\s*[^\]]*$/.test(beforeMatch) ||
        /:\s*\[\s*[^\]]*$/.test(beforeMatch) ||
        /,\s*$/.test(beforeMatch);
      if (!isValidContext && context.offset > parsingHeuristics.START_OF_FILE_OFFSET_LIMIT) {
        return null;
      }
      const [bracket, property] = groups;
      const bracketStr = bracket ?? "";
      const propertyStr = property ?? "";
      return `${bracketStr},${propertyStr}`;
    },
    diagnosticMessage: "Added missing comma after array closing bracket",
  },

  // Rule: Add missing comma after array before extra_text (Pattern 50)
  // Pattern: `]\n    extra_text:` -> `],\n    extra_text:`
  {
    name: "missingCommaAfterArrayBeforeExtraText",
    pattern: /(\])\s*\n(\s*)(extra_[a-zA-Z_$]+)\s*:/g,
    replacement: (_match, groups) => {
      const [bracket, whitespace, extraText] = groups;
      const bracketStr = bracket ?? "";
      const whitespaceStr = whitespace ?? "";
      const extraTextStr = extraText ?? "";
      // Add comma - the extra_text will be removed by another rule
      return `${bracketStr},\n${whitespaceStr}${extraTextStr}:`;
    },
    diagnosticMessage: "Added missing comma after array before extra_text",
  },

  // Rule: Remove trailing comma after array when followed by closing brace
  // Pattern: `],\n    \n}` -> `]\n    \n}`
  {
    name: "removeTrailingCommaAfterArrayBeforeBrace",
    pattern: /(\])\s*,\s*\n(\s*)\n(\s*)(\})/g,
    replacement: (_match, groups) => {
      const [bracket, , , closingBrace] = groups;
      const bracketStr = bracket ?? "";
      const closingBraceStr = closingBrace ?? "";
      return `${bracketStr}\n${closingBraceStr}`;
    },
    diagnosticMessage: "Removed trailing comma after array before closing brace",
  },

  // Rule: Fix unclosed array before property name (Pattern 52)
  // Pattern: `}, "propertyName":` after array opening -> `}], "propertyName":`
  {
    name: "unclosedArrayBeforeProperty",
    pattern: /(\})\s*,\s*\n\s*("[a-zA-Z_$][a-zA-Z0-9_$]*"\s*:)/g,
    replacement: (_match, groups, context) => {
      const { beforeMatch } = context;

      // Check if we're in an array context by scanning backwards
      let bracketDepth = 0;
      let inString = false;
      let escape = false;
      let foundUnclosedArray = false;

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
            bracketDepth--;
            if (bracketDepth < 0) {
              // Found an unclosed array
              foundUnclosedArray = true;
              break;
            }
          }
        }
      }

      if (!foundUnclosedArray) {
        return null;
      }

      const [closingBrace, property] = groups;
      const closingBraceStr = closingBrace ?? "";
      const propertyStr = property ?? "";
      return `${closingBraceStr}],\n    ${propertyStr}`;
    },
    diagnosticMessage: "Fixed unclosed array before property name",
  },

  // Rule: Remove trailing comma before closing bracket/brace
  // Pattern: `"value", ]` -> `"value" ]`
  {
    name: "trailingCommaBeforeClosing",
    pattern: /"([^"]+)",(\s*[}\]])/g,
    replacement: (_match, groups, context) => {
      const { fullContent, offset } = context;
      const matchLen = typeof _match === "string" ? _match.length : 0;
      const after = fullContent.substring(offset + matchLen).trim();

      // Only remove if this is the last element before closing
      if (after.length > 0 && !/^[}\]]/.test(after)) {
        return null;
      }

      const [value, ws] = groups;
      const valueStr = value ?? "";
      const wsStr = ws ?? "";
      return `"${valueStr}"${wsStr}`;
    },
    diagnosticMessage: "Removed trailing comma before closing bracket/brace",
  },

  // Rule: Escape unescaped quotes in string values (Pattern 89)
  // Pattern: `"description": "This uses "quotes" in text"` -> `"description": "This uses \"quotes\" in text"`
  {
    name: "escapeUnescapedQuotesInString",
    pattern: /("([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:\s*")([^"\\]*)(")([^":]+)(")([^"\\]*)(")(\s*[,}])/g,
    replacement: (_match, groups) => {
      const [propertyPart, , beforeText, , middleText, , afterText, closingQuote, terminator] =
        groups;
      const propertyPartStr = propertyPart ?? "";
      const beforeTextStr = beforeText ?? "";
      const middleTextStr = middleText ?? "";
      const afterTextStr = afterText ?? "";
      const closingQuoteStr = closingQuote ?? "";
      const terminatorStr = terminator ?? "";

      // Only process if we have quotes in the middle (unescaped quotes)
      if (!middleTextStr || middleTextStr.length === 0) {
        return null;
      }

      // Skip if the middle text looks like a property name (contains ":)
      if (middleTextStr.includes(":")) {
        return null;
      }

      // Escape the unescaped quotes
      return `${propertyPartStr}${beforeTextStr}\\"${middleTextStr}\\"${afterTextStr}${closingQuoteStr}${terminatorStr}`;
    },
    diagnosticMessage: "Escaped unescaped quotes in string value",
    skipInString: false, // This rule specifically targets content within strings
  },
];
