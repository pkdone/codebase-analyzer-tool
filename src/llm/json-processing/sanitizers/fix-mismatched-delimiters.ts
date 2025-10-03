import { Sanitizer } from "./sanitizers-types";

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

  // Helper to peek at next non-whitespace character
  const peekNextNonWhitespace = (startIdx: number): string | null => {
    for (let j = startIdx + 1; j < input.length; j++) {
      const c = input[j];
      if (c !== " " && c !== "\n" && c !== "\r" && c !== "\t" && c !== ",") {
        return c;
      }
    }
    return null;
  };

  // First pass: identify all mismatched delimiters
  for (let i = 0; i < input.length; i++) {
    const char = input[i];

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
      if (char === "{" || char === "[") {
        stack.push({ opener: char, index: i });
      } else if (char === "}" || char === "]") {
        if (stack.length > 0) {
          const top = stack.pop();
          if (!top) continue;
          const { opener } = top;
          const expectedCloser = opener === "{" ? "}" : "]";

          // Check if the closing delimiter matches the opener
          if (char !== expectedCloser) {
            // Special case: We see ] but expected }, AND there's a [ on the stack
            // This likely means the LLM wrote ] when it meant }], missing the }
            // We detect this by checking if the next non-whitespace char is " (a property name)
            if (
              char === "]" &&
              expectedCloser === "}" &&
              stack.length >= 1 &&
              stack[stack.length - 1].opener === "["
            ) {
              const nextChar = peekNextNonWhitespace(i);
              if (nextChar === '"') {
                // Pattern: [{...}] but LLM wrote [{...] followed by a property
                // Fix: change ] to }, then insert ] after it
                corrections.push({
                  index: i,
                  wrongChar: char,
                  correctChar: "}",
                  insertAfter: "]",
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
    description: `Fixed ${corrections.length} mismatched delimiter${corrections.length > 1 ? "s" : ""}`,
  };
};
