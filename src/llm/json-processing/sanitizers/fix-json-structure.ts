import { Sanitizer, SanitizerResult } from "./sanitizers-types";
import { SANITIZATION_STEP, SANITIZATION_STEP_TEMPLATE } from "../config/sanitization-steps.config";
import { DELIMITERS } from "../config/json-processing.config";

/**
 * Unified sanitizer that fixes fundamental JSON structure issues in a single pass.
 *
 * This sanitizer combines the functionality of four separate sanitizers:
 * 1. fixMismatchedDelimiters: Corrects bracket/brace mismatches
 * 2. addMissingPropertyCommas: Inserts missing commas between object properties
 * 3. removeTrailingCommas: Removes invalid trailing commas
 * 4. completeTruncatedStructures: Closes unclosed brackets/braces from truncated responses
 *
 * ## Purpose
 * LLMs sometimes generate JSON with structural issues that prevent parsing:
 * - Wrong closing delimiters (e.g., `{"key": "value"]`)
 * - Missing commas between properties
 * - Trailing commas (valid in JS but not JSON)
 * - Truncated structures missing closing brackets/braces
 *
 * This sanitizer handles all these issues in a single, efficient stateful pass.
 *
 * ## Implementation
 * Uses a stateful parser that:
 * - Maintains a delimiter stack to track open structures
 * - Tracks string boundaries to avoid false positives
 * - Applies fixes in the correct order to avoid conflicts
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
