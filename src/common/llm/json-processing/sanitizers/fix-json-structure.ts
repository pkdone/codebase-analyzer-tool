import { Sanitizer, SanitizerResult } from "./sanitizers-types";
import { REPAIR_STEP } from "../constants/repair-steps.config";
import { isInStringAt, isInArrayContext } from "../utils/parser-context-utils";

/**
 * Post-processing sanitizer that fixes advanced JSON structure issues.
 *
 * This sanitizer handles complex post-processing fixes that are applied after
 * the basic structural fixes (commas, delimiters, truncation) have been handled.
 *
 * This sanitizer combines the functionality of:
 * 1. fixDanglingProperties: Fixes property names without values (inserts `: null`)
 * 2. fixMissingOpeningQuoteInArrayStrings: Fixes missing opening quotes in array string values
 * 3. fixStrayCharsAfterPropertyValues: Removes stray characters after property values
 * 4. fixCorruptedPropertyValuePairs: Fixes corrupted property/value pairs (e.g., `"name":ICCID":`)
 * 5. fixTruncatedValueInArrayElements: Fixes truncated values in array elements
 *
 * ## Purpose
 * LLMs sometimes generate JSON with advanced structural issues that require
 * context-aware post-processing:
 * - Dangling properties without values
 * - Missing quotes in array strings
 * - Stray characters after property values
 * - Corrupted property/value pairs
 * - Truncated values in array elements
 *
 * ## Implementation
 * Uses regex-based post-processing passes that analyze the structure context
 * to apply fixes safely.
 *
 * @param input - The raw string content to sanitize
 * @returns Sanitizer result with post-processing fixes applied
 */
