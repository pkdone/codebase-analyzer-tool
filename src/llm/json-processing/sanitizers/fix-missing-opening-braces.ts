import { Sanitizer, SanitizerResult } from "./sanitizers-types";

/**
 * Sanitizer that fixes missing opening braces when a previous object closes with },
 * but the next object property starts without an opening brace.
 *
 * This sanitizer addresses cases where LLM responses omit opening braces when
 * starting new objects in arrays, which breaks JSON parsing.
 *
 * Examples of issues this sanitizer handles:
 * - `"codeSmells": []\n  },\ne"name":` -> `"codeSmells": []\n  },\n  {\n  "name":`
 * - `"items": [1, 2]\n  },\n  "next":` -> `"items": [1, 2]\n  },\n  {\n  "next":`
 *
 * Strategy:
 * Detects patterns where an object closes with `},` followed by newline and then
 * a property-like pattern, and inserts the missing opening brace `{`.
 */
export const fixMissingOpeningBraces: Sanitizer = (jsonString: string): SanitizerResult => {
  try {
    let sanitized = jsonString;
    let hasChanges = false;
    const diagnostics: string[] = [];

    // Pattern: closing brace + comma, followed by newline + whitespace, then property-like pattern
    // The property pattern can be:
    // - Quoted property name: "propertyName"
    // - Truncated property pattern: e", n", etc. followed by value
    // This matches cases like: },\ne"value", or },\n  "property":
    const missingOpeningBracePattern = /(\}\s*,)\s*\n(\s*)([a-zA-Z]{1,3}?"[a-zA-Z_$][a-zA-Z0-9_$]*"(?:\s*:|\s*,|")|[a-zA-Z]{1,3}"[^"]+")/g;

    sanitized = sanitized.replace(
      missingOpeningBracePattern,
      (match, closingBraceComma, whitespace, propertyPattern) => {
        const closingBraceCommaStr = typeof closingBraceComma === "string" ? closingBraceComma : "";
        const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
        const propertyPatternStr = typeof propertyPattern === "string" ? propertyPattern : "";

        // Check if this looks like we're inside an array and need to open a new object
        // We need to verify that the previous context suggests we're in an array of objects
        const matchIndex = sanitized.indexOf(match);
        if (matchIndex > 0) {
          const beforeMatch = sanitized.substring(Math.max(0, matchIndex - 200), matchIndex);
          
          // Check if we're in an array context (looking for [ before the closing brace)
          // Count brackets and braces to determine if we're inside an array
          let openBraces = 0;
          let openBrackets = 0;
          let inStringCheck = false;
          let escapeCheck = false;

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
              if (char === "{") openBraces++;
              else if (char === "}") openBraces--;
              else if (char === "[") {
                openBrackets++;
                // If we find [ and we have balanced braces, we're likely in an array
                if (openBraces === 0 && openBrackets > 0) {
                  hasChanges = true;
                  diagnostics.push("Inserted missing opening brace for new object in array");
                  return `${closingBraceCommaStr}\n${whitespaceStr}{\n${whitespaceStr}  ${propertyPatternStr}`;
                }
              } else if (char === "]") openBrackets--;
            }
          }
        }

        return match;
      },
    );

    // Ensure hasChanges reflects actual changes
    hasChanges = sanitized !== jsonString;

    return {
      content: sanitized,
      changed: hasChanges,
      description: hasChanges
        ? "Fixed missing opening braces for new objects in arrays"
        : undefined,
      diagnostics: hasChanges && diagnostics.length > 0 ? diagnostics : undefined,
    };
  } catch (error) {
    // If sanitization fails, return the original string
    console.warn(`fixMissingOpeningBraces sanitizer failed: ${String(error)}`);
    return {
      content: jsonString,
      changed: false,
      description: undefined,
      diagnostics: [`Sanitizer failed: ${String(error)}`],
    };
  }
};

