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

  // Pattern for missing commas in arrays: array element followed by newline and another array element
  // Matches: "value1"\n  "value2" or {"key": "value"}\n  {"key2": "value2"}
  const missingCommaInArrayPattern = /(["}\]\]])\s*\n(\s*)(["{])/g;

  // Pattern for missing commas between quoted strings in arrays (handles both same-line and newline cases)
  const missingCommaBetweenQuotedStringsPattern = /"([^"]+)"\s*\n?(\s*)"([^"]+)"(\s*,|\s*\])/g;

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

  // Handle missing commas between quoted strings in arrays first (more specific)
  sanitized = sanitized.replace(
    missingCommaBetweenQuotedStringsPattern,
    (match, value1, whitespace, value2, terminator, offset) => {
      const offsetNum = typeof offset === "number" ? offset : 0;
      const value1Str = typeof value1 === "string" ? value1 : "";
      const value2Str = typeof value2 === "string" ? value2 : "";
      const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
      const terminatorStr = typeof terminator === "string" ? terminator : "";

      // Check if we're in a string
      let inString = false;
      let escaped = false;
      for (let i = 0; i < offsetNum; i++) {
        if (escaped) {
          escaped = false;
          continue;
        }
        if (sanitized[i] === "\\") {
          escaped = true;
        } else if (sanitized[i] === '"') {
          inString = !inString;
        }
      }

      if (inString) {
        return match;
      }

      // Check if we're in an array context by looking for an opening bracket before the match
      // We use a simpler approach: look backwards for [ and ensure we're not inside a string
      const beforeMatch = sanitized.substring(Math.max(0, offsetNum - 500), offsetNum);
      let inStringCheck = false;
      let escapeCheck = false;
      let foundArray = false;

      // Look backwards for an opening bracket that's not inside a string
      for (let i = beforeMatch.length - 1; i >= 0; i--) {
        const char = beforeMatch[i];
        if (escapeCheck) {
          escapeCheck = false;
          continue;
        }
        if (char === "\\") {
          escapeCheck = true;
          continue;
        }
        if (char === '"') {
          inStringCheck = !inStringCheck;
          continue;
        }
        if (!inStringCheck && char === "[") {
          foundArray = true;
          break;
        }
      }

      if (foundArray) {
        // Check if there's already a comma before the first quote
        const beforeFirstQuote = sanitized.substring(Math.max(0, offsetNum - 10), offsetNum);
        const trimmedBefore = beforeFirstQuote.trim();
        // Don't add comma if there's already one
        if (!trimmedBefore.endsWith(",")) {
          commaCount++;
          const newline = whitespaceStr ? "\n" : "";
          // Add space after comma for same-line case, preserve whitespace for newline case
          const spaceAfterComma = whitespaceStr ? "" : " ";
          return `"${value1Str}",${spaceAfterComma}${newline}${whitespaceStr}"${value2Str}"${terminatorStr}`;
        }
      }

      return match;
    },
  );

  // Handle missing commas in arrays (for non-quoted elements)
  sanitized = sanitized.replace(
    missingCommaInArrayPattern,
    (match, terminator, whitespace, nextElement, offset) => {
      const offsetNum = typeof offset === "number" ? offset : 0;
      const terminatorStr = typeof terminator === "string" ? terminator : "";
      const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
      const nextElementStr = typeof nextElement === "string" ? nextElement : "";

      // Check if we're in an array context (not in a string)
      let inString = false;
      let escaped = false;
      for (let i = 0; i < offsetNum; i++) {
        if (escaped) {
          escaped = false;
          continue;
        }
        if (sanitized[i] === "\\") {
          escaped = true;
        } else if (sanitized[i] === '"') {
          inString = !inString;
        }
      }

      if (inString) {
        return match;
      }

      // Check if we're actually in an array (have opening bracket before)
      const beforeMatch = sanitized.substring(Math.max(0, offsetNum - 500), offsetNum);
      let bracketDepth = 0;
      let braceDepth = 0;
      let inStringCheck = false;
      let escapeCheck = false;
      let foundArray = false;

      for (let i = beforeMatch.length - 1; i >= 0; i--) {
        const char = beforeMatch[i];
        if (escapeCheck) {
          escapeCheck = false;
          continue;
        }
        if (char === "\\") {
          escapeCheck = true;
          continue;
        }
        if (char === '"') {
          inStringCheck = !inStringCheck;
          continue;
        }
        if (!inStringCheck) {
          if (char === "]") {
            bracketDepth++;
          } else if (char === "[") {
            // When we find an opening bracket going backwards, check if we're at depth 0
            // (meaning this is the array we're looking for)
            if (bracketDepth === 0 && braceDepth <= 0) {
              foundArray = true;
              break;
            }
            bracketDepth--;
          } else if (char === "}") {
            braceDepth++;
          } else if (char === "{") {
            braceDepth--;
          }
        }
      }

      if (!foundArray) {
        return match;
      }

      // Check if there's already a comma before the newline
      const beforeNewline = sanitized.substring(Math.max(0, offsetNum - 10), offsetNum);
      if (beforeNewline.trim().endsWith(",")) {
        return match;
      }

      commaCount++;
      return `${terminatorStr},\n${whitespaceStr}${nextElementStr}`;
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
