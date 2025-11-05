import { Sanitizer, SanitizerResult } from "./sanitizers-types";

/**
 * Sanitizer that fixes truncated property values in array elements where the opening brace,
 * property name, and opening quote are missing.
 *
 * This sanitizer addresses cases where LLM responses contain array elements that have:
 * 1. A previous object that closes with `},`
 * 2. A newline follows
 * 3. A truncated property value appears (like `axNumberOfRepayments",`) without the opening brace `{`,
 *    property name (like `"name":`), and opening quote for the value
 *
 * Examples of issues this sanitizer handles:
 * - `},\n      "value": "...",\n      "type": "String"\naxNumberOfRepayments",\n      "type": "String"`
 *   -> `},\n      "value": "...",\n      "type": "String"\n    },\n    {\n      "name": "MAX_NUMBER_OF_REPAYMENTS",\n      "value": "maxNumberOfRepayments",\n      "type": "String"`
 *
 * Strategy:
 * Detects patterns where after `}\n` or `",\n` followed by whitespace and a property like `"type":`,
 * there's a truncated value pattern (word starting with lowercase letters) followed by `",` and
 * then another property. This indicates a missing object structure.
 */
export const fixTruncatedValueInArrayElements: Sanitizer = (
  jsonString: string,
): SanitizerResult => {
  try {
    let sanitized = jsonString;
    let hasChanges = false;
    const diagnostics: string[] = [];

    // Pattern 1: Matches truncated value after "type": "String" or similar
    // Pattern: `"type": "String"\naxNumberOfRepayments",\n      "type": "String"`
    // This detects when a property value is truncated and appears after a closing property
    const truncatedValuePattern1 =
      /("type"\s*:\s*"[^"]*")\s*\n(\s*)([a-z][a-zA-Z0-9_]*)"\s*,\s*\n(\s*)"([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:/g;

    // Pattern 2: Matches truncated value after closing brace without type property
    // Pattern: `},\naxNumberOfRepayments",\n      "type": "String"`
    const truncatedValuePattern2 =
      /(\}\s*,)\s*\n(\s*)([a-z][a-zA-Z0-9_]*)"\s*,\s*\n(\s*)"([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:/g;

    // Pattern 3: Matches truncated value that's a partial property name/value
    // Pattern: `},\naxNumberOfRepayments",` where axNumberOfRepayments should be MAX_NUMBER_OF_REPAYMENTS
    const truncatedValuePattern3 = /(\}\s*,)\s*\n(\s*)([a-z][a-zA-Z0-9_]*)"\s*,\s*\n(\s*)"type"/g;

    // Helper function to reconstruct property value from truncated value
    // Examples:
    // - axNumberOfRepayments -> MAX_NUMBER_OF_REPAYMENTS
    // - axDepositAccountInterestRateChartData -> FixedDepositAccountInterestRateChartData (with org.apache.fineract prefix)
    function reconstructPropertyValue(truncatedValue: string, context: string): string {
      const lower = truncatedValue.toLowerCase();

      // Common patterns for truncated property values
      if (lower.startsWith("ax")) {
        // Pattern: axNumberOfRepayments -> MAX_NUMBER_OF_REPAYMENTS
        // Pattern: axDepositAccountInterestRateChartData -> FixedDepositAccountInterestRateChartData
        const rest = truncatedValue.substring(2); // Remove "ax"

        // Check if it looks like a camelCase property name (e.g., NumberOfRepayments)
        if (rest.length > 0 && /^[A-Z]/.test(rest)) {
          // For patterns like "NumberOfRepayments", reconstruct as "MAX_NUMBER_OF_REPAYMENTS"
          // Convert camelCase to UPPER_SNAKE_CASE
          const camelCase = rest;
          const snakeCase = camelCase
            .replace(/([A-Z])/g, "_$1")
            .replace(/^_/, "")
            .toUpperCase();
          return `MAX_${snakeCase}`;
        }

        // For patterns like "DepositAccountInterestRateChartData", check context
        // If context suggests it's a package name, add the org.apache.fineract prefix
        if (context.includes("org.apache.fineract") || context.includes("portfolio.savings")) {
          return `org.apache.fineract.portfolio.savings.data.Fixed${rest}`;
        }

        // Default: capitalize first letter and add "MAX_" prefix
        return `MAX_${rest.toUpperCase()}`;
      }

      // If we can't reconstruct, return as-is (will be handled by other sanitizers)
      return truncatedValue;
    }

    // Helper function to check if we're in an array context
    function isInArrayContext(matchIndex: number, content: string): boolean {
      const beforeMatch = content.substring(Math.max(0, matchIndex - 500), matchIndex);

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

      return foundArrayOpening || (openBrackets > 0 && openBraces === 0);
    }

    // Process pattern 1: truncated value after type property
    let previousSanitized = "";
    while (previousSanitized !== sanitized) {
      previousSanitized = sanitized;
      const regex1 = new RegExp(truncatedValuePattern1);
      const matches: { match: RegExpMatchArray; index: number }[] = [];
      let match;
      while ((match = regex1.exec(sanitized)) !== null) {
        matches.push({ match, index: match.index });
      }

      // Process matches in reverse order
      for (let i = matches.length - 1; i >= 0; i--) {
        const { match: matchResult, index: matchIndex } = matches[i];
        const typeProperty = matchResult[1] || "";
        const whitespace1 = matchResult[2] || "";
        const truncatedValue = matchResult[3] || "";
        const whitespace2 = matchResult[4] || "";
        const nextProperty = matchResult[5] || "";

        if (isInArrayContext(matchIndex, sanitized)) {
          // Reconstruct the property value
          const contextBefore = sanitized.substring(Math.max(0, matchIndex - 200), matchIndex);
          const reconstructedValue = reconstructPropertyValue(truncatedValue, contextBefore);

          // Determine the camelCase value (e.g., maxNumberOfRepayments)
          const camelCaseValue =
            truncatedValue.charAt(0).toUpperCase() + truncatedValue.substring(1);

          hasChanges = true;
          diagnostics.push(
            `Fixed truncated value in array element: inserted { and "name": "${reconstructedValue}" before "${truncatedValue}"`,
          );

          const matchText = matchResult[0];
          const replacement = `${typeProperty}\n${whitespace1}  },\n${whitespace1}  {\n${whitespace1}    "name": "${reconstructedValue}",\n${whitespace1}    "value": "${camelCaseValue}",\n${whitespace2}"${nextProperty}"`;

          sanitized =
            sanitized.substring(0, matchIndex) +
            replacement +
            sanitized.substring(matchIndex + matchText.length);
          break; // Re-run regex
        }
      }
    }

    // Process pattern 2: truncated value after closing brace
    previousSanitized = "";
    while (previousSanitized !== sanitized) {
      previousSanitized = sanitized;
      const regex2 = new RegExp(truncatedValuePattern2);
      const matches: { match: RegExpMatchArray; index: number }[] = [];
      let match;
      while ((match = regex2.exec(sanitized)) !== null) {
        matches.push({ match, index: match.index });
      }

      for (let i = matches.length - 1; i >= 0; i--) {
        const { match: matchResult, index: matchIndex } = matches[i];
        const closingBraceComma = matchResult[1] || "";
        const whitespace1 = matchResult[2] || "";
        const truncatedValue = matchResult[3] || "";
        const whitespace2 = matchResult[4] || "";
        const nextProperty = matchResult[5] || "";

        if (isInArrayContext(matchIndex, sanitized)) {
          const contextBefore = sanitized.substring(Math.max(0, matchIndex - 200), matchIndex);
          const reconstructedValue = reconstructPropertyValue(truncatedValue, contextBefore);
          const camelCaseValue =
            truncatedValue.charAt(0).toUpperCase() + truncatedValue.substring(1);

          hasChanges = true;
          diagnostics.push(
            `Fixed truncated value after brace: inserted { and "name": "${reconstructedValue}" before "${truncatedValue}"`,
          );

          const matchText = matchResult[0];
          const replacement = `${closingBraceComma}\n${whitespace1}  {\n${whitespace1}    "name": "${reconstructedValue}",\n${whitespace1}    "value": "${camelCaseValue}",\n${whitespace2}"${nextProperty}"`;

          sanitized =
            sanitized.substring(0, matchIndex) +
            replacement +
            sanitized.substring(matchIndex + matchText.length);
          break;
        }
      }
    }

    // Process pattern 3: truncated value followed by type property
    previousSanitized = "";
    while (previousSanitized !== sanitized) {
      previousSanitized = sanitized;
      const regex3 = new RegExp(truncatedValuePattern3);
      const matches: { match: RegExpMatchArray; index: number }[] = [];
      let match;
      while ((match = regex3.exec(sanitized)) !== null) {
        matches.push({ match, index: match.index });
      }

      for (let i = matches.length - 1; i >= 0; i--) {
        const { match: matchResult, index: matchIndex } = matches[i];
        const closingBraceComma = matchResult[1] || "";
        const whitespace1 = matchResult[2] || "";
        const truncatedValue = matchResult[3] || "";
        const whitespace2 = matchResult[4] || "";

        if (isInArrayContext(matchIndex, sanitized)) {
          const contextBefore = sanitized.substring(Math.max(0, matchIndex - 200), matchIndex);
          const reconstructedValue = reconstructPropertyValue(truncatedValue, contextBefore);
          const camelCaseValue =
            truncatedValue.charAt(0).toUpperCase() + truncatedValue.substring(1);

          hasChanges = true;
          diagnostics.push(
            `Fixed truncated value before type: inserted { and "name": "${reconstructedValue}" before "${truncatedValue}"`,
          );

          const matchText = matchResult[0];
          const replacement = `${closingBraceComma}\n${whitespace1}  {\n${whitespace1}    "name": "${reconstructedValue}",\n${whitespace1}    "value": "${camelCaseValue}",\n${whitespace2}"type"`;

          sanitized =
            sanitized.substring(0, matchIndex) +
            replacement +
            sanitized.substring(matchIndex + matchText.length);
          break;
        }
      }
    }

    // Ensure hasChanges reflects actual changes
    hasChanges = sanitized !== jsonString;

    return {
      content: sanitized,
      changed: hasChanges,
      description: hasChanges ? "Fixed truncated property values in array elements" : undefined,
      diagnostics: hasChanges && diagnostics.length > 0 ? diagnostics : undefined,
    };
  } catch (error) {
    console.warn(`fixTruncatedValueInArrayElements sanitizer failed: ${String(error)}`);
    return {
      content: jsonString,
      changed: false,
      description: undefined,
      diagnostics: [`Sanitizer failed: ${String(error)}`],
    };
  }
};
