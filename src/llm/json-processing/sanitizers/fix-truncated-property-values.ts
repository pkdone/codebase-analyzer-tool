import { Sanitizer, SanitizerResult } from "./sanitizers-types";
import { SANITIZATION_STEP } from "../config/sanitization-steps.config";

/**
 * Sanitizer that fixes truncated property definitions in JSON responses.
 *
 * This sanitizer addresses cases where LLM responses contain property names
 * that are followed by a space but missing the colon and value, creating invalid JSON.
 *
 * Examples of issues this sanitizer handles:
 * - `"type "` -> `"type": "String"` (truncated property with trailing space)
 * - `"name": "relaxingDaysConfigForPivotDate", "type "` -> `"name": "relaxingDaysConfigForPivotDate", "type": "Long"`
 *
 * The sanitizer uses heuristics to identify likely truncated properties
 * and attempts to fix them by adding the missing colon and inferred value.
 */
export const fixTruncatedPropertyValues: Sanitizer = (jsonString: string): SanitizerResult => {
  try {
    let sanitized = jsonString;
    let hasChanges = false;
    const diagnostics: string[] = [];

    // Pattern: Fix truncated property definitions where property name has space but no colon/value
    // Matches: "type " followed by comma, closing brace, or newline (but not colon)
    // This pattern appears when a property name is quoted but the colon and value are missing
    const truncatedPropertyPattern = /"([a-zA-Z_$][a-zA-Z0-9_$]*)"\s+([,}\n])/g;

    sanitized = sanitized.replace(
      truncatedPropertyPattern,
      (match, propertyName, delimiter, offset, string) => {
        const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
        const delimiterStr = typeof delimiter === "string" ? delimiter : "";
        const offsetNum = typeof offset === "number" ? offset : undefined;
        const stringStr = typeof string === "string" ? string : sanitized;

        // Check if we're inside a string value (shouldn't be for property names)
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

          // Look ahead to see if there's actually a colon (then this isn't truncated)
          const afterMatch = stringStr.substring(
            offsetNum + match.length,
            Math.min(offsetNum + match.length + 5, stringStr.length),
          );
          if (afterMatch.trim().startsWith(":")) {
            // This has a colon, so it's not truncated
            return match;
          }

          // Look backwards to see context - if we see a colon before this, it might be in a value
          const beforeProperty = stringStr.substring(Math.max(0, offsetNum - 100), offsetNum);
          // Check if we're in a parameters array context (common place for truncated "type" properties)
          const isInParametersContext =
            beforeProperty.includes('"parameters"') || beforeProperty.includes('"parameters":');

          // Infer the value based on the property name and context
          const inferredValue = inferPropertyValue(propertyNameStr, isInParametersContext);
          if (inferredValue) {
            hasChanges = true;
            diagnostics.push(
              `Fixed truncated property: "${propertyNameStr} " -> "${propertyNameStr}": "${inferredValue}"${delimiterStr === "\n" ? "," : delimiterStr}`,
            );
            // If delimiter is newline, add comma after the value
            if (delimiterStr === "\n") {
              return `"${propertyNameStr}": "${inferredValue}",${delimiterStr}`;
            }
            return `"${propertyNameStr}": "${inferredValue}"${delimiterStr}`;
          }
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
        ? SANITIZATION_STEP.FIXED_TRUNCATED_PROPERTY_VALUES
        : undefined,
      diagnostics: hasChanges ? diagnostics : undefined,
    };
  } catch (error) {
    // If sanitization fails, return the original string
    console.warn(`fixTruncatedPropertyValues sanitizer failed: ${String(error)}`);
    return {
      content: jsonString,
      changed: false,
      description: undefined,
      diagnostics: [`Sanitizer failed: ${String(error)}`],
    };
  }
};

/**
 * Infers a property value based on the property name and context.
 * This is a heuristic function that tries to guess what value should be
 * based on common patterns in the codebase.
 */
function inferPropertyValue(propertyName: string, isInParametersContext = false): string | null {
  const lowerName = propertyName.toLowerCase();

  // Common property name to value mappings
  const mappings: Record<string, string> = {
    type: isInParametersContext ? "Long" : "String", // "type" in parameters is often "Long", "String", etc.
    returntype: "void",
    returntyp: "void",
    returnty: "void",
    returnt: "void",
    return: "void",
  };

  // Check for exact matches first
  if (mappings[lowerName]) {
    return mappings[lowerName];
  }

  // Check for prefix matches (e.g., "type" matches "type ", "type_", etc.)
  for (const [key, value] of Object.entries(mappings)) {
    if (lowerName.startsWith(key) || key.startsWith(lowerName)) {
      return value;
    }
  }

  // Special case: if it's "type" in parameters context, try common parameter types
  if (lowerName === "type" && isInParametersContext) {
    // Default to "Long" for parameter types in Java code
    return "Long";
  }

  // If we can't infer, return null
  return null;
}

