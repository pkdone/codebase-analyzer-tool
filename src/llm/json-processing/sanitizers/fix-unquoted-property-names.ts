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
 * The sanitizer is state-aware and tracks whether it's inside a string literal
 * to avoid corrupting valid JSON content within strings.
 */
export const fixUnquotedPropertyNames: Sanitizer = (jsonString: string): SanitizerResult => {
  try {
    // Helper to determine if a position is inside a string literal
    function isInStringAt(position: number): boolean {
      let inString = false;
      let escaped = false;

      for (let i = 0; i < position; i++) {
        const char = jsonString[i];

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

    // Regex pattern to match unquoted property names
    const unquotedPropertyPattern = /(\s*)([a-zA-Z_$][a-zA-Z0-9_$.-]*)\s*:/g;

    let sanitized = jsonString;
    let hasChanges = false;
    const diagnostics: string[] = [];

    // Replace unquoted property names with quoted ones, skipping those inside strings
    sanitized = jsonString.replace(
      unquotedPropertyPattern,
      (match, whitespace, propertyName, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;

        // Check if already quoted
        if (numericOffset > 0 && jsonString[numericOffset - 1] === DELIMITERS.DOUBLE_QUOTE) {
          return match; // Keep as is
        }

        // Check if we're inside a string literal
        if (isInStringAt(numericOffset)) {
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
