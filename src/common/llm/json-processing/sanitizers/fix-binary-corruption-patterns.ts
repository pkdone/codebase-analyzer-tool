import { Sanitizer, SanitizerResult } from "./sanitizers-types";
import { SANITIZATION_STEP } from "../constants/sanitization-steps.config";
import { BINARY_CORRUPTION_REGEX } from "../constants/regex.constants";
import { logOneLineWarning } from "../../../utils/logging";
import { isInStringAt } from "../utils/parser-context-utils";

/**
 * Sanitizer that fixes binary corruption patterns in LLM responses.
 *
 * This sanitizer addresses cases where LLM responses contain binary corruption markers
 * like `<y_bin_XXX>` that replace parts of property names or appear in JSON structures.
 *
 * Examples of issues this sanitizer handles:
 * - `<y_bin_305>` -> removed (binary marker)
 * - `<y_bin_XXX>OfCode":` -> `OfCode":` (removes marker, let unifiedSyntaxSanitizer handle the typo)
 *
 * Strategy:
 * Simply removes all binary corruption markers. The resulting typos (e.g., `OfCode"` instead of `linesOfCode"`)
 * will be handled by the `unifiedSyntaxSanitizer` sanitizer, which is more robust and maintainable.
 * This approach is safer than trying to reconstruct property names heuristically.
 */
export const fixBinaryCorruptionPatterns: Sanitizer = (jsonString: string): SanitizerResult => {
  try {
    let sanitized = jsonString;
    let hasChanges = false;
    const diagnostics: string[] = [];

    // Pattern: Remove all binary corruption markers <y_bin_XXX>
    // This is a simple, generic approach that removes the markers and lets
    // other sanitizers (like unifiedSyntaxSanitizer) handle any resulting typos
    // Also handles cases where the marker appears before opening braces: `<y_bin_305>{` -> `{`
    sanitized = sanitized.replace(BINARY_CORRUPTION_REGEX, (match, offset: number) => {
      // Check if we're inside a string literal - if so, don't modify
      if (isInStringAt(offset, sanitized)) {
        return match;
      }

      // Check if there's an opening brace immediately after the marker
      const afterMarker = sanitized.substring(offset + match.length, offset + match.length + 1);
      if (afterMarker === "{") {
        // The marker is before an opening brace, just remove the marker
        hasChanges = true;
        diagnostics.push(`Removed binary corruption marker before opening brace: ${match}`);
        return "";
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
    logOneLineWarning(`fixBinaryCorruptionPatterns sanitizer failed: ${String(error)}`);
    return {
      content: jsonString,
      changed: false,
      description: undefined,
      diagnostics: [`Sanitizer failed: ${String(error)}`],
    };
  }
};
