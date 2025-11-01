import { Sanitizer, SanitizerResult } from "./sanitizers-types";
import { SANITIZATION_STEP } from "../config/sanitization-steps.config";

/**
 * Sanitizer that fixes stray text directly concatenated before property names.
 *
 * This sanitizer addresses cases where LLM responses contain stray words or text
 * directly concatenated to the opening quote of a property name, which breaks JSON parsing.
 *
 * Examples of issues this sanitizer handles:
 * - `tribal"integrationPoints":` -> `"integrationPoints":`
 * - `word"propertyName":` -> `"propertyName":`
 * - `fragment"name":` -> `"name":`
 *
 * This is different from `removeStrayLinePrefixChars` which handles stray text
 * with whitespace between the text and the JSON token. This sanitizer handles
 * cases where the stray text is directly concatenated (no whitespace).
 *
 * Strategy:
 * Uses regex to identify patterns where a word (not valid JSON) appears directly
 * before a quoted property name, and removes the stray text while preserving
 * the proper property name format.
 */
export const fixStrayTextBeforePropertyNames: Sanitizer = (
  jsonString: string,
): SanitizerResult => {
  try {
    let sanitized = jsonString;
    let hasChanges = false;
    const diagnostics: string[] = [];

    // Pattern: word characters directly before a quoted property name
    // Matches: word"propertyName": where word is stray text and propertyName is valid
    // This pattern appears after object/array delimiters or newlines (property boundaries)
    // The stray word should be at least 2 characters (to avoid false positives with single chars)
    // and should not be a valid JSON keyword
    // Note: Match delimiters (}, ], ,, or \n) or start of string, followed by optional whitespace
    // then stray text directly concatenated to the quote
    // This catches patterns like: }word"property":, \nword"property":, or \n    word"property":
    const strayTextPattern =
      /([}\],]|\n|^)(\s*)([a-zA-Z_$]{2,})"([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:/g;

    sanitized = sanitized.replace(
      strayTextPattern,
      (match, delimiter, whitespace, strayText, propertyName, offset, string) => {
        // Type assertions for regex match groups
        const delimiterStr = typeof delimiter === "string" ? delimiter : "";
        const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
        const strayTextStr = typeof strayText === "string" ? strayText : "";
        const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
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
          hasChanges = true;
          diagnostics.push(`Removed stray text "${strayTextStr}" before property "${propertyNameStr}"`);
          // Preserve delimiter and whitespace
          const finalDelimiter = delimiterStr === "" ? "" : delimiterStr;
          return `${finalDelimiter}${whitespaceStr}"${propertyNameStr}":`;
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
        ? SANITIZATION_STEP.FIXED_STRAY_TEXT_BEFORE_PROPERTY_NAMES
        : undefined,
      diagnostics: hasChanges && diagnostics.length > 0 ? diagnostics : undefined,
    };
  } catch (error) {
    // If sanitization fails, return the original string
    console.warn(`fixStrayTextBeforePropertyNames sanitizer failed: ${String(error)}`);
    return {
      content: jsonString,
      changed: false,
      description: undefined,
      diagnostics: [`Sanitizer failed: ${String(error)}`],
    };
  }
};

