/**
 * Replacement rules for handling array element issues in JSON.
 * This module handles:
 * - Missing quotes on array elements
 * - Missing commas between elements
 * - Stray text in arrays
 * - Minus signs and markdown markers
 */

import type { ReplacementRule } from "../replacement-rule.types";
import { isInArrayContextSimple, isDeepArrayContext } from "../../../utils/parser-context-utils";
import { safeGroup, safeGroups3, safeGroups4 } from "../../../utils/safe-group-extractor";

/**
 * Rules for fixing array element issues in JSON content.
 */
export const ARRAY_ELEMENT_RULES: readonly ReplacementRule[] = [
  // Rule: Fix missing opening quotes in array elements
  // Pattern: `unquoted.package.ClassB",` -> `"unquoted.package.ClassB",`
  {
    name: "missingOpeningQuoteInArrayElement",
    pattern: /([}\],]|\n|^)(\s*)([a-zA-Z][a-zA-Z0-9_.]+)"\s*,/g,
    replacement: (_match, groups, context) => {
      if (!isDeepArrayContext(context)) {
        return null;
      }
      const [delimiter, whitespace, stringValue] = safeGroups3(groups);
      return `${delimiter}${whitespace}"${stringValue}",`;
    },
    diagnosticMessage: (_match, groups) => {
      return `Fixed missing opening quote in array: ${safeGroup(groups, 2)}" -> "${safeGroup(groups, 2)}"`;
    },
  },

  // Rule: Fix missing opening quotes with capital letter
  // Pattern: `UnquotedStringValue",` -> `"UnquotedStringValue",`
  {
    name: "missingOpeningQuoteCapitalLetter",
    pattern: /([}\],]|\n|^)(\s*)([A-Z][a-zA-Z0-9_./]+)"\s*,/g,
    replacement: (_match, groups, context) => {
      if (!isDeepArrayContext(context)) {
        return null;
      }
      const [delimiter, whitespace, stringValue] = safeGroups3(groups);
      return `${delimiter}${whitespace}"${stringValue}",`;
    },
    diagnosticMessage: (_match, groups) => {
      return `Fixed missing opening quote before array element: ${safeGroup(groups, 2)}" -> "${safeGroup(groups, 2)}"`;
    },
  },

  // Rule: Remove minus signs before array elements
  // Pattern: `-"stringValue",` -> `"stringValue",`
  {
    name: "minusSignBeforeArrayElement",
    pattern: /([}\],]|\n|^)(\s*)-\s*("([^"]+)"\s*,)/g,
    replacement: (_match, groups, context) => {
      if (!isDeepArrayContext(context)) {
        return null;
      }
      const [delimiter, whitespace, quotedElement] = safeGroups3(groups);
      return `${delimiter}${whitespace}${quotedElement}`;
    },
    diagnosticMessage: "Removed minus sign before array element",
  },

  // Rule: Remove markdown asterisk list markers in arrays
  // Pattern: `*   "lombok.NoArgsConstructor",` -> `"lombok.NoArgsConstructor",`
  {
    name: "markdownAsteriskInArray",
    pattern: /([,[]\s*\n?\s*)\*\s*("([^"]+)"\s*,?)/g,
    replacement: (_match, groups, context) => {
      if (!isDeepArrayContext(context)) {
        return null;
      }
      const prefix = safeGroup(groups, 0);
      const quotedElement = safeGroup(groups, 1);
      return `${prefix}${quotedElement}`;
    },
    diagnosticMessage: "Removed markdown list marker (*) from array element",
  },

  // Rule: Generic stray content after string values in arrays
  // Consolidates: strayCharAtEndOfString, strayTextAfterArrayElement, strayLibraryNameAfterString
  // Catches any non-JSON content between a closing quote and the next delimiter
  // Pattern: `"value" garbage,` -> `"value",` or `"value>",` -> `"value",`
  {
    name: "genericStrayContentAfterString",
    pattern: /"([^"]+)"([^,}\]\n"]+)(\s*[,}\]])/g,
    replacement: (_match, groups, context) => {
      // Check if in a value context (after colon, comma, or array start)
      const { beforeMatch } = context;
      const isValueContext =
        /:\s*$/.test(beforeMatch) ||
        /,\s*$/.test(beforeMatch) ||
        /\[\s*$/.test(beforeMatch) ||
        /,\s*\n\s*$/.test(beforeMatch);
      if (!isValueContext) {
        return null;
      }

      const [stringValue, strayContent, terminator] = safeGroups3(groups);
      const strayContentStr = strayContent.trim();

      // Skip if the stray content is empty or just whitespace
      if (!strayContentStr) {
        return null;
      }

      // Skip if stray content looks like a valid property start (colon after)
      // This handles cases like `"value" "nextProp":` which aren't stray text
      if (strayContentStr.endsWith(":")) {
        return null;
      }

      // Check if it looks like stray/corrupted content
      const looksLikeStrayContent =
        // Single special characters (>, ], }, etc.)
        /^[>\]}<)>|\\/#@!$%^&*~`+=]+$/.test(strayContentStr) ||
        // Uppercase identifiers (like JACKSON-CORE-2.12.0.JAR)
        /^[A-Z][A-Z0-9_.-]{3,}$/.test(strayContentStr) ||
        // Text with underscores that doesn't look like a valid identifier
        (strayContentStr.includes("_") && !/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(strayContentStr)) ||
        // Short lowercase words that are clearly stray (not valid JSON)
        (/^[a-z]{1,5}$/.test(strayContentStr) &&
          !["true", "false", "null"].includes(strayContentStr)) ||
        // Parenthetical annotations that LLMs add as commentary
        // e.g., " (required)", " (optional)", " (deprecated)", " (TODO)"
        /^\s*\([^)]{1,30}\)$/.test(strayContentStr) ||
        // Arrow annotations used as inline comments
        // e.g., " <-- fix this", " --> important", " <- note"
        /^\s*(?:<--|-->|<-|->)\s*[^,}\]]*$/.test(strayContentStr) ||
        // Dash-prefixed annotations
        // e.g., " - required", " - optional"
        /^\s*-\s+[a-z]{2,15}$/.test(strayContentStr);

      if (!looksLikeStrayContent) {
        return null;
      }

      return `"${stringValue}"${terminator}`;
    },
    diagnosticMessage: (_match, groups) => {
      const stringValue = safeGroup(groups, 0);
      const strayContent = safeGroup(groups, 1).trim();
      return `Removed stray content '${strayContent}' after string: "${stringValue.substring(0, 30)}..."`;
    },
  },

  // Rule: Fix stray JAR/library names after string values
  // Pattern: `"lombok.RequiredArgsConstructor",JACKSON-CORE-2.12.0.JAR"` -> `"lombok.RequiredArgsConstructor",`
  // This handles the specific case where comma + uppercase identifier + closing quote pattern appears
  {
    name: "strayLibraryNameAfterString",
    pattern: /"([^"]+)"\s*,\s*([A-Z][A-Z0-9_.-]{5,50})"\s*([,}\]]|\n|$)/g,
    replacement: (_match, groups, context) => {
      const [stringValue, strayText, terminator] = safeGroups3(groups);
      // Check if it looks like a library/JAR name
      const looksLikeLibraryName =
        /^[A-Z][A-Z0-9_.-]+$/.test(strayText) &&
        (strayText.includes(".") || strayText.includes("-") || strayText.length > 10);
      if (!looksLikeLibraryName) {
        return null;
      }
      // Ensure comma if in array context
      const { beforeMatch } = context;
      const isInArray = /\[\s*$/.test(beforeMatch) || /,\s*\n\s*$/.test(beforeMatch);
      const comma = isInArray ? "," : "";
      return `"${stringValue}"${comma}${terminator}`;
    },
    diagnosticMessage: (_match, groups) => {
      const [stringValue, strayText] = safeGroups3(groups);
      return `Removed stray library/JAR name '${strayText}' after string: "${stringValue.substring(0, 30)}..."`;
    },
  },

  // Rule: Fix missing comma and quote for unquoted strings at end of array lines
  // Pattern: `"stringValue",\nunquotedString"` -> `"stringValue",\n    "unquotedString",`
  {
    name: "missingCommaAndQuoteAtArrayLineEnd",
    pattern: /"([^"]+)"\s*,\s*\n(\s*)([a-zA-Z][a-zA-Z0-9_.]+)"\s*(,|\])/g,
    replacement: (_match, groups, context) => {
      if (!isDeepArrayContext(context)) {
        return null;
      }
      const [prevValue, whitespace, stringValue, terminator] = safeGroups4(groups);
      const whitespaceStr = whitespace || "    ";
      return `"${prevValue}",\n${whitespaceStr}"${stringValue}"${terminator}`;
    },
    diagnosticMessage: (_match, groups) => {
      const stringValue = safeGroup(groups, 2);
      return `Fixed missing comma and quote: ${stringValue}" -> "${stringValue}",`;
    },
  },

  // Rule: Fix missing comma and quote before array items with dots
  // Pattern: `]unquoted.string.value"` -> `], "unquoted.string.value"`
  {
    name: "missingCommaAndQuoteBeforeArrayItem",
    pattern: /([}\],])\s*\n\s*([a-z]+)\.([a-z]+)\.([a-z.]+)"\s*,?\s*\n/g,
    replacement: (_match, groups, context) => {
      if (!isInArrayContextSimple(context)) {
        return null;
      }
      const [delimiter, prefix, middle, suffix] = safeGroups4(groups);
      const fullPath = `${prefix}.${middle}.${suffix}`;
      return `${delimiter},\n    "${fullPath}",\n`;
    },
    diagnosticMessage: (_match, groups) => {
      const [, prefix, middle, suffix] = safeGroups4(groups);
      return `Fixed missing comma and quote before array item: ${prefix}.${middle}.${suffix}`;
    },
  },

  // Rule: Fix missing quotes with stray text before strings in arrays
  // Pattern: `strayPrefix.stringValue",` -> `"stringValue",`
  {
    name: "missingQuoteWithStrayText",
    pattern: /([}\],]|\n|^)(\s*)([a-zA-Z][a-zA-Z0-9_.]*\.)([a-zA-Z][a-zA-Z0-9_.]*)"\s*,/g,
    replacement: (_match, groups, context) => {
      if (!isInArrayContextSimple(context)) {
        return null;
      }
      const [delimiter, whitespace, strayPrefix, stringValue] = safeGroups4(groups);
      // For package names, we want to keep the full path
      const fullValue = strayPrefix + stringValue;
      return `${delimiter}${whitespace}"${fullValue}",`;
    },
    diagnosticMessage: (_match, groups) => {
      const [, , strayPrefix, stringValue] = safeGroups4(groups);
      return `Fixed missing quote: ${strayPrefix}${stringValue}" -> "${strayPrefix}${stringValue}"`;
    },
  },

  // Rule: Remove stray text after closing braces/brackets in arrays
  // Pattern: `}],stray_text"` -> `}],`
  {
    name: "strayTextAfterClosingBracket",
    pattern: /([}\]])\s*]\s*,\s*([a-z_]+)"\s*([,}\]]|\n|$)/g,
    replacement: (_match, groups) => {
      const brace = safeGroup(groups, 0);
      const next = safeGroup(groups, 2);
      return `${brace}],${next}`;
    },
    diagnosticMessage: (_match, groups) => {
      const strayText = safeGroup(groups, 1);
      return `Removed stray text '${strayText}' after array closing bracket`;
    },
  },

  // Rule: Fix non-ASCII characters before array elements
  // Pattern: Bengali text like `করে"java.util.Arrays",` -> `"java.util.Arrays",`
  {
    name: "nonAsciiBeforeArrayElement",
    // Match any non-ASCII character (above \x7F / 127)
    pattern: /([}\],]|\n|^)(\s*)([^\x20-\x7E]+)"([^"]+)"\s*,/g,
    replacement: (_match, groups, context) => {
      if (!isDeepArrayContext(context)) {
        return null;
      }
      const delimiter = safeGroup(groups, 0);
      const whitespace = safeGroup(groups, 1);
      const stringValue = safeGroup(groups, 3);
      return `${delimiter}${whitespace}"${stringValue}",`;
    },
    diagnosticMessage: (_match, groups) => {
      const stringValue = safeGroup(groups, 3);
      return `Removed non-ASCII characters before array element: "${stringValue.substring(0, 30)}..."`;
    },
  },

  // Rule: Fix invalid properties in arrays (like _DOC_GEN_NOTE_LIMITED_REF_LIST_)
  // Pattern: `_DOC_GEN_NOTE_LIMITED_REF_LIST_ = "..."` -> remove
  {
    name: "invalidPropertyInArray",
    pattern: /,\s*\n\s*_[A-Z_]+\s*=\s*"[^"]*"\s*\n/g,
    replacement: () => ",\n",
    diagnosticMessage: "Removed invalid property from array",
  },

  // Rule: Remove stray 'stop' before string values
  // Pattern: `stop"stringValue",` -> `"stringValue",`
  {
    name: "stopBeforeString",
    pattern: /([}\],]|\n|^)(\s*)stop"([^"]+)"\s*,/g,
    replacement: (_match, groups, context) => {
      if (!isInArrayContextSimple(context)) {
        return null;
      }
      const [delimiter, whitespace, stringValue] = safeGroups3(groups);
      return `${delimiter}${whitespace}"${stringValue}",`;
    },
    diagnosticMessage: (_match, groups) => {
      const stringValue = safeGroup(groups, 2);
      return `Removed 'stop' before array element: "${stringValue.substring(0, 30)}..."`;
    },
  },

  // Rule: Remove trailing comma in last array element
  // Pattern: `"value",\n  ]` -> `"value"\n  ]`
  {
    name: "trailingCommaInArray",
    pattern: /"([^"]+)",(\s*\])/g,
    replacement: (_match, groups, context) => {
      // Check if we're in an array context and this is likely the last element
      const { fullContent, offset } = context;
      const matchLen = typeof _match === "string" ? _match.length : 0;
      const after = fullContent.substring(offset + matchLen).trim();
      // Only fix if there's nothing significant before the next closing bracket
      if (!/^\s*[}\]]/.test(after) && after.length > 0) {
        return null;
      }
      const value = safeGroup(groups, 0);
      const ws = safeGroup(groups, 1);
      return `"${value}"${ws}`;
    },
    diagnosticMessage: "Removed trailing comma before array closing bracket",
  },

  // Rule: Fix markdown asterisk in arrays (more lenient)
  // Pattern: `*   "value",` -> `"value",`
  {
    name: "markdownAsteriskInArrayLenient",
    pattern: /(\n\s*)\*\s+("([^"]+)"\s*,?)/g,
    replacement: (_match, groups, context) => {
      if (!isDeepArrayContext(context)) {
        return null;
      }
      const prefix = safeGroup(groups, 0);
      const quotedElement = safeGroup(groups, 1);
      return `${prefix}${quotedElement}`;
    },
    diagnosticMessage: "Removed markdown asterisk before array element",
  },

  // Rule: Fix missing opening quote before property values in arrays
  // Pattern: `propertyName": "value",` -> `"value",`
  {
    name: "missingQuoteBeforePropertyValueInArray",
    pattern: /([}\],]|\n|^)(\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:\s*"([^"]+)"\s*,/g,
    replacement: (_match, groups, context) => {
      // Check if we're in an array - be more lenient
      const { beforeMatch, fullContent, offset } = context;
      // Check if we're in an array by looking at the context
      const isInArray =
        /\[\s*$/.test(beforeMatch) ||
        /,\s*\n\s*$/.test(beforeMatch) ||
        /"\s*,\s*\n\s*$/.test(beforeMatch) ||
        /"\s*,\s*$/.test(beforeMatch);

      // Also check by looking backwards for array opening
      let foundArray = false;
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
          if (fullContent[i] === "]") break;
          if (fullContent[i] === "[") {
            foundArray = true;
            break;
          }
        }
      }

      // If we found an array or the context suggests we're in an array, apply the fix
      if (foundArray || isInArray || isDeepArrayContext(context)) {
        // In array context, this should just be the value, not a property
        const delimiter = safeGroup(groups, 0);
        const whitespace = safeGroup(groups, 1);
        const value = safeGroup(groups, 3);
        return `${delimiter}${whitespace}"${value}",`;
      }

      return null;
    },
    diagnosticMessage: (_match, groups) => {
      const value = safeGroup(groups, 3);
      return `Fixed missing quote: removed property name, kept value "${value}"`;
    },
  },

  // Rule: Remove invalid properties in arrays
  // Pattern: `_DOC_GEN_NOTE_LIMITED_REF_LIST_ = "..."` -> remove
  {
    name: "invalidPropertyInArrayWithEquals",
    pattern: /,\s*\n\s*([_][A-Z_]+)\s*=\s*"[^"]*"\s*,?\s*\n/g,
    replacement: () => ",\n",
    diagnosticMessage: (_match, groups) => {
      const prop = safeGroup(groups, 0);
      return `Removed invalid property in array: ${prop}`;
    },
  },

  // Rule: Remove stray characters before array elements
  // Pattern: `e    "org.apache...` -> `"org.apache...`
  {
    name: "strayCharBeforeArrayElementAfterNewline",
    pattern: /(\n)([a-z])\s+("([^"]+)")/g,
    replacement: (_match, groups, context) => {
      // Check if we're in an array
      const { fullContent, offset } = context;

      // Look backwards for array opening
      let foundArray = false;
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
          if (fullContent[i] === "]") break;
          if (fullContent[i] === "[") {
            foundArray = true;
            break;
          }
        }
      }

      if (foundArray || isDeepArrayContext(context)) {
        const newline = safeGroup(groups, 0);
        const quotedElement = safeGroup(groups, 2);
        return `${newline}    ${quotedElement}`;
      }

      return null;
    },
    diagnosticMessage: (_match, groups) => {
      const strayChar = safeGroup(groups, 1);
      return `Removed stray character '${strayChar}' before array element`;
    },
  },
];
