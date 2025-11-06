import { Sanitizer, SanitizerResult } from "./sanitizers-types";
import { SANITIZATION_STEP } from "../config/sanitization-steps.config";

/**
 * Sanitizer that fixes dangling properties (property names without values).
 *
 * This sanitizer addresses cases where LLM responses contain property names
 * that are followed by a space and delimiter but missing the colon and value,
 * creating invalid JSON syntax.
 *
 * Examples of issues this sanitizer handles:
 * - `"type "` -> `"type": null` (truncated property with trailing space)
 * - `"name": "value", "type "` -> `"name": "value", "type": null` (missing colon and value)
 *
 * Strategy:
 * Finds property names that are not followed by a colon and value, and inserts `: null`
 * to ensure syntactic validity. The `convertNullToUndefined` post-parse transform will
 * then correctly handle this for optional fields.
 *
 * This is safer than guessing values (like "String" or "Long") which can lead to incorrect data.
 */
export const fixDanglingProperties: Sanitizer = (jsonString: string): SanitizerResult => {
  try {
    let sanitized = jsonString;
    let hasChanges = false;
    const diagnostics: string[] = [];

    // Pattern: Fix dangling property definitions where property name has space but no colon/value
    // Matches: "type " followed by comma, closing brace, or newline (but not colon)
    // Uses negative lookbehind to ensure there isn't already a colon
    // Pattern breakdown:
    // - "([a-zA-Z_$][a-zA-Z0-9_$]*)" - quoted property name
    // - \s+ - one or more whitespace characters
    // - (?=[,}\n]) - positive lookahead for delimiter (comma, closing brace, or newline)
    // - (?<!:) - negative lookbehind to ensure no colon before the delimiter
    const danglingPropertyPattern = /"([a-zA-Z_$][a-zA-Z0-9_$]*)"\s+(?=[,}\n])(?<!:)/g;

    sanitized = sanitized.replace(
      danglingPropertyPattern,
      (match, propertyName, offset, string) => {
        const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
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

          // Look ahead to see if there's actually a colon (then this isn't dangling)
          const afterMatch = stringStr.substring(
            offsetNum + match.length,
            Math.min(offsetNum + match.length + 5, stringStr.length),
          );
          if (afterMatch.trim().startsWith(":")) {
            // This has a colon, so it's not dangling
            return match;
          }

          // Check what delimiter follows
          const delimiterMatch = /^\s*([,}\n])/.exec(afterMatch);
          const delimiter = delimiterMatch ? delimiterMatch[1] : "";

          // Insert : null before the delimiter
          hasChanges = true;
          diagnostics.push(
            `Fixed dangling property: "${propertyNameStr} " -> "${propertyNameStr}": null${delimiter === "\n" ? "," : delimiter}`,
          );

          // If delimiter is newline, add comma after null
          if (delimiter === "\n") {
            return `"${propertyNameStr}": null,`;
          }
          return `"${propertyNameStr}": null${delimiter}`;
        }

        return match;
      },
    );

    // Ensure hasChanges reflects actual changes
    hasChanges = sanitized !== jsonString;

    return {
      content: sanitized,
      changed: hasChanges,
      description: hasChanges ? SANITIZATION_STEP.FIXED_DANGLING_PROPERTIES : undefined,
      diagnostics: hasChanges && diagnostics.length > 0 ? diagnostics : undefined,
    };
  } catch (error) {
    // If sanitization fails, return the original string
    console.warn(`fixDanglingProperties sanitizer failed: ${String(error)}`);
    return {
      content: jsonString,
      changed: false,
      description: undefined,
      diagnostics: [`Sanitizer failed: ${String(error)}`],
    };
  }
};