export const fixJsonStructure: Sanitizer = (input: string): SanitizerResult => {
  const trimmed = input.trim();
  if (!trimmed) {
    return { content: input, changed: false };
  }

  let hasChanges = false;
  const repairs: string[] = [];
  let finalContent = trimmed;

  // Post-processing pass 1: Fix dangling properties
  // Pattern: "propertyName " (with space inside quotes) followed by comma, closing brace, or newline
  // Must ensure we're not inside a string and that there's no colon after the quote
  const beforeDanglingProperties = finalContent;
  // Match: "propertyName " where space is inside the quotes, followed by delimiter
  const danglingPropertyPattern = /"([a-zA-Z_$][a-zA-Z0-9_$]*)\s+"(?=[,}\n])/g;
  finalContent = finalContent.replace(danglingPropertyPattern, (match, propertyName, offset) => {
    const offsetNum = typeof offset === "number" ? offset : 0;
    if (isInStringAt(offsetNum, finalContent)) {
      return match;
    }

    // Check what comes after the match - must not be a colon
    const afterMatch = finalContent.substring(
      offsetNum + match.length,
      Math.min(offsetNum + match.length + 10, finalContent.length),
    );

    // Skip if there's a colon (this is a valid property with a value)
    if (afterMatch.trim().startsWith(":")) {
      return match;
    }

    // Also check if there's a quoted value or colon after (which would indicate a valid property)
    // Pattern: whitespace then quote or colon indicates a value
    if (/^\s*[":]/.test(afterMatch)) {
      return match;
    }

    const delimiterMatch = /^\s*([,}\n])/.exec(afterMatch);
    const delimiter = delimiterMatch ? delimiterMatch[1] : "";

    // Check if there's a colon before the delimiter (e.g., "prop": "value",)
    // This means it's a valid property, not dangling
    if (delimiter) {
      const beforeDelimiter = afterMatch.substring(0, afterMatch.indexOf(delimiter));
      if (beforeDelimiter.includes(":")) {
        return match;
      }
    }

    hasChanges = true;
    repairs.push(
      `Fixed dangling property: "${propertyName} " -> "${propertyName}": null${delimiter === "\n" ? "," : delimiter === "," ? "," : ""}`,
    );

    if (delimiter === "\n") {
      return `"${propertyName}": null,`;
    }
    if (delimiter === ",") {
      return `"${propertyName}": null,`;
    }
    // delimiter is "}" - don't include it, it's already in the string (from lookahead)
    return `"${propertyName}": null`;
  });
  if (finalContent !== beforeDanglingProperties) {
    hasChanges = true;
    repairs.push(REPAIR_STEP.FIXED_DANGLING_PROPERTIES);
  }

  // Post-processing pass 2: Fix missing opening quotes in array strings
  const beforeMissingQuotes = finalContent;
  const missingOpeningQuotePattern1 = /((?:,|\[))\s*\n?(\s*)([a-zA-Z_$][a-zA-Z0-9_$.]+)"\s*,/g;
  let previousContent = "";
  while (previousContent !== finalContent) {
    previousContent = finalContent;
    finalContent = finalContent.replace(
      missingOpeningQuotePattern1,
      (match, delimiter, whitespace, unquotedValue, offset) => {
        const offsetNum = typeof offset === "number" ? offset : 0;
        if (!isInArrayContext(offsetNum, finalContent)) {
          return match;
        }

        const delimiterStr = typeof delimiter === "string" ? delimiter : "";
        const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
        const unquotedValueStr = typeof unquotedValue === "string" ? unquotedValue : "";

        const jsonKeywords = ["true", "false", "null", "undefined"];
        if (jsonKeywords.includes(unquotedValueStr.toLowerCase())) {
          return match;
        }

        hasChanges = true;
        repairs.push(
          `Fixed missing opening quote in array string: ${unquotedValueStr}" -> "${unquotedValueStr}"`,
        );
        return `${delimiterStr}${whitespaceStr}\n${whitespaceStr}"${unquotedValueStr}",`;
      },
    );
  }
  if (finalContent !== beforeMissingQuotes) {
    repairs.push(REPAIR_STEP.FIXED_MISSING_OPENING_QUOTES_IN_ARRAY_STRINGS);
  }

  // Post-processing pass 3: Fix stray characters after property values
  const beforeStrayChars = finalContent;
  const strayCharsAfterValuePattern =
    /("(?:[^"\\]|\\.)*")(?:\s+)?([a-zA-Z_$0-9]+)(?=\s*[,}\]]|\s*\n)/g;
  finalContent = finalContent.replace(
    strayCharsAfterValuePattern,
    (match, quotedValue, strayChars, offset) => {
      const offsetNum = typeof offset === "number" ? offset : 0;
      if (isInStringAt(offsetNum, finalContent)) {
        return match;
      }

      const quotedValueStr = typeof quotedValue === "string" ? quotedValue : "";
      const strayCharsStr = typeof strayChars === "string" ? strayChars : "";
      const matchStr = typeof match === "string" ? match : "";

      const afterMatchStart = offsetNum + matchStr.length;
      const afterMatch = finalContent.substring(afterMatchStart, afterMatchStart + 20);
      const isValidAfterContext = /^\s*[,}\]]|^\s*\n/.test(afterMatch);

      if (isValidAfterContext && strayCharsStr.length > 0) {
        hasChanges = true;
        repairs.push(`Removed stray characters "${strayCharsStr}" after value ${quotedValueStr}`);
        // Return just the quoted value (the stray chars and optional whitespace are removed)
        // The content before the match is preserved automatically by replace()
        return quotedValueStr;
      }

      return match;
    },
  );
  if (finalContent !== beforeStrayChars) {
    hasChanges = true;
    repairs.push(REPAIR_STEP.FIXED_STRAY_CHARS_AFTER_PROPERTY_VALUES);
  }

  // Post-processing pass 4: Fix corrupted property/value pairs
  const beforeCorruptedPairs = finalContent;
  const corruptedPattern1 =
    /"([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:\s*([A-Z][a-zA-Z0-9_]*)"\s*:\s*"([^"]+)"/g;
  finalContent = finalContent.replace(
    corruptedPattern1,
    (match, propertyName, corruptedValue, nextPropertyValue, offset) => {
      const offsetNum = typeof offset === "number" ? offset : 0;
      if (isInStringAt(offsetNum, finalContent)) {
        return match;
      }

      const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
      const corruptedValueStr = typeof corruptedValue === "string" ? corruptedValue : "";
      const nextPropertyValueStr = typeof nextPropertyValue === "string" ? nextPropertyValue : "";

      if (corruptedValueStr.length > 0 && /^[A-Z]/.test(corruptedValueStr)) {
        hasChanges = true;
        repairs.push(
          `Fixed corrupted property/value pair: "${propertyNameStr}":${corruptedValueStr}" -> "${propertyNameStr}": "${corruptedValueStr}", "${nextPropertyValueStr}"`,
        );
        return `"${propertyNameStr}": "${corruptedValueStr}", "${corruptedValueStr}": "${nextPropertyValueStr}"`;
      }

      return match;
    },
  );

  // Pattern 2: More specific pattern with type property
  const corruptedPattern2 =
    /\{\s*"([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:\s*([A-Z][a-zA-Z0-9_]*)"\s*:\s*"([^"]+)"\s*,\s*"type"\s*:\s*"([^"]+)"/g;
  finalContent = finalContent.replace(
    corruptedPattern2,
    (match, propertyName, corruptedValue, _nextPropertyValue, typeValue, offset) => {
      const offsetNum = typeof offset === "number" ? offset : 0;
      if (isInStringAt(offsetNum, finalContent)) {
        return match;
      }

      const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
      const corruptedValueStr = typeof corruptedValue === "string" ? corruptedValue : "";
      const typeValueStr = typeof typeValue === "string" ? typeValue : "";

      if (
        corruptedValueStr.length > 0 &&
        corruptedValueStr === corruptedValueStr.toUpperCase() &&
        corruptedValueStr.length <= 20
      ) {
        hasChanges = true;
        repairs.push(
          `Fixed corrupted property/value pair (pattern 2): "${propertyNameStr}":${corruptedValueStr}" -> "${propertyNameStr}": "${corruptedValueStr}", "type": "${typeValueStr}"`,
        );
        return `{ "${propertyNameStr}": "${corruptedValueStr}", "type": "${typeValueStr}"`;
      }

      return match;
    },
  );
  if (finalContent !== beforeCorruptedPairs) {
    hasChanges = true;
    repairs.push(REPAIR_STEP.FIXED_CORRUPTED_PROPERTY_VALUE_PAIRS);
  }

  // Post-processing pass 5: Fix truncated values in array elements
  // This is complex and involves reconstruction logic, so we'll handle it with a simpler pattern
  const beforeTruncatedValues = finalContent;
  // Pattern matches: "type": "value"\nwhitespace + lowercaseWord",\nwhitespace + "nextProperty":
  const truncatedValuePattern1 =
    /("type"\s*:\s*"[^"]*")\s*\n(\s*)([a-z][a-zA-Z0-9_]*)"\s*,\s*\n(\s*)"([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:/g;
  previousContent = "";
  while (previousContent !== finalContent) {
    previousContent = finalContent;
    finalContent = finalContent.replace(
      truncatedValuePattern1,
      (match, typeProperty, whitespace1, truncatedValue, whitespace2, nextProperty, offset) => {
        const offsetNum = typeof offset === "number" ? offset : 0;
        if (!isInArrayContext(offsetNum, finalContent)) {
          return match;
        }

        const typePropertyStr = typeof typeProperty === "string" ? typeProperty : "";
        const whitespace1Str = typeof whitespace1 === "string" ? whitespace1 : "";
        const truncatedValueStr = typeof truncatedValue === "string" ? truncatedValue : "";
        const whitespace2Str = typeof whitespace2 === "string" ? whitespace2 : "";
        const nextPropertyStr = typeof nextProperty === "string" ? nextProperty : "";

        // Schema-agnostic fix: simply close the truncated value with a quote and comma
        // This maintains valid JSON structure without making schema-specific assumptions
        hasChanges = true;
        repairs.push(
          `Fixed truncated value in array element: closed truncated value "${truncatedValueStr}"`,
        );

        // Close the truncated value properly and continue with the next property
        return `${typePropertyStr}\n${whitespace1Str}  },\n${whitespace1Str}  {\n${whitespace1Str}    "value": "${truncatedValueStr}",\n${whitespace2Str}"${nextPropertyStr}"`;
      },
    );
  }
  if (finalContent !== beforeTruncatedValues) {
    hasChanges = true;
    repairs.push(REPAIR_STEP.FIXED_TRUNCATED_PROPERTY_VALUES_IN_ARRAYS);
  }

  if (!hasChanges) {
    return { content: input, changed: false };
  }

  return {
    content: finalContent,
    changed: true,
    description: "Fixed JSON structure (post-processing)",
    repairs: repairs.length > 0 ? repairs : undefined,
  };
};
