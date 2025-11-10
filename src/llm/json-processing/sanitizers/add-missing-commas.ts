import { Sanitizer, SanitizerResult } from "./sanitizers-types";
import { SANITIZATION_STEP_TEMPLATE } from "../constants/sanitization-steps.config";

/**
 * Sanitizer that adds missing commas between object properties on separate lines.
 *
 * LLMs sometimes generate JSON with missing commas between properties, especially
 * when properties are on separate lines. This sanitizer detects and fixes these cases.
 *
 * ## Examples
 * - `{"a": "value1"\n  "b": "value2"}` -> `{"a": "value1",\n  "b": "value2"}`
 * - `{"outer": {"inner": "value"}\n  "next": "value"}` -> `{"outer": {"inner": "value"},\n  "next": "value"}`
 *
 * @param input - The raw string content to sanitize
 * @returns Sanitizer result with missing commas added
 */
export const addMissingCommas: Sanitizer = (input: string): SanitizerResult => {
  const trimmed = input.trim();
  if (!trimmed) {
    return { content: input, changed: false };
  }

  // Pattern: Match a value terminator (quote, closing brace, bracket, or digit) followed by newline and whitespace,
  // then a quoted property name. This indicates a missing comma between properties on separate lines.
  // The pattern looks for: "value"\n  "property" or {"inner": "value"}\n  "property" or 42\n  "property"
  // Note: For digits, we match the last digit of a number (lookbehind ensures it's part of a number)
  const missingCommaPattern = /(["}\]\]]|\d)\s*\n(\s*")([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:/g;

  let sanitized = trimmed;
  let commaCount = 0;
  const diagnostics: string[] = [];

  // Use regex replacement to add missing commas
  sanitized = sanitized.replace(
    missingCommaPattern,
    (match, terminator, quote2WithWhitespace, propertyName, offset) => {
      const offsetNum = typeof offset === "number" ? offset : 0;
      const terminatorStr = typeof terminator === "string" ? terminator : "";
      const quote2WithWhitespaceStr =
        typeof quote2WithWhitespace === "string" ? quote2WithWhitespace : "";
      const propertyNameStr = typeof propertyName === "string" ? propertyName : "";

      // Verify we're not in a string by checking context (only if terminator is a quote)
      // Note: We check quotes up to and including the terminator position to see if we're in a string
      // For digits, we don't need to check (they can't be in strings in valid JSON)
      if (terminatorStr === '"') {
        // Count quotes up to and including the terminator (which is at offsetNum)
        let quoteCount = 0;
        let escaped = false;
        for (let i = 0; i <= offsetNum; i++) {
          if (escaped) {
            escaped = false;
            continue;
          }
          if (sanitized[i] === "\\") {
            escaped = true;
          } else if (sanitized[i] === '"') {
            quoteCount++;
          }
        }

        // If odd number of quotes (including the terminator), the terminator closes a string
        // which means we were in a string before it - this is correct for a value ending
        // If even number, we're not in a string context - also correct
        // Actually, if quoteCount is even after including the terminator, we're outside a string
        // If odd, we're inside a string (the terminator opened a string that hasn't closed)
        // But wait - if the terminator is a closing quote of a value, quoteCount should be even
        // Let me think: if we have "value1" and we're at the closing quote:
        // - Before: 1 quote (opening) = odd = in string
        // - Including: 2 quotes = even = not in string (correct!)
        // So we want even number to proceed
        if (quoteCount % 2 === 1) {
          // Odd = we're in a string, skip
          return match;
        }
      }

      // Check if there's already a comma before the newline
      const beforeNewline = sanitized.substring(Math.max(0, offsetNum - 10), offsetNum);
      if (beforeNewline.trim().endsWith(",")) {
        return match;
      }

      // Check if this looks like a property context
      // We're looking for a value ending with a quote/brace/bracket, followed by newline and a property name
      // This should be in an object context (not inside a string or array value)
      // The pattern itself ensures we have a property name followed by colon, so this is likely correct
      // Just verify we're not at the start of the document incorrectly
      if (offsetNum < 5) {
        // Too close to start - might be edge case, skip
        return match;
      }

      commaCount++;
      // quote2WithWhitespaceStr already includes the opening quote, so we just add the property name and colon
      return `${terminatorStr},\n${quote2WithWhitespaceStr}${propertyNameStr}":`;
    },
  );

  if (commaCount > 0) {
    diagnostics.push(SANITIZATION_STEP_TEMPLATE.addedMissingCommas(commaCount));
    return {
      content: sanitized,
      changed: true,
      description: SANITIZATION_STEP_TEMPLATE.addedMissingCommas(commaCount),
      diagnostics,
    };
  }

  return { content: input, changed: false };
};
