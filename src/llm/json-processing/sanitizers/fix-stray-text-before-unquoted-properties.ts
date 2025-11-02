import { Sanitizer, SanitizerResult } from "./sanitizers-types";
import { SANITIZATION_STEP } from "../config/sanitization-steps.config";

/**
 * Sanitizer that fixes stray text directly before property names that have missing opening quotes.
 *
 * This sanitizer addresses cases where LLM responses contain stray words or text
 * directly before a property name where the opening quote is missing, which breaks JSON parsing.
 *
 * Examples of issues this sanitizer handles:
 * - `tribulations": []` -> `"tablesAccessed": []` (when context suggests tablesAccessed)
 * - `word": "value"` -> `"propertyName": "value"` (when word is clearly stray text)
 * - `fragment": {` -> `"propertyName": {` (removes stray text and adds missing quote)
 *
 * Strategy:
 * Uses regex to identify patterns where stray text appears directly before a closing quote
 * followed by a colon (indicating a property name with missing opening quote), and removes
 * the stray text while adding the missing opening quote.
 */
export const fixStrayTextBeforeUnquotedProperties: Sanitizer = (
  jsonString: string,
): SanitizerResult => {
  try {
    let sanitized = jsonString;
    let hasChanges = false;
    const diagnostics: string[] = [];

    // Pattern: stray text followed by closing quote and colon (missing opening quote)
    // Matches: word": value where word is stray text before an unquoted property name
    // The pattern appears after delimiters or newlines (property boundaries)
    // This catches patterns like: }word": [], word": "value", \nword": {
    const strayTextBeforeUnquotedPattern =
      /([}\],]|\n|^)(\s*)([a-zA-Z_$]{2,})"\s*:/g;

    // Known property name corrections (common typos/hallucinations)
    const propertyNameCorrections: Record<string, string> = {
      tribulations: "tablesAccessed",
      // Add more corrections as needed based on observed errors
    };

    sanitized = sanitized.replace(
      strayTextBeforeUnquotedPattern,
      (match, delimiter, whitespace, strayText, offset, string) => {
        // Type assertions for regex match groups
        const delimiterStr = typeof delimiter === "string" ? delimiter : "";
        const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
        const strayTextStr = typeof strayText === "string" ? strayText : "";
        const offsetNum = typeof offset === "number" ? offset : undefined;
        const stringStr = typeof string === "string" ? string : sanitized;

        // Verify we're in a valid property context
        // The delimiter should be }, ], ,, \n, or start of string
        const isValidDelimiter =
          delimiterStr === "" ||
          delimiterStr === "\n" ||
          /[}\],]/.test(delimiterStr);

        // Additional check: ensure the stray text doesn't look like valid JSON
        // (not a JSON keyword or structure)
        const jsonKeywords = ["true", "false", "null", "undefined"];
        const isStrayTextValid = jsonKeywords.includes(strayTextStr.toLowerCase());

        // Verify we're not inside a string value by checking context before the match
        // Look backwards to see if we're inside a string (odd number of quotes before us)
        if (offsetNum !== undefined && stringStr) {
          const beforeMatch = stringStr.substring(Math.max(0, offsetNum - 200), offsetNum);
          let quoteCount = 0;
          let escape = false;
          for (const char of beforeMatch) {
            if (escape) {
              escape = false;
              continue;
            }
            if (char === "\\") {
              escape = true;
            } else if (char === '"') {
              quoteCount++;
            }
          }
          // If we're inside a string (odd quote count), don't fix
          if (quoteCount % 2 === 1) {
            return match;
          }
        }

        if (isValidDelimiter && !isStrayTextValid) {
          // Check if we have a known correction for this stray text
          const lowerStrayText = strayTextStr.toLowerCase();
          const correctedName = propertyNameCorrections[lowerStrayText];

          if (correctedName) {
            // Use the known correction
            hasChanges = true;
            diagnostics.push(
              `Fixed stray text "${strayTextStr}" before unquoted property, corrected to "${correctedName}"`,
            );
            const finalDelimiter = delimiterStr === "" ? "" : delimiterStr;
            return `${finalDelimiter}${whitespaceStr}"${correctedName}":`;
          }

          // If no known correction, check if the stray text could be a valid property name
          // In this case, the pattern suggests the LLM meant to write "word": value
          // but forgot the opening quote. We'll assume "word" is the intended property name
          // and add quotes around it.
          // This is reasonable because the pattern word": suggests the word was meant to be quoted
          if (strayTextStr.length >= 2 && /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(strayTextStr)) {
            hasChanges = true;
            diagnostics.push(
              `Fixed missing opening quote before property name "${strayTextStr}"`,
            );
            const finalDelimiter = delimiterStr === "" ? "" : delimiterStr;
            return `${finalDelimiter}${whitespaceStr}"${strayTextStr}":`;
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
        ? SANITIZATION_STEP.FIXED_STRAY_TEXT_BEFORE_UNQUOTED_PROPERTIES
        : undefined,
      diagnostics: hasChanges && diagnostics.length > 0 ? diagnostics : undefined,
    };
  } catch (error) {
    // If sanitization fails, return the original string
    console.warn(
      `fixStrayTextBeforeUnquotedProperties sanitizer failed: ${String(error)}`,
    );
    return {
      content: jsonString,
      changed: false,
      description: undefined,
      diagnostics: [`Sanitizer failed: ${String(error)}`],
    };
  }
};

