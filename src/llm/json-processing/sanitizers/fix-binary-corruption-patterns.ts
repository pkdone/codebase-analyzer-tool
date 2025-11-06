import { Sanitizer, SanitizerResult } from "./sanitizers-types";
import { SANITIZATION_STEP } from "../config/sanitization-steps.config";

/**
 * Sanitizer that fixes binary corruption patterns in LLM responses.
 *
 * This sanitizer addresses cases where LLM responses contain binary corruption markers
 * like `<y_bin_XXX>` that replace parts of property names or appear in JSON structures.
 *
 * Examples of issues this sanitizer handles:
 * - `<y_bin_305>` -> removed (binary marker)
 * - `<y_bin_XXX>OfCode":` -> `OfCode":` (removes marker, let fixPropertyAndValueSyntax handle the typo)
 *
 * Strategy:
 * Simply removes all binary corruption markers. The resulting typos (e.g., `OfCode"` instead of `linesOfCode"`)
 * will be handled by the `fixPropertyAndValueSyntax` sanitizer, which is more robust and maintainable.
 * This approach is safer than trying to reconstruct property names heuristically.
 */
export const fixBinaryCorruptionPatterns: Sanitizer = (jsonString: string): SanitizerResult => {
  try {
    let sanitized = jsonString;
    let hasChanges = false;
    const diagnostics: string[] = [];

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

    // Pattern: Remove all binary corruption markers <y_bin_XXX>
    // This is a simple, generic approach that removes the markers and lets
    // other sanitizers (like fixPropertyAndValueSyntax) handle any resulting typos
    const generalBinaryPattern = /<y_bin_\d+>/g;

    sanitized = sanitized.replace(generalBinaryPattern, (match, offset: unknown) => {
      const numericOffset = typeof offset === "number" ? offset : 0;

      // Check if we're inside a string literal - if so, don't modify
      if (isInStringAt(numericOffset, sanitized)) {
        return match;
      }

      // Remove the marker - let other sanitizers handle any resulting issues
      hasChanges = true;
      diagnostics.push(`Removed binary corruption marker: ${match}`);
      return "";
    });

    // Ensure hasChanges reflects actual changes
    hasChanges = sanitized !== jsonString;

    return {
      content: sanitized,
      changed: hasChanges,
      description: hasChanges ? SANITIZATION_STEP.FIXED_BINARY_CORRUPTION_PATTERNS : undefined,
      diagnostics: hasChanges && diagnostics.length > 0 ? diagnostics : undefined,
    };
  } catch (error) {
    // If sanitization fails, return the original string
    console.warn(`fixBinaryCorruptionPatterns sanitizer failed: ${String(error)}`);
    return {
      content: jsonString,
      changed: false,
      description: undefined,
      diagnostics: [`Sanitizer failed: ${String(error)}`],
    };
  }
};
