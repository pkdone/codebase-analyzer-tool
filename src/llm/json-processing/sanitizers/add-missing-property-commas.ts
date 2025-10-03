import { Sanitizer } from "./sanitizers-types";

/**
 * Adds missing commas between object properties where the LLM forgot to include them.
 *
 * Detects patterns like:
 *   "property1": "value"
 *   "property2": "value"
 *
 * And transforms to:
 *   "property1": "value",
 *   "property2": "value"
 *
 * This handles cases where:
 * - A string value is followed by whitespace and then another property name
 * - A number/boolean/array/object is followed by whitespace and then another property name
 */
export const addMissingPropertyCommas: Sanitizer = (input) => {
  const trimmed = input.trim();
  if (!trimmed) return { content: input, changed: false };

  // Pattern: matches closing quote or bracket/brace followed by whitespace and opening quote
  // This indicates a property value ending followed by a new property name, missing comma
  // We need to be careful to only match this pattern outside of strings

  let result = trimmed;
  let changed = false;
  let inString = false;
  let escapeNext = false;
  let stringStartPos = -1; // Track where the current string started
  const insertions: { position: number; char: string }[] = [];

  for (let i = 0; i < trimmed.length - 1; i++) {
    const char = trimmed[i];
    const nextChar = trimmed[i + 1];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === "\\") {
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      if (!inString) {
        // Opening a string
        stringStartPos = i;
        inString = true;
      } else {
        // Closing a string
        inString = false;

        // Check if next non-whitespace is a quote (suggesting missing comma)
        let j = i + 1;
        while (j < trimmed.length && /\s/.test(trimmed[j])) {
          j++;
        }

        // If next non-whitespace character is a quote (property name)
        if (j < trimmed.length && trimmed[j] === '"') {
          // Look backward from the opening quote of our just-closed string
          // to see if there's a colon (indicating this was a property value)
          let foundColon = false;
          let k = stringStartPos - 1;

          // Skip whitespace before the opening quote
          while (k >= 0 && /\s/.test(trimmed[k])) {
            k--;
          }

          // Now look backward to find : or a delimiter that would indicate we're not in a property
          while (k >= 0) {
            if (trimmed[k] === ":") {
              foundColon = true;
              break;
            } else if (trimmed[k] === "," || trimmed[k] === "{" || trimmed[k] === "[") {
              // Hit a delimiter before finding colon - not a property value
              break;
            }
            k--;
          }

          if (foundColon) {
            // This is a property value followed by whitespace and another quote
            // Insert comma after the closing quote (at position i+1)
            insertions.push({ position: i + 1, char: "," });
            changed = true;
            // Skip ahead to avoid re-processing
            i = j - 1;
          }
        }
        stringStartPos = -1;
      }
      continue;
    }

    // Also handle cases like: ] "prop" or } "prop" or number "prop" or true "prop"
    if (!inString) {
      // Check for closing delimiters or value endings followed by quote
      if ((char === "]" || char === "}" || /[\d]/.test(char)) && /\s/.test(nextChar)) {
        // Look ahead for opening quote
        let j = i + 1;
        while (j < trimmed.length && /\s/.test(trimmed[j])) {
          j++;
        }

        if (j < trimmed.length && trimmed[j] === '"') {
          // Check context to ensure this is a property boundary
          // Simple heuristic: if we see } or ] followed by quote, it's likely: {...}\n"prop"
          insertions.push({ position: i + 1, char: "," });
          changed = true;
          i = j - 1;
        }
      }
    }
  }

  if (!changed) {
    return { content: input, changed: false };
  }

  // Apply insertions from end to start to maintain position indices
  for (let i = insertions.length - 1; i >= 0; i--) {
    const { position, char } = insertions[i];
    result = result.substring(0, position) + char + result.substring(position);
  }

  return {
    content: result,
    changed: true,
    description: `Added ${insertions.length} missing comma${insertions.length > 1 ? "s" : ""} between properties`,
  };
};
