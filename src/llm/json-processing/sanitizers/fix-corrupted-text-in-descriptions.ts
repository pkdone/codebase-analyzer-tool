import { Sanitizer, SanitizerResult } from "./sanitizers-types";
import { SANITIZATION_STEP } from "../config/sanitization-steps.config";

/**
 * Sanitizer that fixes corrupted text patterns in JSON string values.
 *
 * This sanitizer addresses cases where LLM responses contain corrupted text
 * fragments that appear to be fragments of other parts of the JSON inserted
 * into string values, creating invalid JSON or nonsensical content.
 *
 * Examples of issues this sanitizer handles:
 * - `tatusCode, confirming...` -> `confirming...` (removes corrupted "tatusCode," prefix)
 * - Text fragments that look like they were incorrectly inserted
 *
 * The sanitizer identifies common corrupted text patterns and removes them.
 */
export const fixCorruptedTextInDescriptions: Sanitizer = (
  jsonString: string,
): SanitizerResult => {
  try {
    let sanitized = jsonString;
    let hasChanges = false;
    const diagnostics: string[] = [];

    // Pattern: Fix corrupted text fragments at the start of string values
    // These are typically fragments of property names or other text that got inserted
    // Common patterns: "tatusCode,", "tatusCode", "status", etc.
    const corruptedTextPatterns = [
      // Common corrupted fragments
      /^([^"]*?)tatusCode,\s*/g, // "tatusCode," (missing "s" from "statusCode")
      /^([^"]*?)tatusCode\s+/g, // "tatusCode " (missing "s")
      /^([^"]*?)statusCode,\s*/g, // "statusCode," (if it appears at start)
    ];

    // We need to find and fix these patterns within string values
    // Look for quoted strings and check if they start with corrupted text
    const quotedStringPattern = /"([^"]*)"/g;

    sanitized = sanitized.replace(quotedStringPattern, (match, content, offset) => {
      const contentStr = typeof content === "string" ? content : "";
      const offsetNum = typeof offset === "number" ? offset : undefined;

      // Check if we're actually inside a string value (not a property name)
      // Property names are typically shorter and don't contain these patterns
      if (offsetNum !== undefined && contentStr.length > 20) {
        // This looks like a string value (description, implementation, etc.)
        let cleanedContent = contentStr;

        // Apply corrupted text pattern fixes
        for (const pattern of corruptedTextPatterns) {
          const beforeClean = cleanedContent;
          cleanedContent = cleanedContent.replace(pattern, "");
          if (cleanedContent !== beforeClean) {
            hasChanges = true;
            diagnostics.push(
              `Removed corrupted text pattern from string value: "${beforeClean.substring(0, 50)}..." -> "${cleanedContent.substring(0, 50)}..."`,
            );
          }
        }

        // If content was changed, return the cleaned version
        if (cleanedContent !== contentStr) {
          return `"${cleanedContent}"`;
        }
      }

      return match;
    });

    // Check if sanitization made changes
    hasChanges = sanitized !== jsonString;

    return {
      content: sanitized,
      changed: hasChanges,
      description: hasChanges
        ? SANITIZATION_STEP.FIXED_CORRUPTED_TEXT_IN_DESCRIPTIONS
        : undefined,
      diagnostics: hasChanges ? diagnostics : undefined,
    };
  } catch (error) {
    // If sanitization fails, return the original string
    console.warn(`fixCorruptedTextInDescriptions sanitizer failed: ${String(error)}`);
    return {
      content: jsonString,
      changed: false,
      description: undefined,
      diagnostics: [`Sanitizer failed: ${String(error)}`],
    };
  }
};

