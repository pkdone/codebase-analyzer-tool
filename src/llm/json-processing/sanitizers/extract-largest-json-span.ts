import { Sanitizer } from "./sanitizers-types";

/**
 * Extracts the largest valid JSON structure from content that includes extra text.
 *
 * ## Purpose
 * LLMs sometimes include explanatory text before or after the JSON content,
 * such as:
 * - "Here's the JSON: { ... }"
 * - "{ ... } This represents the data structure."
 * - "I've generated the following:\n\n{ ... }\n\nLet me know if..."
 *
 * This sanitizer identifies and extracts the complete JSON object or array.
 *
 * ## Algorithm
 * 1. Finds the first opening delimiter: `{` or `[`
 * 2. Tracks depth by counting opening/closing delimiters
 * 3. Respects string boundaries (doesn't count delimiters inside strings)
 * 4. Handles escape sequences within strings
 * 5. Extracts from the opening to matching closing delimiter
 *
 * ## Examples
 * Before: `Here is your JSON: {"name": "John", "age": 30}`
 * After:  `{"name": "John", "age": 30}`
 *
 * Before: `The data: [1, 2, 3] is ready`
 * After:  `[1, 2, 3]`
 *
 * ## Limitations
 * - Assumes the first delimiter starts the JSON (doesn't try multiple candidates)
 * - Returns unchanged if no complete JSON structure is found
 * - Doesn't handle multiple separate JSON structures (returns first one only)
 * - May fail on malformed JSON where delimiters are mismatched
 *
 * ## Implementation Notes
 * - Properly handles escaped quotes: `"value with \" quote"`
 * - Properly handles nested structures: `{"obj": {"nested": [1, 2]}}`
 * - Trims the extracted content before returning
 *
 * @param input - The raw string content to sanitize
 * @returns Sanitizer result with extracted JSON if found and different from input
 */
export const extractLargestJsonSpan: Sanitizer = (input) => {
  const firstBrace = input.indexOf("{");
  const firstBracket = input.indexOf("[");
  let start = -1;
  let startChar = "";
  if (!(firstBrace === -1 && firstBracket === -1)) {
    if (firstBrace === -1 || (firstBracket !== -1 && firstBracket < firstBrace)) {
      start = firstBracket;
      startChar = "[";
    } else {
      start = firstBrace;
      startChar = "{";
    }
  }
  if (start < 0) return { content: input, changed: false };
  const endChar = startChar === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  let escapeNext = false;
  let endIndex = -1;
  for (let i = start; i < input.length; i++) {
    const ch = input[i];
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    if (ch === "\\") {
      escapeNext = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (ch === startChar) depth++;
      else if (ch === endChar) {
        depth--;
        if (depth === 0) {
          endIndex = i;
          break;
        }
      }
    }
  }
  if (endIndex === -1) return { content: input, changed: false };
  const sliced = input.slice(start, endIndex + 1).trim();
  if (sliced !== input.trim()) {
    return { content: sliced, changed: true, description: "Extracted largest JSON span" };
  }
  return { content: input, changed: false };
};
