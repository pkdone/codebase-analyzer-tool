import { Sanitizer } from "./sanitizers-types";
import { SANITIZATION_STEP } from "../config/sanitization-steps.config";

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
/**
 * Validates if a position in the string is likely the start of a JSON object/array.
 * Checks that the opening delimiter is followed by valid JSON content (whitespace, quote, or bracket).
 */
function isValidJsonStart(position: number, delimiter: string, content: string): boolean {
  if (position < 0 || position >= content.length) return false;

  // Check if it's a code snippet (like "else{" or "if {") by looking before
  // We only reject if there's a word character immediately before { (no space/newline)
  // This distinguishes code snippets from valid JSON with explanatory text before it
  if (delimiter === "{" && position > 0) {
    const charBefore = content[position - 1];
    // If there's a word character or underscore immediately before { (no space), it's likely code
    if (/[a-zA-Z_$]/.test(charBefore)) {
      return false; // Likely code snippet like "else{" or "if{"
    }
  }

  // Check what comes immediately after the delimiter (don't trim - check raw chars)
  if (position + 1 >= content.length) return false;

  // For objects, valid starts are: whitespace, newline, quote, closing brace (empty object),
  // or a letter (for unquoted property names that will be fixed by later sanitizers)
  if (delimiter === "{") {
    const nextChar = content[position + 1];
    // Valid: whitespace, newline, quote (for property name), } (empty object),
    // or a letter (for unquoted property names - these will be fixed by fixUnquotedPropertyNames)
    if (
      nextChar === "\n" ||
      nextChar === "\r" ||
      nextChar === " " ||
      nextChar === "\t" ||
      nextChar === '"' ||
      nextChar === "}" ||
      (nextChar >= "a" && nextChar <= "z") ||
      (nextChar >= "A" && nextChar <= "Z")
    ) {
      return true;
    }
    return false; // Doesn't look like JSON
  }

  // For arrays, valid starts are: whitespace, newline, or closing bracket (empty array), or valid JSON values
  if (delimiter === "[") {
    const nextChar = content[position + 1];
    return (
      nextChar === "\n" ||
      nextChar === "\r" ||
      nextChar === " " ||
      nextChar === "\t" ||
      nextChar === "]" ||
      nextChar === '"' ||
      nextChar === "{" ||
      nextChar === "[" ||
      (nextChar >= "0" && nextChar <= "9") || // numbers
      nextChar === "-" // negative numbers
    );
  }

  return false;
}

export const extractLargestJsonSpan: Sanitizer = (input) => {
  // Find all potential JSON starts (both { and [)
  const candidates: { position: number; char: string }[] = [];
  let searchPos = 0;
  while (searchPos < input.length) {
    const bracePos = input.indexOf("{", searchPos);
    const bracketPos = input.indexOf("[", searchPos);

    if (bracePos !== -1) {
      candidates.push({ position: bracePos, char: "{" });
    }
    if (bracketPos !== -1) {
      candidates.push({ position: bracketPos, char: "[" });
    }

    // Move search position forward
    if (bracePos === -1 && bracketPos === -1) break;
    const minPos = Math.min(
      bracePos === -1 ? Infinity : bracePos,
      bracketPos === -1 ? Infinity : bracketPos,
    );
    searchPos = minPos + 1;
  }

  // Sort by position
  candidates.sort((a, b) => a.position - b.position);

  // If the input starts with { or [ (after trimming), prioritize that candidate
  // This handles the common case where the input is already clean JSON
  const trimmedInput = input.trim();
  const trimmedStart = input.indexOf(trimmedInput);
  let firstCandidate: { position: number; char: string } | null = null;
  for (const candidate of candidates) {
    if (candidate.position === trimmedStart || (candidate.position < 10 && trimmedStart === 0)) {
      firstCandidate = candidate;
      break;
    }
  }

  // Try candidates in order: first the one at the start (if any), then all others
  const candidatesToTry = firstCandidate
    ? [firstCandidate, ...candidates.filter((c) => c !== firstCandidate)]
    : candidates;

  for (const candidate of candidatesToTry) {
    const { position: start, char: startChar } = candidate;

    // Validate that this looks like a valid JSON start
    if (!isValidJsonStart(start, startChar, input)) {
      continue; // Skip this candidate, try next
    }

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

    if (endIndex !== -1) {
      const sliced = input.slice(start, endIndex + 1).trim();
      const trimmedInput = input.trim();

      // If the extracted content is the same as the trimmed input (or very close),
      // then the input is already clean JSON - return unchanged
      if (sliced === trimmedInput || (sliced.length > trimmedInput.length * 0.95 && start < 10)) {
        return { content: input, changed: false };
      }

      // Validate that the extracted span looks like valid JSON (starts with { or [ and ends with } or ])
      // We removed the minimum size check because valid JSON can be very small (e.g., "{}" or "[1]")
      if (sliced !== trimmedInput) {
        // Quick validation: check if it starts and ends with matching delimiters
        if (
          (sliced.startsWith("{") && sliced.endsWith("}")) ||
          (sliced.startsWith("[") && sliced.endsWith("]"))
        ) {
          return {
            content: sliced,
            changed: true,
            description: SANITIZATION_STEP.EXTRACTED_LARGEST_JSON_SPAN,
          };
        }
      }
    } else {
      // No matching closing delimiter found - input might be truncated
      // If this candidate is at the start of the input, return unchanged to let
      // later sanitizers (like completeTruncatedStructures) handle it
      const trimmedStart = input.indexOf(input.trim());
      if (start === trimmedStart || start < 10) {
        return { content: input, changed: false };
      }
    }
  }

  // No valid JSON found
  return { content: input, changed: false };
};
