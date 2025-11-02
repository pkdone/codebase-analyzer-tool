import { Sanitizer, SanitizerResult } from "./sanitizers-types";
import { DELIMITERS } from "../config/json-processing.config";

/**
 * Sanitizer that fixes unquoted property names in JSON responses.
 *
 * This sanitizer addresses cases where LLM responses contain property names
 * without double quotes, which is invalid JSON syntax. For example:
 * - Invalid: {name: "value", unquotedProp: "value"}
 * - Fixed: {"name": "value", "unquotedProp": "value"}
 *
 * It also handles property names with missing opening quotes:
 * - Invalid: {description": "value"}
 * - Fixed: {"description": "value"}
 *
 * The sanitizer is state-aware and tracks whether it's inside a string literal
 * to avoid corrupting valid JSON content within strings.
 */
export const fixUnquotedPropertyNames: Sanitizer = (jsonString: string): SanitizerResult => {
  try {
    // Helper to determine if a position is inside a string literal
    function isInStringAt(position: number, content: string): boolean {
      let inString = false;
      let escaped = false;

      for (let i = 0; i < position; i++) {
        const char = content[i];

        if (escaped) {
          escaped = false;
          continue;
        }

        if (char === "\\") {
          escaped = true;
        } else if (char === '"') {
          inString = !inString;
        }
      }

      return inString;
    }

    let sanitized = jsonString;
    let hasChanges = false;
    const diagnostics: string[] = [];

    // First pass: Fix property names with missing opening quotes (e.g., description":)
    // This pattern matches: propertyName": (where opening quote is missing)
    // We need to run this in a loop because after fixing one, positions may shift
    let previousSanitized = "";
    while (previousSanitized !== sanitized) {
      previousSanitized = sanitized;
      const missingOpeningQuotePattern = /(\s*)([a-zA-Z_$][a-zA-Z0-9_$.-]*)"\s*:/g;
      
      sanitized = sanitized.replace(
        missingOpeningQuotePattern,
        (match, whitespace, propertyName, offset: unknown) => {
          const numericOffset = typeof offset === "number" ? offset : 0;

          // Check if we're inside a string literal (check current sanitized string)
          if (isInStringAt(numericOffset, sanitized)) {
            return match; // Keep as is - inside a string
          }

          // Check if there's already an opening quote before the property name
          if (numericOffset > 0 && sanitized[numericOffset - 1] === DELIMITERS.DOUBLE_QUOTE) {
            return match; // Keep as is - already properly quoted
          }

          hasChanges = true;
          diagnostics.push(`Fixed property name with missing opening quote: ${propertyName as string}"`);
          return `${whitespace}"${propertyName as string}":`;
        },
      );
    }

    // Second pass: Fix completely unquoted property names (e.g., name:)
    const unquotedPropertyPattern = /(\s*)([a-zA-Z_$][a-zA-Z0-9_$.-]*)\s*:/g;

    sanitized = sanitized.replace(
      unquotedPropertyPattern,
      (match, whitespace, propertyName, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;

        // Check if already quoted (now checking sanitized string)
        if (numericOffset > 0 && sanitized[numericOffset - 1] === DELIMITERS.DOUBLE_QUOTE) {
          return match; // Keep as is
        }

        // Check if we're inside a string literal
        if (isInStringAt(numericOffset, sanitized)) {
          return match; // Keep as is - inside a string
        }

        hasChanges = true;
        diagnostics.push(`Fixed unquoted property name: ${propertyName as string}`);
        return `${whitespace}"${propertyName as string}":`;
      },
    );

    // Ensure hasChanges reflects actual changes
    hasChanges = sanitized !== jsonString;

    return {
      content: sanitized,
      changed: hasChanges,
      description: hasChanges ? "Fixed unquoted property names" : undefined,
      diagnostics: hasChanges && diagnostics.length > 0 ? diagnostics : undefined,
    };
  } catch (error) {
    // If sanitization fails, return the original string
    console.warn(`fixUnquotedPropertyNames sanitizer failed: ${String(error)}`);
    return {
      content: jsonString,
      changed: false,
      description: undefined,
      diagnostics: [`Sanitizer failed: ${String(error)}`],
    };
  }
};
