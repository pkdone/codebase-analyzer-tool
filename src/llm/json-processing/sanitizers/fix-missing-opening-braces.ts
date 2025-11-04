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
 * - `"codeSmells": []\n  },\n  "name": "methodName",` -> `"codeSmells": []\n  },\n  {\n    "name": "methodName",`
 * - `"codeSmells": []\n  },\n  "name": "value",` -> `"codeSmells": []\n  },\n  {\n    "name": "value",`
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
    // - Fully-quoted property name: "propertyName": or "propertyName", or "propertyName": "value",
    // - Truncated property pattern: e", n", etc. followed by value
    // This matches cases like: },\n  "name": "value", or },\ne"value", or },\n  "property":
    const missingOpeningBracePattern =
      /(\}\s*,)\s*\n(\s*)([a-zA-Z]{1,3}?"[a-zA-Z_$][a-zA-Z0-9_$]*"(?:\s*:|\s*,|")|[a-zA-Z]{1,3}"[^"]+"|"[a-zA-Z_$][a-zA-Z0-9_$]*"(?:\s*:(?:\s*"[^"]*")?\s*,?)?)/g;

    // Use matchAll to get all matches with their positions
    const matches: { match: RegExpMatchArray; index: number }[] = [];
    let match;
    const regex = new RegExp(missingOpeningBracePattern);
    while ((match = regex.exec(sanitized)) !== null) {
      matches.push({ match, index: match.index });
    }

    // Process matches in reverse order to avoid position shifts
    for (let i = matches.length - 1; i >= 0; i--) {
      const { match: matchResult, index: matchIndex } = matches[i];
      const closingBraceComma = matchResult[1] || "";
      const whitespace = matchResult[2] || "";
      const propertyPattern = matchResult[3] || "";

      // Check if we're in an array context by looking backwards from the match position
      const beforeMatch = sanitized.substring(0, matchIndex);

      // Count brackets and braces to determine if we're inside an array
      // Use a simpler approach: track depth going backwards
      let braceDepth = 0; // Positive = inside object, 0 = outside
      let bracketDepth = 0; // Positive = inside array, 0 = outside
      let inStringCheck = false;
      let escapeCheck = false;
      let inArrayContext = false;
      let braceDepthAtArrayStart = 0;
      let arrayStartPosition = -1;

      for (let j = beforeMatch.length - 1; j >= 0; j--) {
        const char = beforeMatch[j];
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
          // When iterating backwards:
          // - } means entering an object (going backwards), so increment depth
          // - { means leaving an object (going backwards), so decrement depth
          // - ] means entering an array (going backwards), so increment depth
          // - [ means leaving an array (going backwards), so decrement depth
          if (char === "}") {
            braceDepth++;
          } else if (char === "{") {
            braceDepth--;
          } else if (char === "]") {
            bracketDepth++;
          } else if (char === "[") {
            bracketDepth--;
            // If we find [ and depths are balanced (0 or negative means we're outside those structures),
            // we found a candidate array. We need to verify it's actually an array of objects.
            // When scanning backwards, negative depths mean we've left those structures.
            if (braceDepth <= 0 && bracketDepth <= 0) {
              // We found a candidate array. Continue scanning to find the outermost one.
              // We'll verify it's an array of objects by checking if there's content after [
              // that suggests array elements (not just empty or primitive values)
              const afterArrayStart = sanitized.substring(j, Math.min(j + 100, matchIndex));
              // Check if there's a { in the content after [ (within reasonable distance)
              // This indicates it's likely an array of objects
              if (afterArrayStart.includes("{")) {
                // Only set inArrayContext if we haven't found one yet, or if this one is better
                // (further back, meaning it's the outer array)
                if (!inArrayContext || j < arrayStartPosition) {
                  inArrayContext = true;
                  arrayStartPosition = j;
                  braceDepthAtArrayStart = braceDepth;
                }
                // Don't break - continue to find the outermost array
              }
            }
          }
        }
      }

      // Check if we're in an array context
      // Also verify that the property pattern looks like a property (has : or is followed by ,)
      // This helps avoid false positives when the pattern matches quoted string values
      // Additionally, verify that we were at brace depth <= 0 when we found the array
      // (meaning we're at the array level, not inside a nested object)
      // When scanning backwards, negative depths mean we're outside those structures
      const looksLikeProperty = propertyPattern.includes(":") || propertyPattern.endsWith(",");
      if (inArrayContext && looksLikeProperty && braceDepthAtArrayStart <= 0) {
        const matchText = matchResult[0];
        const replacement = `${closingBraceComma}\n${whitespace}{\n${whitespace}  ${propertyPattern}`;
        sanitized = sanitized.substring(0, matchIndex) + replacement + sanitized.substring(matchIndex + matchText.length);
        hasChanges = true;
        diagnostics.push("Inserted missing opening brace for new object in array");
      }
    }

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
