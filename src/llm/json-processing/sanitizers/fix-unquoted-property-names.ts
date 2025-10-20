import { Sanitizer, SanitizerResult } from "./sanitizers-types";

/**
 * Sanitizer that fixes unquoted property names in JSON responses.
 *
 * This sanitizer addresses cases where LLM responses contain property names
 * without double quotes, which is invalid JSON syntax. For example:
 * - Invalid: {name: "value", unquotedProp: "value"}
 * - Fixed: {"name": "value", "unquotedProp": "value"}
 *
 * The sanitizer uses regex to identify property names that are not quoted
 * and adds the necessary double quotes around them.
 */
export const fixUnquotedPropertyNames: Sanitizer = (jsonString: string): SanitizerResult => {
  try {
    // Regex pattern to match unquoted property names
    // This matches: word characters, underscores, dots, and dashes that are not already quoted
    // and are followed by a colon
    const unquotedPropertyPattern = /(\s*)([a-zA-Z_$][a-zA-Z0-9_$.-]*)\s*:/g;

    let sanitized = jsonString;
    let hasChanges = false;
    const diagnostics: string[] = [];

    // Replace unquoted property names with quoted ones
    const originalSanitized = sanitized;
    sanitized = sanitized.replace(
      unquotedPropertyPattern,
      (match, whitespace, propertyName, offset) => {
        // Simple check: if the character before the property name is a quote, it's already quoted
        if (offset > 0 && jsonString[offset - 1] === '"') {
          return match; // Keep as is
        }

        hasChanges = true;
        diagnostics.push(`Fixed unquoted property name: ${propertyName as string}`);
        return `${whitespace}"${propertyName as string}":`;
      },
    );

    // Ensure hasChanges reflects actual changes
    hasChanges = sanitized !== originalSanitized;

    return {
      content: sanitized,
      changed: hasChanges,
      description: hasChanges ? "Fixed unquoted property names" : undefined,
      diagnostics: hasChanges ? diagnostics : undefined,
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
