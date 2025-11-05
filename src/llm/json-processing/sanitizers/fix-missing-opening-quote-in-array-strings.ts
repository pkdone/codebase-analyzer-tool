import { Sanitizer, SanitizerResult } from "./sanitizers-types";

/**
 * Sanitizer that fixes missing opening quotes in array string values.
 *
 * This sanitizer addresses cases where LLM responses contain array elements
 * where the opening quote of a string value is missing, which breaks JSON parsing.
 *
 * Examples of issues this sanitizer handles:
 * - `fineract.infrastructure...",` -> `"org.apache.fineract.infrastructure...",`
 * - `[word",` -> `["word",` (in array context)
 * - `org.example.Class",` -> `"org.example.Class",` (in array context)
 *
 * Strategy:
 * Detects patterns where after a comma or opening bracket in an array context,
 * there's a word-like pattern (usually starting with a letter) followed by a closing quote
 * and comma, indicating a missing opening quote. Adds the missing opening quote.
 */
export const fixMissingOpeningQuoteInArrayStrings: Sanitizer = (
  jsonString: string,
): SanitizerResult => {
  try {
    let sanitized = jsonString;
    let hasChanges = false;
    const diagnostics: string[] = [];

    // Pattern: Missing opening quote in array string values
    // Matches: ,wordWithDotsAndLetters", or [wordWithDotsAndLetters", or \n    wordWithDotsAndLetters",
    // This pattern handles three cases:
    // Case 1: After comma or bracket: ,word" or [word"
    // Case 2: After newline (following ", on previous line): \n    word"
    // Case 3: After newline with whitespace (missing quote on new line): \n    word"
    const missingOpeningQuotePattern1 = /((?:,|\[))\s*\n?(\s*)([a-zA-Z_$][a-zA-Z0-9_$.]+)"\s*,/g;
    const missingOpeningQuotePattern2 = /"\s*,\s*\n(\s*)([a-zA-Z_$][a-zA-Z0-9_$.]+)"\s*,/g;
    // Pattern 3: Handles cases where a newline appears with whitespace and a word-like pattern followed by quote and comma
    // This catches cases like: \n    fineract.portfolio...", (missing opening quote)
    const missingOpeningQuotePattern3 = /\n(\s+)([a-zA-Z_$][a-zA-Z0-9_$.]+)"\s*,/g;

    // Helper function to check if we're in an array context (not in an object)
    function isInArrayContext(matchIndex: number, content: string): boolean {
      const beforeMatch = content.substring(Math.max(0, matchIndex - 500), matchIndex);

      // Count braces and brackets to determine if we're in an array of strings
      let openBraces = 0;
      let openBrackets = 0;
      let inString = false;
      let escapeNext = false;
      let foundOpeningBracket = false;

      // Scan backwards to find context
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
          if (char === "{") {
            openBraces++;
            // If we've balanced braces and found a bracket, we might be in an array
            if (openBraces === 0 && openBrackets > 0 && foundOpeningBracket) {
              break;
            }
          } else if (char === "}") {
            openBraces--;
          } else if (char === "[") {
            openBrackets++;
            foundOpeningBracket = true;
            // If braces are balanced or negative at this point, we're in an array context
            if (openBraces <= 0) {
              break;
            }
          } else if (char === "]") {
            openBrackets--;
          }
        }
      }

      // We're in an array context if we found an opening bracket and we're not inside an object
      return foundOpeningBracket && openBraces <= 0;
    }

    // Process matches in a loop, re-running the regex after each fix to handle position shifts
    let previousSanitized = "";
    while (previousSanitized !== sanitized) {
      previousSanitized = sanitized;
      let foundMatch = false;

      // Try pattern 1: after comma or bracket
      const regex1 = new RegExp(missingOpeningQuotePattern1);
      let match1;
      while ((match1 = regex1.exec(sanitized)) !== null) {
        const matchIndex = match1.index;
        const delimiter = match1[1] || "";
        const whitespace = match1[2] || "";
        const unquotedValue = match1[3] || "";

        // Check if we're in an array context
        const isLikelyArrayContext = isInArrayContext(matchIndex, sanitized);

        if (isLikelyArrayContext) {
          // Check if this looks like it should be a string value (not a number or keyword)
          const jsonKeywords = ["true", "false", "null", "undefined"];
          const isKeyword = jsonKeywords.includes(unquotedValue.toLowerCase());

          // Skip if it's a JSON keyword (these are valid unquoted)
          if (!isKeyword) {
            hasChanges = true;
            foundMatch = true;

            diagnostics.push(
              `Fixed missing opening quote in array string: ${unquotedValue}" -> "${unquotedValue}"`,
            );

            // Reconstruct the fixed pattern
            const matchText = match1[0];
            const replacement = `${delimiter}${whitespace}\n${whitespace}"${unquotedValue}",`;
            sanitized =
              sanitized.substring(0, matchIndex) +
              replacement +
              sanitized.substring(matchIndex + matchText.length);
            break; // Break out to re-run regex on the updated string
          }
        }
      }

      // Try pattern 2: after newline following ",
      if (!foundMatch) {
        const regex2 = new RegExp(missingOpeningQuotePattern2);
        let match2;
        while ((match2 = regex2.exec(sanitized)) !== null) {
          const matchIndex = match2.index;
          const whitespace = match2[1] || "";
          const unquotedValue = match2[2] || "";

          // Check if we're in an array context
          const isLikelyArrayContext = isInArrayContext(matchIndex, sanitized);

          if (isLikelyArrayContext) {
            // Check if this looks like it should be a string value (not a number or keyword)
            const jsonKeywords = ["true", "false", "null", "undefined"];
            const isKeyword = jsonKeywords.includes(unquotedValue.toLowerCase());

            // Skip if it's a JSON keyword (these are valid unquoted)
            if (!isKeyword) {
              hasChanges = true;
              foundMatch = true;

              diagnostics.push(
                `Fixed missing opening quote in array string: ${unquotedValue}" -> "${unquotedValue}"`,
              );

              // Reconstruct the fixed pattern
              const matchText = match2[0];
              const replacement = `",\n${whitespace}"${unquotedValue}",`;
              sanitized =
                sanitized.substring(0, matchIndex) +
                replacement +
                sanitized.substring(matchIndex + matchText.length);
              break; // Break out to re-run regex on the updated string
            }
          }
        }
      }

      // Try pattern 3: after newline with whitespace (missing quote on new line)
      if (!foundMatch) {
        const regex3 = new RegExp(missingOpeningQuotePattern3);
        let match3;
        while ((match3 = regex3.exec(sanitized)) !== null) {
          const matchIndex = match3.index;
          const whitespace = match3[1] || "";
          const unquotedValue = match3[2] || "";

          // Check if we're in an array context
          const isLikelyArrayContext = isInArrayContext(matchIndex, sanitized);

          if (isLikelyArrayContext) {
            // Check if this looks like it should be a string value (not a number or keyword)
            const jsonKeywords = ["true", "false", "null", "undefined"];
            const isKeyword = jsonKeywords.includes(unquotedValue.toLowerCase());

            // Skip if it's a JSON keyword (these are valid unquoted)
            if (!isKeyword) {
              hasChanges = true;
              foundMatch = true;

              diagnostics.push(
                `Fixed missing opening quote in array string: ${unquotedValue}" -> "${unquotedValue}"`,
              );

              // Reconstruct the fixed pattern
              const matchText = match3[0];
              const replacement = `\n${whitespace}"${unquotedValue}",`;
              sanitized =
                sanitized.substring(0, matchIndex) +
                replacement +
                sanitized.substring(matchIndex + matchText.length);
              break; // Break out to re-run regex on the updated string
            }
          }
        }
      }

      // If no match found, break out of the loop
      if (!foundMatch) {
        break;
      }
    }

    // Ensure hasChanges reflects actual changes
    hasChanges = sanitized !== jsonString;

    return {
      content: sanitized,
      changed: hasChanges,
      description: hasChanges ? "Fixed missing opening quotes in array string values" : undefined,
      diagnostics: hasChanges && diagnostics.length > 0 ? diagnostics : undefined,
    };
  } catch (error) {
    // If sanitization fails, return the original string
    console.warn(`fixMissingOpeningQuoteInArrayStrings sanitizer failed: ${String(error)}`);
    return {
      content: jsonString,
      changed: false,
      description: undefined,
      diagnostics: [`Sanitizer failed: ${String(error)}`],
    };
  }
};
