import { INSIGNIFICANT_SANITIZATION_STEPS } from "../constants/sanitization-steps.config";

/**
 * Determines whether a collection of sanitization steps contains any significant mutations.
 *
 * Significant mutations are those that indicate potentially problematic LLM output,
 * excluding trivial formatting changes like whitespace trimming or code fence removal.
 *
 * @param steps - Array of sanitization step descriptions
 * @returns true if any steps are significant (not in INSIGNIFICANT_SANITIZATION_STEPS), false otherwise
 */
export function hasSignificantSanitizationSteps(
  steps: readonly string[] | string[] | undefined,
): boolean {
  if (!steps || steps.length === 0) return false;
  return steps.some((step) => !INSIGNIFICANT_SANITIZATION_STEPS.has(step));
}
