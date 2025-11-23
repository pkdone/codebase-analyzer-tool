import { Sanitizer, SanitizerResult } from "./sanitizers-types";
import { SANITIZATION_STEP_TEMPLATE } from "../constants/sanitization-steps.config";
import { DELIMITERS } from "../constants/json-processing.config";

/**
 * Sanitizer that fixes mismatched delimiters (brackets and braces).
 *
 * LLMs sometimes generate JSON with wrong closing delimiters, such as using `]`
 * to close an object that was opened with `{`, or vice versa.
 *
 * ## Examples
 * - `{"key": "value"]` -> `{"key": "value"}`
 * - `["item1", "item2"}` -> `["item1", "item2"]`
 * - `{"outer": {"inner": ["value"}}]` -> `{"outer": {"inner": ["value"]}}`
 *
 * @param input - The raw string content to sanitize
 * @returns Sanitizer result with mismatched delimiters fixed
 */
export const fixMismatchedDelimiters: Sanitizer = (input: string): SanitizerResult => {
  const trimmed = input.trim();
  if (!trimmed) {
    return { content: input, changed: false };
  }

  const chars = Array.from(trimmed);
  const result: string[] = [];
  let i = 0;

  // State tracking
  let inString = false;
  let escapeNext = false;
  const delimiterStack: { opener: string; index: number }[] = [];
  const delimiterCorrections: {
    index: number;
    wrongChar: string;
    correctChar: string;
    insertAfter?: string;
  }[] = [];

  // Helper to peek at next non-whitespace, non-comma character
  const peekNextNonWhitespace = (startIdx: number): string | null => {
    const remaining = trimmed.substring(startIdx + 1);
    const regex = /[^\s,]/;
    const match = regex.exec(remaining);
    return match ? match[0] : null;
  };

  // First pass: identify mismatched delimiters
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
            // Special case: We see ] but expected }, AND there's a [ on the stack
            if (
              char === DELIMITERS.CLOSE_BRACKET &&
              expectedCloser === DELIMITERS.CLOSE_BRACE &&
              delimiterStack.length >= 1 &&
              delimiterStack.at(-1)?.opener === DELIMITERS.OPEN_BRACKET
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
      i++;
      continue;
    }

    result.push(char);
    i++;
  }

  if (delimiterCorrections.length === 0) {
    return { content: input, changed: false };
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

  return {
    content: workingContent,
    changed: true,
    description: SANITIZATION_STEP_TEMPLATE.fixedMismatchedDelimiters(delimiterCorrections.length),
    diagnostics: [
      SANITIZATION_STEP_TEMPLATE.fixedMismatchedDelimiters(delimiterCorrections.length),
    ],
  };
};
