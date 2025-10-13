import { INSIGNIFICANT_SANITIZATION_STEPS } from "./sanitization-steps.constants";

/**
 * Determines whether a collection of sanitization steps contains any significant mutations.
 *
 * Significant mutations are those that indicate potentially problematic LLM output,
 * excluding trivial formatting changes like whitespace trimming or code fence removal.
 *
 * @param steps - Array of sanitization step descriptions
 * @returns true if any steps are significant (not in INSIGNIFICANT_SANITIZATION_STEPS), false otherwise
 *
 * @example
 * ```typescript
 * const steps = ["Trimmed whitespace", "Fixed 2 mismatched delimiters"];
 * const hasSignificant = hasSignificantSanitizationSteps(steps);
 * // Returns: true (because "Fixed 2 mismatched delimiters" is significant)
 * ```
 */
export function hasSignificantSanitizationSteps(
  steps: readonly string[] | string[] | undefined,
): boolean {
  if (!steps || steps.length === 0) {
    return false;
  }

  return steps.some((step) => !INSIGNIFICANT_SANITIZATION_STEPS.has(step));
}
