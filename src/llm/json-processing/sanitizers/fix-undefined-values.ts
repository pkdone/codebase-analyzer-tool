import { Sanitizer, SanitizerResult } from "./sanitizers-types";

/**
 * Sanitizer that fixes undefined values in JSON responses.
 *
 * This sanitizer addresses cases where LLM responses contain the literal
 * string "undefined" as property values, which is invalid JSON syntax.
 *
 * Examples:
 * - Invalid: {"field": undefined}
 * - Fixed: {"field": null} or {} (if field should be omitted)
 *
 * The sanitizer converts undefined to null, which is then handled by
 * the post-parse transform convertNullToUndefined.
 */
export const fixUndefinedValues: Sanitizer = (jsonString: string): SanitizerResult => {
  try {
    // Pattern to match property values that are literally "undefined"
    // This matches: "property": undefined (with optional whitespace)
    const undefinedValuePattern = /(:\s*)undefined(\s*)([,}])/g;

    let sanitized = jsonString;
    let hasChanges = false;
    const diagnostics: string[] = [];

    // Replace undefined values with null
    const originalSanitized = sanitized;
    sanitized = sanitized.replace(
      undefinedValuePattern,
      (_match, beforeColon, afterUndefined, terminator) => {
        hasChanges = true;
        diagnostics.push("Converted undefined to null");
        return `${beforeColon}null${afterUndefined}${terminator}`;
      },
    );

    // Ensure hasChanges reflects actual changes
    hasChanges = sanitized !== originalSanitized;

    return {
      content: sanitized,
      changed: hasChanges,
      description: hasChanges ? "Fixed undefined values" : undefined,
      diagnostics: hasChanges ? diagnostics : undefined,
    };
  } catch (error) {
    // If sanitization fails, return the original string
    console.warn(`fixUndefinedValues sanitizer failed: ${String(error)}`);
    return {
      content: jsonString,
      changed: false,
      description: undefined,
      diagnostics: [`Sanitizer failed: ${String(error)}`],
    };
  }
};
