import { Sanitizer, SanitizerResult } from "./sanitizers-types";
import { SANITIZATION_STEP } from "../config/sanitization-steps.config";

/**
 * Sanitizer that fixes stray text between a colon and the opening quote of a string value.
 *
 * This sanitizer addresses cases where LLM responses contain stray text or characters
 * inserted between the colon separator and the opening quote of a property value,
 * which breaks JSON parsing.
 *
 * Examples of issues this sanitizer handles:
 * - `"name":ax": "totalCredits"` -> `"name": "totalCredits"`
 * - `"type":word": "String"` -> `"type": "String"`
 * - `"returnType":abc": "Result"` -> `"returnType": "Result"`
 *
 * Strategy:
 * Detects patterns where after a colon (from a quoted property name), there's stray text
 * followed by `":` and then a quoted value. The sanitizer removes the stray text and the
 * extra `":` to restore proper JSON syntax.
 */
export const fixStrayTextBetweenColonAndValue: Sanitizer = (
  jsonString: string,
): SanitizerResult => {
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

    // Pattern to match stray text between colon and value quote
    // Matches: "propertyName":strayText": "value"
    // The pattern captures:
    // 1. Quoted property name: "name"
    // 2. Colon: :
    // 3. Stray text (1-10 characters, typically short fragments like "ax", "word", etc.)
    // 4. Extra ":": ":
    // 5. Optional whitespace
    // 6. Opening quote and value: "value"
    //
    // Note: We limit stray text to 1-10 characters to avoid false positives with
    // legitimate patterns. The stray text must be followed by `":` to indicate corruption.
    // We run this in a loop because after fixing one occurrence, positions shift and
    // we may need to match again on the updated string.
    let previousSanitized = "";
    while (previousSanitized !== sanitized) {
      previousSanitized = sanitized;
      const strayTextBetweenColonAndValuePattern =
        /"([a-zA-Z_$][a-zA-Z0-9_$.]*)"\s*:\s*([a-zA-Z_$0-9]{1,10})":\s*"([^"]+)"/g;

      sanitized = sanitized.replace(
        strayTextBetweenColonAndValuePattern,
        (match, propertyName, strayText, value, offset: unknown) => {
          const numericOffset = typeof offset === "number" ? offset : 0;
          const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
          const strayTextStr = typeof strayText === "string" ? strayText : "";
          const valueStr = typeof value === "string" ? value : "";

          // Check if we're inside a string literal at the match position
          if (isInStringAt(numericOffset, sanitized)) {
            return match; // Keep as is - inside a string
          }

          // Verify this is actually after a quoted property name (not a false positive)
          // The pattern already ensures this, but we do additional validation
          if (numericOffset > 0) {
            const contextBefore = sanitized.substring(
              Math.max(0, numericOffset - 50),
              numericOffset,
            );
            // Should see the property name pattern before the match
            const hasPropertyNamePattern =
              /"\s*$/.test(contextBefore) || /[}\],\]]\s*$/.test(contextBefore);
            if (!hasPropertyNamePattern && !contextBefore.trim().endsWith('"')) {
              // Might not be a property context - be cautious
              // Check if we're after an opening brace or bracket (array/object context)
              const trimmedContext = contextBefore.trim();
              const isInObjectOrArray =
                /[{]\s*$/.test(trimmedContext) || trimmedContext.includes("[");
              if (!isInObjectOrArray) {
                return match; // Skip if unclear
              }
            }
          }

          hasChanges = true;
          diagnostics.push(
            `Removed stray text "${strayTextStr}":" between colon and value: "${propertyNameStr}": ${strayTextStr}": -> "${propertyNameStr}": "${valueStr}"`,
          );

          // Reconstruct with proper syntax: property name, colon, space, quoted value
          return `"${propertyNameStr}": "${valueStr}"`;
        },
      );
    }

    // Ensure hasChanges reflects actual changes
    hasChanges = sanitized !== jsonString;

    return {
      content: sanitized,
      changed: hasChanges,
      description: hasChanges
        ? SANITIZATION_STEP.FIXED_STRAY_TEXT_BETWEEN_COLON_AND_VALUE
        : undefined,
      diagnostics: hasChanges && diagnostics.length > 0 ? diagnostics : undefined,
    };
  } catch (error) {
    // If sanitization fails, return the original string
    console.warn(`fixStrayTextBetweenColonAndValue sanitizer failed: ${String(error)}`);
    return {
      content: jsonString,
      changed: false,
      description: undefined,
      diagnostics: [`Sanitizer failed: ${String(error)}`],
    };
  }
};
