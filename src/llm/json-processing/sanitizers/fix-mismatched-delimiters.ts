import { Sanitizer } from "./sanitizers-types";
import { SANITIZATION_STEP_TEMPLATE } from "./sanitization-steps.constants";
import { DELIMITERS } from "../config/delimiters.config";

/**
 * Fixes mismatched closing delimiters in JSON where the wrong closing character is used.
 * For example: using ']' to close an object that was opened with '{', or vice versa.
 *
 * This handles cases like:
 * - `{"key": "value"]` -> `{"key": "value"}`
 * - `["item1", "item2"}` -> `["item1", "item2"]`
 * - Nested structures with mismatched delimiters
 *
 * The sanitizer parses the JSON structure and ensures each closing delimiter
 * matches the corresponding opening delimiter on the stack.
 */
export const fixMismatchedDelimiters: Sanitizer = (input) => {
  const trimmed = input.trim();
  if (!trimmed) {
    return { content: input, changed: false };
  }

  const stack: { opener: string; index: number }[] = [];
  const corrections: {
    index: number;
    wrongChar: string;
    correctChar: string;
    insertAfter?: string;
  }[] = [];
  let inString = false;
  let escapeNext = false;

  // Helper to peek at next non-whitespace, non-comma character
  const peekNextNonWhitespace = (startIdx: number): string | null => {
    const remaining = input.substring(startIdx + 1);
    const regex = /[^\s,]/; // Match any character that is NOT whitespace or comma
    const match = regex.exec(remaining);
    return match ? match[0] : null;
  };

  // First pass: identify all mismatched delimiters
  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === DELIMITERS.BACKSLASH) {
      escapeNext = true;
      continue;
    }

    if (char === DELIMITERS.DOUBLE_QUOTE) {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === DELIMITERS.OPEN_BRACE || char === DELIMITERS.OPEN_BRACKET) {
        stack.push({ opener: char, index: i });
      } else if (char === DELIMITERS.CLOSE_BRACE || char === DELIMITERS.CLOSE_BRACKET) {
        if (stack.length > 0) {
          const top = stack.pop();
          if (!top) continue;
          const { opener } = top;
          const expectedCloser =
            opener === DELIMITERS.OPEN_BRACE ? DELIMITERS.CLOSE_BRACE : DELIMITERS.CLOSE_BRACKET;

          // Check if the closing delimiter matches the opener
          if (char !== expectedCloser) {
            // Special case: We see ] but expected }, AND there's a [ on the stack
            // This likely means the LLM wrote ] when it meant }], missing the }
            // We detect this by checking if the next non-whitespace char is " (a property name)
            if (
              char === DELIMITERS.CLOSE_BRACKET &&
              expectedCloser === DELIMITERS.CLOSE_BRACE &&
              stack.length >= 1 &&
              stack[stack.length - 1].opener === DELIMITERS.OPEN_BRACKET
            ) {
              const nextChar = peekNextNonWhitespace(i);
              if (nextChar === DELIMITERS.DOUBLE_QUOTE) {
                // Pattern: [{...}] but LLM wrote [{...] followed by a property
                // Fix: change ] to }, then insert ] after it
                corrections.push({
                  index: i,
                  wrongChar: char,
                  correctChar: DELIMITERS.CLOSE_BRACE,
                  insertAfter: DELIMITERS.CLOSE_BRACKET,
                });
                // Pop the array opener since we're inserting its closer
                stack.pop();
              } else {
                // Normal mismatch - just replace
                corrections.push({
                  index: i,
                  wrongChar: char,
                  correctChar: expectedCloser,
                });
              }
            } else {
              // Normal mismatch - just replace
              corrections.push({
                index: i,
                wrongChar: char,
                correctChar: expectedCloser,
              });
            }
          }
        }
        // If stack is empty, we have an extra closing delimiter - leave it as is
        // for other sanitizers to handle
      }
    }
  }

  // If no corrections needed, return unchanged
  if (corrections.length === 0) {
    return { content: input, changed: false };
  }

  // Second pass: apply corrections from end to start to maintain indices
  let result = input;
  for (let i = corrections.length - 1; i >= 0; i--) {
    const { index, correctChar, insertAfter } = corrections[i];
    if (insertAfter) {
      // Replace the wrong delimiter and insert another after it
      result = result.substring(0, index) + correctChar + insertAfter + result.substring(index + 1);
    } else {
      // Just replace the wrong delimiter
      result = result.substring(0, index) + correctChar + result.substring(index + 1);
    }
  }

  return {
    content: result,
    changed: true,
    description: SANITIZATION_STEP_TEMPLATE.fixedMismatchedDelimiters(corrections.length),
  };
};
