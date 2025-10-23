import { Sanitizer } from "./sanitizers-types";
import { SANITIZATION_STEP_TEMPLATE } from "../config/sanitization-steps.config";
import { DELIMITERS } from "../config/json-processing.config";

/**
 * Stateful implementation to insert missing commas between object properties.
 * Avoids regex false-positives inside string literals (e.g. embedded code or JSON snippets).
 *
 * Strategy:
 * - Iterate over characters tracking whether we're inside a string and escape state.
 * - Track last significant token that can terminate a value (closing brace/bracket, quote, digit, keyword).
 * - When encountering a newline followed by indentation & opening quote for a property
 *   and the previous line ended with a value token but not a comma, insert a comma.
 */
export const addMissingPropertyCommas: Sanitizer = (input) => {
  if (!input) return { content: input, changed: false };

  // Safe iteration over string by index (avoids emoji segmentation issues flagged by lint rule)
  const chars = Array.from(input); // deliberate: preserves code points
  let inString = false;
  let escape = false;
  let i = 0;
  let lastNonWhitespaceChar: string | undefined;
  let pendingLineValueEnd = false; // whether previous line ended with a value (no trailing comma yet)
  const diagnostics: string[] = [];
  const insertPositions: number[] = [];

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

  // Walk through characters capturing candidate newline contexts
  while (i < chars.length) {
    const ch = chars[i];

    if (inString) {
      if (escape) {
        escape = false; // escaped char consumed
      } else if (ch === DELIMITERS.BACKSLASH) {
        escape = true;
      } else if (ch === DELIMITERS.DOUBLE_QUOTE) {
        inString = false;
      }
      i++;
      continue;
    }

    if (ch === DELIMITERS.DOUBLE_QUOTE) {
      inString = true;
      lastNonWhitespaceChar = ch;
      i++;
      continue;
    }

    if (ch === DELIMITERS.NEWLINE) {
      // Determine if the previous line ended with a value (and not comma)
      if (lastNonWhitespaceChar && isValueTerminator(lastNonWhitespaceChar)) {
        pendingLineValueEnd = true;
      } else {
        pendingLineValueEnd = false;
      }
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
        // Insert comma before newline (i-1 is newline position, we add just before newline effect -> actually we want after previous line value before current indentation)
        // We insert at position i (start of indentation) effectively adding comma at end of previous line.
        // Insert comma BEFORE the newline to end previous line correctly
        if (i > 0) insertPositions.push(i - 1);
        diagnostics.push("Inserted missing comma between object properties");
        // reset handled implicitly by setting lastNonWhitespaceChar below
      }
      lastNonWhitespaceChar = undefined; // reset for new line scanning
      continue;
    }

    if (ch.trim() !== "") {
      lastNonWhitespaceChar = ch;
    }

    i++;
  }

  if (insertPositions.length === 0) return { content: input, changed: false };

  // Build new content with inserted commas
  let offset = 0;
  let mutable = input;
  for (const pos of insertPositions) {
    const realPos = pos + offset;
    mutable = mutable.slice(0, realPos) + "," + mutable.slice(realPos);
    offset++;
  }

  return {
    content: mutable,
    changed: true,
    description: SANITIZATION_STEP_TEMPLATE.addedMissingCommas(insertPositions.length),
    diagnostics,
  };
};
