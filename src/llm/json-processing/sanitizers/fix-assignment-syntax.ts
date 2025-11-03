import { Sanitizer, SanitizerResult } from "./sanitizers-types";
import { SANITIZATION_STEP } from "../config/sanitization-steps.config";

/**
 * Sanitizer that fixes incorrect assignment syntax (`:=`) that LLMs sometimes use
 * instead of JSON property separator (`:`).
 *
 * LLMs occasionally confuse JSON syntax with programming language assignment syntax
 * (like Pascal, Go, or some functional languages) and write `"property":= "value"`
 * instead of `"property": "value"`.
 *
 * Examples:
 * - `"name":= "value"` -> `"name": "value"`
 * - `"type":="String"` -> `"type": "String"`
 *
 * Strategy:
 * Finds patterns where `":=` appears after a quoted property name and replaces it with `":`.
 * This sanitizer is careful to only fix actual property assignments, not string content
 * that might legitimately contain `:=`.
 */
export const fixAssignmentSyntax: Sanitizer = (
  jsonString: string,
): SanitizerResult => {
  try {
    let sanitized = jsonString;
    let hasChanges = false;
    const diagnostics: string[] = [];

    // Pattern: Find ":=" patterns that appear after quoted property names
    // Matches: "propertyName":= followed by whitespace and a value
    // This pattern specifically targets property assignments, not string content
    // The pattern looks for a quote, property name, quote, then := with optional whitespace
    // The value can be a quoted string, number, boolean, null, object, or array
    const assignmentPattern = /("([^"]+)")\s*:=\s*(\s*)/g;

    sanitized = sanitized.replace(
      assignmentPattern,
      (match, quotedProperty, propertyName, whitespaceAfter, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        const quotedPropStr = typeof quotedProperty === "string" ? quotedProperty : "";
        const propNameStr = typeof propertyName === "string" ? propertyName : "";
        // If no whitespace was captured, default to a single space for readability
        const wsAfter = typeof whitespaceAfter === "string" && whitespaceAfter ? whitespaceAfter : " ";

        // Verify we're at a property boundary by checking context before the match
        // We should be after a comma, opening brace, or at the start of an object
        if (numericOffset > 0) {
          const beforeMatch = sanitized.substring(
            Math.max(0, numericOffset - 20),
            numericOffset,
          );

          // Check if we're clearly in a property assignment context
          // Should be after: {, [, comma, or newline with whitespace
          const isPropertyContext =
            /[{,\]]\s*$/.test(beforeMatch) ||
            /\n\s*$/.test(beforeMatch) ||
            numericOffset <= 20; // Start of JSON structure

          if (!isPropertyContext) {
            // Might be inside a string value, skip it
            return match;
          }
        }

        // Verify we're not inside a string literal
        // Count quotes before the match to determine if we're in a string
        if (numericOffset > 0) {
          const beforeMatch = sanitized.substring(0, numericOffset);
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
          // If odd number of quotes, we're inside a string - skip
          if (quoteCount % 2 === 1) {
            return match;
          }
        }

        hasChanges = true;
        diagnostics.push(
          `Fixed assignment syntax: "${propNameStr}":= -> "${propNameStr}":`,
        );

        // Replace := with :, preserving whitespace after
        return `${quotedPropStr}:${wsAfter}`;
      },
    );

    // Ensure hasChanges reflects actual changes
    hasChanges = sanitized !== jsonString;

    return {
      content: sanitized,
      changed: hasChanges,
      description: hasChanges
        ? SANITIZATION_STEP.FIXED_ASSIGNMENT_SYNTAX
        : undefined,
      diagnostics: hasChanges && diagnostics.length > 0 ? diagnostics : undefined,
    };
  } catch (error) {
    // If sanitization fails, return the original string
    console.warn(`fixAssignmentSyntax sanitizer failed: ${String(error)}`);
    return {
      content: jsonString,
      changed: false,
      description: undefined,
      diagnostics: [`Sanitizer failed: ${String(error)}`],
    };
  }
};

