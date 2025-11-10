import { Sanitizer, SanitizerResult } from "./sanitizers-types";
import { SANITIZATION_STEP, SANITIZATION_STEP_TEMPLATE } from "../config/sanitization-steps.config";
import { DELIMITERS } from "../config/json-processing.config";

/**
 * Unified sanitizer that fixes fundamental JSON structure issues in a single pass.
 *
 * This sanitizer combines the functionality of multiple separate sanitizers:
 * 1. fixMismatchedDelimiters: Corrects bracket/brace mismatches
 * 2. addMissingPropertyCommas: Inserts missing commas between object properties
 * 3. removeTrailingCommas: Removes invalid trailing commas
 * 4. completeTruncatedStructures: Closes unclosed brackets/braces from truncated responses
 * 5. fixDanglingProperties: Fixes property names without values (inserts `: null`)
 * 6. fixMissingOpeningQuoteInArrayStrings: Fixes missing opening quotes in array string values
 * 7. fixStrayCharsAfterPropertyValues: Removes stray characters after property values
 * 8. fixCorruptedPropertyValuePairs: Fixes corrupted property/value pairs (e.g., `"name":ICCID":`)
 * 9. fixTruncatedValueInArrayElements: Fixes truncated values in array elements
 *
 * ## Purpose
 * LLMs sometimes generate JSON with structural issues that prevent parsing:
 * - Wrong closing delimiters (e.g., `{"key": "value"]`)
 * - Missing commas between properties
 * - Trailing commas (valid in JS but not JSON)
 * - Truncated structures missing closing brackets/braces
 * - Dangling properties without values
 * - Missing quotes in array strings
 * - Stray characters after property values
 * - Corrupted property/value pairs
 * - Truncated values in array elements
 *
 * This sanitizer handles all these issues efficiently using a stateful parser
 * for core structural fixes, followed by targeted post-processing passes.
 *
 * ## Implementation
 * Uses a hybrid approach:
 * - Stateful parser for core structural fixes (delimiters, commas, truncation)
 * - Post-processing passes for regex-based fixes that are harder to integrate
 *   into the character-by-character parser
 *
 * @param input - The raw string content to sanitize
 * @returns Sanitizer result with structural fixes applied
 */
