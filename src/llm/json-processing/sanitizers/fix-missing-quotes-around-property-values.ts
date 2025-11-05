import { Sanitizer, SanitizerResult } from "./sanitizers-types";
import { SANITIZATION_STEP } from "../config/sanitization-steps.config";

/**
 * Sanitizer that fixes missing quotes around property values in JSON responses.
 *
 * This sanitizer addresses cases where LLM responses contain property values
 * that are missing opening or closing quotes, creating invalid JSON syntax.
 *
 * Examples of issues this sanitizer handles:
 * - `"name":toBeCredited"` -> `"name": "toBeCredited"` (missing opening quote)
 * - `"name":toBeCredited,` -> `"name": "toBeCredited",` (missing quotes)
 * - `"name":toBeCredited}` -> `"name": "toBeCredited"}` (missing quotes)
 *
 * The sanitizer uses heuristics to identify likely unquoted values
 * and adds the missing quotes.
 */
export const fixMissingQuotesAroundPropertyValues: Sanitizer = (
  jsonString: string,
): SanitizerResult => {
  try {
    let sanitized = jsonString;
    let hasChanges = false;
    const diagnostics: string[] = [];

    // Pattern: Fix missing opening quote after colon
    // Matches: "propertyName":value" or "propertyName":value,
    // where value is an identifier (not already quoted and not a number/boolean/null)
    const missingOpeningQuotePattern = /"([a-zA-Z_$][a-zA-Z0-9_$]*)":\s*([a-zA-Z_$][a-zA-Z0-9_$]*)"([,}])/g;

    sanitized = sanitized.replace(
      missingOpeningQuotePattern,
      (match, propertyName, value, delimiter, offset, string) => {
        const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
        const valueStr = typeof value === "string" ? value : "";
        const delimiterStr = typeof delimiter === "string" ? delimiter : "";
        const offsetNum = typeof offset === "number" ? offset : undefined;
        const stringStr = typeof string === "string" ? string : sanitized;

        // Check if we're inside a string value (shouldn't be for property definitions)
        if (offsetNum !== undefined) {
          const beforeMatch = stringStr.substring(Math.max(0, offsetNum - 500), offsetNum);
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
          // If we're inside a string (odd quote count), skip it
          if (quoteCount % 2 === 1) {
            return match;
          }

          // Check if the value looks like a JSON keyword (true, false, null)
          const lowerValue = valueStr.toLowerCase();
          if (lowerValue === "true" || lowerValue === "false" || lowerValue === "null") {
            // These shouldn't be quoted in JSON
            return match;
          }

          // Check if the value looks like a number
          if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(valueStr)) {
            // This is a number, don't quote it
            return match;
          }

          // This looks like an unquoted string value, fix it
          hasChanges = true;
          diagnostics.push(
            `Fixed missing quotes around property value: "${propertyNameStr}":${valueStr}" -> "${propertyNameStr}": "${valueStr}"${delimiterStr}`,
          );
          return `"${propertyNameStr}": "${valueStr}"${delimiterStr}`;
        }

        return match;
      },
    );

    // Check if sanitization made changes
    hasChanges = sanitized !== jsonString;

    return {
      content: sanitized,
      changed: hasChanges,
      description: hasChanges
        ? SANITIZATION_STEP.FIXED_MISSING_QUOTES_AROUND_PROPERTY_VALUES
        : undefined,
      diagnostics: hasChanges ? diagnostics : undefined,
    };
  } catch (error) {
    // If sanitization fails, return the original string
    console.warn(
      `fixMissingQuotesAroundPropertyValues sanitizer failed: ${String(error)}`,
    );
    return {
      content: jsonString,
      changed: false,
      description: undefined,
      diagnostics: [`Sanitizer failed: ${String(error)}`],
    };
  }
};

