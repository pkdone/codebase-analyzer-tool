import { Sanitizer, SanitizerResult } from "./sanitizers-types";
import { SANITIZATION_STEP } from "../config/sanitization-steps.config";

/**
 * Sanitizer that fixes truncated array elements where the opening brace and property name are missing.
 *
 * This sanitizer addresses cases where LLM responses contain array elements that start with
 * just a truncated property value (like a method name) without the opening brace `{` and
 * the property name (like `"name":`).
 *
 * Examples of issues this sanitizer handles:
 * - `},\ncalculateInterest",` -> `},\n  {\n    "name": "calculateInterest",`
 * - `},\n  e"value",` -> `},\n  {\n    "name": "value",` (when e is detected as truncated "name")
 *
 * The sanitizer detects patterns where:
 * 1. An object closes with `},`
 * 2. A newline follows
 * 3. A word-like pattern appears that looks like it should be a property value
 * 4. The opening brace `{` and property name (typically `"name":`) are missing
 *
 * Strategy:
 * Detects patterns where after `},` + newline, there's a word-like pattern that should
 * be inside a new object element. Inserts the missing opening brace and property name.
 */
export const fixTruncatedArrayElements: Sanitizer = (jsonString: string): SanitizerResult => {
  try {
    let sanitized = jsonString;
    const diagnostics: string[] = [];

    // Pattern to match truncated array elements:
    // 1. Closing brace with comma: `},`
    // 2. Optional whitespace and newline: `\s*\n`
    // 3. Optional indentation whitespace
    // 4. Word-like pattern that starts with lowercase letter (truncated property value)
    //    - Or a word starting with lowercase (e.g., `alculateInterest` from truncated "calculateInterest")
    // 5. Followed by quote and comma
    //
    // Examples matched:
    // - `},\ncalculateInterest",`
    // - `},\n  alculateInterest",`
    //
    // We need to be careful to only match when we're actually in an array context
    const truncatedElementPattern = /(\}\s*,)\s*\n(\s*)([a-z][a-zA-Z0-9_]*)"\s*,/g;

    sanitized = sanitized.replace(
      truncatedElementPattern,
      (match, closingBraceComma, whitespace, wordValue) => {
        const closingBraceCommaStr = typeof closingBraceComma === "string" ? closingBraceComma : "";
        const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
        const wordValueStr = typeof wordValue === "string" ? wordValue : "";

        // Check if we're in an array context by looking backwards
        const matchIndex = sanitized.indexOf(match);
        if (matchIndex > 0) {
          const beforeMatch = sanitized.substring(Math.max(0, matchIndex - 500), matchIndex);

          // Count brackets and braces to determine if we're inside an array of objects
          let openBraces = 0;
          let openBrackets = 0;
          let inString = false;
          let escapeNext = false;
          let foundArrayOpening = false;

          // Scan backwards to find if we're in an array context
          for (let i = beforeMatch.length - 1; i >= 0; i--) {
            const char = beforeMatch[i];
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
              if (char === "}") openBraces++;
              else if (char === "{") openBraces--;
              else if (char === "]") openBrackets++;
              else if (char === "[") {
                openBrackets--;
                // If we find an opening bracket and braces are balanced at this point,
                // we're likely in an array of objects
                if (openBrackets === 0 && openBraces === 0) {
                  foundArrayOpening = true;
                  break;
                }
              }
            }
          }

          // If we're in an array context, fix the truncated element
          if (foundArrayOpening || (openBrackets > 0 && openBraces === 0)) {
            // The property name is typically "name" for arrays of objects with name properties
            const propertyName = "name";

            diagnostics.push(
              `Fixed truncated array element: inserted { and "${propertyName}": before "${wordValueStr}"`,
            );

            // Insert: opening brace + property name + colon + quote + word value + comma
            const indentation = whitespaceStr;
            const propertyIndentation = indentation + "  ";

            return `${closingBraceCommaStr}\n${indentation}{\n${propertyIndentation}"${propertyName}": "${wordValueStr}",`;
          }
        }

        return match;
      },
    );

    // Also handle cases where the word pattern doesn't have quotes yet
    // Pattern: },\n  wordValue\n (where wordValue should be inside an object)
    const truncatedElementWithoutQuotePattern =
      /(\}\s*,)\s*\n(\s*)([a-z][a-zA-Z0-9_]*)\s*\n(\s*)"([a-z][a-zA-Z0-9_]*)"/g;

    sanitized = sanitized.replace(
      truncatedElementWithoutQuotePattern,
      (match, closingBraceComma, whitespace1, firstWord, whitespace2, secondWord) => {
        const closingBraceCommaStr = typeof closingBraceComma === "string" ? closingBraceComma : "";
        const whitespace1Str = typeof whitespace1 === "string" ? whitespace1 : "";
        const firstWordStr = typeof firstWord === "string" ? firstWord : "";
        const whitespace2Str = typeof whitespace2 === "string" ? whitespace2 : "";
        const secondWordStr = typeof secondWord === "string" ? secondWord : "";

        // Check array context (reuse similar logic as above)
        const matchIndex = sanitized.indexOf(match);
        if (matchIndex > 0) {
          const beforeMatch = sanitized.substring(Math.max(0, matchIndex - 500), matchIndex);

          let openBraces = 0;
          let openBrackets = 0;
          let inString = false;
          let escapeNext = false;
          let foundArrayOpening = false;

          for (let i = beforeMatch.length - 1; i >= 0; i--) {
            const char = beforeMatch[i];
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
              if (char === "}") openBraces++;
              else if (char === "{") openBraces--;
              else if (char === "]") openBrackets++;
              else if (char === "[") {
                openBrackets--;
                if (openBrackets === 0 && openBraces === 0) {
                  foundArrayOpening = true;
                  break;
                }
              }
            }
          }

          if (foundArrayOpening || (openBrackets > 0 && openBraces === 0)) {
            // The first word is likely the truncated property value (method name)
            // The second word is the next property name
            diagnostics.push(
              `Fixed truncated array element: inserted { and "name": before "${firstWordStr}"`,
            );

            const indentation = whitespace1Str;
            const propertyIndentation = indentation + "  ";

            return `${closingBraceCommaStr}\n${indentation}{\n${propertyIndentation}"name": "${firstWordStr}",\n${whitespace2Str}"${secondWordStr}"`;
          }
        }

        return match;
      },
    );

    // Determine if changes were made by comparing content
    const actuallyChanged = sanitized !== jsonString;

    return {
      content: sanitized,
      changed: actuallyChanged,
      description: actuallyChanged ? SANITIZATION_STEP.FIXED_TRUNCATED_ARRAY_ELEMENTS : undefined,
      diagnostics: diagnostics.length > 0 ? diagnostics : undefined,
    };
  } catch (error) {
    // If sanitization fails, return the original string
    console.warn(`fixTruncatedArrayElements sanitizer failed: ${String(error)}`);
    return {
      content: jsonString,
      changed: false,
      description: undefined,
      diagnostics: [`Sanitizer failed: ${String(error)}`],
    };
  }
};