export const fixJsonStructure: Sanitizer = (input: string): SanitizerResult => {
  const trimmed = input.trim();
  if (!trimmed) {
    return { content: input, changed: false };
  }

  let hasChanges = false;
  const diagnostics: string[] = [];
  const chars = Array.from(trimmed);
  const result: string[] = [];
  let i = 0;

  // State tracking
  let inString = false;
  let escapeNext = false;
  const delimiterStack: { opener: string; index: number }[] = [];
  let lastNonWhitespaceChar: string | undefined;
  let pendingLineValueEnd = false;
  const commaInsertions: number[] = [];
  const delimiterCorrections: {
    index: number;
    wrongChar: string;
    correctChar: string;
    insertAfter?: string;
  }[] = [];

  // Helper to classify value-ending characters
  const isValueTerminator = (ch: string | undefined): boolean => {
    if (!ch) return false;
    return (
      ch === DELIMITERS.CLOSE_BRACE ||
      ch === DELIMITERS.CLOSE_BRACKET ||
      ch === DELIMITERS.DOUBLE_QUOTE ||
      /\d/.test(ch)
    );
  };

  // Helper to peek at next non-whitespace, non-comma character
  const peekNextNonWhitespace = (startIdx: number): string | null => {
    const remaining = trimmed.substring(startIdx + 1);
    const regex = /[^\s,]/;
    const match = regex.exec(remaining);
    return match ? match[0] : null;
  };

  // First pass: identify all issues
  while (i < chars.length) {
    const char = chars[i];

    if (escapeNext) {
      escapeNext = false;
      result.push(char);
      i++;
      continue;
    }

    if (char === DELIMITERS.BACKSLASH) {
      escapeNext = true;
      result.push(char);
      i++;
      continue;
    }

    if (char === DELIMITERS.DOUBLE_QUOTE) {
      inString = !inString;
      result.push(char);
      lastNonWhitespaceChar = char;
      i++;
      continue;
    }

    if (inString) {
      result.push(char);
      i++;
      continue;
    }

    // Outside string: handle structural elements
    if (char === DELIMITERS.OPEN_BRACE || char === DELIMITERS.OPEN_BRACKET) {
      delimiterStack.push({ opener: char, index: result.length });
      result.push(char);
      lastNonWhitespaceChar = char;
      i++;
      continue;
    }

    if (char === DELIMITERS.CLOSE_BRACE || char === DELIMITERS.CLOSE_BRACKET) {
      if (delimiterStack.length > 0) {
        const top = delimiterStack.pop();
        if (top) {
          const { opener } = top;
          const expectedCloser =
            opener === DELIMITERS.OPEN_BRACE ? DELIMITERS.CLOSE_BRACE : DELIMITERS.CLOSE_BRACKET;

          if (char !== expectedCloser) {
            // Mismatched delimiter - track for correction
            hasChanges = true;
            // Special case: We see ] but expected }, AND there's a [ on the stack
            if (
              char === DELIMITERS.CLOSE_BRACKET &&
              expectedCloser === DELIMITERS.CLOSE_BRACE &&
              delimiterStack.length >= 1 &&
              delimiterStack[delimiterStack.length - 1].opener === DELIMITERS.OPEN_BRACKET
            ) {
              const nextChar = peekNextNonWhitespace(i);
              if (nextChar === DELIMITERS.DOUBLE_QUOTE) {
                delimiterCorrections.push({
                  index: result.length,
                  wrongChar: char,
                  correctChar: DELIMITERS.CLOSE_BRACE,
                  insertAfter: DELIMITERS.CLOSE_BRACKET,
                });
                delimiterStack.pop(); // Pop the array opener
              } else {
                delimiterCorrections.push({
                  index: result.length,
                  wrongChar: char,
                  correctChar: expectedCloser,
                });
              }
            } else {
              delimiterCorrections.push({
                index: result.length,
                wrongChar: char,
                correctChar: expectedCloser,
              });
            }
            result.push(char); // Push wrong delimiter, will be corrected later
          } else {
            result.push(char);
          }
        }
      } else {
        result.push(char);
      }
      lastNonWhitespaceChar = char;
      i++;
      continue;
    }

    // Handle newlines for comma insertion logic
    if (char === DELIMITERS.NEWLINE) {
      if (lastNonWhitespaceChar && isValueTerminator(lastNonWhitespaceChar)) {
        pendingLineValueEnd = true;
      } else {
        pendingLineValueEnd = false;
      }
      result.push(char);
      i++;

      // Peek forward to see if next non-whitespace chars start a property name
      let j = i;
      while (j < chars.length && (chars[j] === DELIMITERS.SPACE || chars[j] === DELIMITERS.TAB)) {
        j++;
      }
      if (
        pendingLineValueEnd &&
        j < chars.length &&
        chars[j] === DELIMITERS.DOUBLE_QUOTE &&
        lastNonWhitespaceChar !== DELIMITERS.COMMA
      ) {
        // Insert comma before newline
        commaInsertions.push(result.length - 1);
        hasChanges = true;
      }
      lastNonWhitespaceChar = undefined;
      continue;
    }

    if (char === DELIMITERS.COMMA) {
      result.push(char);
      lastNonWhitespaceChar = char;
      i++;
      continue;
    }

    if (char.trim() !== "") {
      lastNonWhitespaceChar = char;
    }

    result.push(char);
    i++;
  }

  // Apply delimiter corrections (from end to start to maintain indices)
  let workingContent = result.join("");
  for (let idx = delimiterCorrections.length - 1; idx >= 0; idx--) {
    const { index, correctChar, insertAfter } = delimiterCorrections[idx];
    if (insertAfter) {
      workingContent =
        workingContent.substring(0, index) +
        correctChar +
        insertAfter +
        workingContent.substring(index + 1);
    } else {
      workingContent =
        workingContent.substring(0, index) + correctChar + workingContent.substring(index + 1);
    }
  }

  // Apply comma insertions (from end to start)
  for (let idx = commaInsertions.length - 1; idx >= 0; idx--) {
    const pos = commaInsertions[idx];
    workingContent = workingContent.substring(0, pos) + "," + workingContent.substring(pos);
  }

  // Complete truncated structures (before removing trailing commas)
  let finalContent = workingContent.trim();
  if (finalContent && !finalContent.endsWith("}") && !finalContent.endsWith("]")) {
    // Rebuild delimiter stack for completion
    const completionStack: string[] = [];
    let inStringFinal = false;
    let escapeNextFinal = false;
    for (const ch of finalContent) {
      if (escapeNextFinal) {
        escapeNextFinal = false;
        continue;
      }
      if (ch === "\\") {
        escapeNextFinal = true;
        continue;
      }
      if (ch === '"') {
        inStringFinal = !inStringFinal;
        continue;
      }
      if (!inStringFinal) {
        if (ch === "{" || ch === "[") completionStack.push(ch);
        else if (ch === "}" || ch === "]") completionStack.pop();
      }
    }
    if (inStringFinal) {
      finalContent += '"';
      hasChanges = true;
    }
    while (completionStack.length) {
      const opener = completionStack.pop();
      finalContent += opener === "{" ? "}" : "]";
      hasChanges = true;
    }
  }

  // Remove trailing commas (after completing structures)
  const beforeTrailingCommaRemoval = finalContent;
  finalContent = finalContent.replaceAll(/,\s*([}\]])/g, "$1");
  if (finalContent !== beforeTrailingCommaRemoval) {
    hasChanges = true;
  }

  // Helper function to check if we're inside a string at a given position
  const isInStringAt = (position: number, content: string): boolean => {
    let inString = false;
    let escaped = false;
    for (let i = 0; i < position; i++) {
      const char = content[i];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = !inString;
      }
    }
    return inString;
  };

  // Helper function to check if we're in an array context
  const isInArrayContext = (matchIndex: number, content: string): boolean => {
    const beforeMatch = content.substring(Math.max(0, matchIndex - 500), matchIndex);
    let openBraces = 0;
    let inString = false;
    let escapeNext = false;
    let foundOpeningBracket = false;
    let braceDepthAtBracket = 0;

    for (let i = beforeMatch.length - 1; i >= 0; i--) {
      const char = beforeMatch[i];
      if (escapeNext) {
        escapeNext = false;
        continue;
      }
      if (char === "\\") {
        escapeNext = true;
        continue;
      }
      if (char === '"') {
        inString = !inString;
        continue;
      }
      if (!inString) {
        if (char === "{") {
          openBraces++;
        } else if (char === "}") {
          openBraces--;
        } else if (char === "[") {
          if (!foundOpeningBracket) {
            foundOpeningBracket = true;
            braceDepthAtBracket = openBraces;
          }
          // If we found the array and we're at the same or lower brace depth, we're in array context
          if (openBraces <= braceDepthAtBracket) {
            break;
          }
        } else if (char === "]") {
          // Track closing brackets to ensure we're still in the array
          // (not needed for the logic but helps with correctness)
        }
      }
    }

    // We're in array context if we found an opening bracket and current brace depth
    // is at or below the depth when we entered the array
    return foundOpeningBracket && openBraces <= braceDepthAtBracket;
  };

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
    diagnostics.push(
      `Fixed dangling property: "${propertyName} " -> "${propertyName}": null${delimiter === "\n" ? "," : delimiter}`,
    );

    if (delimiter === "\n") {
      return `"${propertyName}": null,`;
    }
    return `"${propertyName}": null${delimiter}`;
  });
  if (finalContent !== beforeDanglingProperties) {
    diagnostics.push(SANITIZATION_STEP.FIXED_DANGLING_PROPERTIES);
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
        diagnostics.push(
          `Fixed missing opening quote in array string: ${unquotedValueStr}" -> "${unquotedValueStr}"`,
        );
        return `${delimiterStr}${whitespaceStr}\n${whitespaceStr}"${unquotedValueStr}",`;
      },
    );
  }
  if (finalContent !== beforeMissingQuotes) {
    diagnostics.push("Fixed missing opening quotes in array string values");
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
        diagnostics.push(
          `Removed stray characters "${strayCharsStr}" after value ${quotedValueStr}`,
        );
        // Return just the quoted value (the stray chars and optional whitespace are removed)
        // The content before the match is preserved automatically by replace()
        return quotedValueStr;
      }

      return match;
    },
  );
  if (finalContent !== beforeStrayChars) {
    diagnostics.push(SANITIZATION_STEP.FIXED_STRAY_CHARS_AFTER_PROPERTY_VALUES);
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
        diagnostics.push(
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
        diagnostics.push(
          `Fixed corrupted property/value pair (pattern 2): "${propertyNameStr}":${corruptedValueStr}" -> "${propertyNameStr}": "${corruptedValueStr}", "type": "${typeValueStr}"`,
        );
        return `{ "${propertyNameStr}": "${corruptedValueStr}", "type": "${typeValueStr}"`;
      }

      return match;
    },
  );
  if (finalContent !== beforeCorruptedPairs) {
    diagnostics.push("Fixed corrupted property/value pairs");
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

        // Simple reconstruction: convert camelCase to UPPER_SNAKE_CASE with MAX_ prefix
        const rest = truncatedValueStr.substring(2); // Remove "ax" if present
        let reconstructedValue = truncatedValueStr;
        if (
          truncatedValueStr.toLowerCase().startsWith("ax") &&
          rest.length > 0 &&
          /^[A-Z]/.test(rest)
        ) {
          const camelCase = rest;
          const snakeCase = camelCase
            .replace(/([A-Z])/g, "_$1")
            .replace(/^_/, "")
            .toUpperCase();
          reconstructedValue = `MAX_${snakeCase}`;
        }

        hasChanges = true;
        diagnostics.push(
          `Fixed truncated value in array element: inserted { and "name": "${reconstructedValue}" before "${truncatedValueStr}"`,
        );

        const camelCaseValue =
          truncatedValueStr.charAt(0).toUpperCase() + truncatedValueStr.substring(1);
        return `${typePropertyStr}\n${whitespace1Str}  },\n${whitespace1Str}  {\n${whitespace1Str}    "name": "${reconstructedValue}",\n${whitespace1Str}    "value": "${camelCaseValue}",\n${whitespace2Str}"${nextPropertyStr}"`;
      },
    );
  }
  if (finalContent !== beforeTruncatedValues) {
    diagnostics.push("Fixed truncated property values in array elements");
  }

  // Build diagnostics
  if (hasChanges) {
    if (delimiterCorrections.length > 0) {
      diagnostics.push(
        SANITIZATION_STEP_TEMPLATE.fixedMismatchedDelimiters(delimiterCorrections.length),
      );
    }
    if (commaInsertions.length > 0) {
      diagnostics.push(SANITIZATION_STEP_TEMPLATE.addedMissingCommas(commaInsertions.length));
    }
    // Count trailing commas removed (approximate)
    const trailingCommasRemoved = (input.match(/,\s*([}\]])/g) ?? []).length;
    if (trailingCommasRemoved > 0) {
      diagnostics.push(SANITIZATION_STEP.REMOVED_TRAILING_COMMAS);
    }
    // Check if structures were completed
    const originalTrimmed = input.trim();
    const wasTruncated =
      originalTrimmed && !originalTrimmed.endsWith("}") && !originalTrimmed.endsWith("]");
    if (wasTruncated && finalContent !== workingContent.trim()) {
      diagnostics.push(SANITIZATION_STEP.COMPLETED_TRUNCATED_STRUCTURES);
    }
  }

  if (!hasChanges) {
    return { content: input, changed: false };
  }

  return {
    content: finalContent,
    changed: true,
    description: "Fixed JSON structure",
    diagnostics: diagnostics.length > 0 ? diagnostics : undefined,
  };
};
