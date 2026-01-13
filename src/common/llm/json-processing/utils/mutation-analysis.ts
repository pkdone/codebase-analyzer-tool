import { INSIGNIFICANT_MUTATION_STEPS } from "../constants/mutation-steps.config";

/**
 * Determines whether a collection of mutation steps contains any significant mutations.
 *
 * Significant mutations are those that indicate potentially problematic LLM output,
 * excluding trivial formatting changes like whitespace trimming or code fence removal.
 *
 * This function checks both sanitization steps (from JSON parsing) and transform steps
 * (from schema validation) since both are included in the mutation steps array.
 *
 * @param steps - Array of mutation step descriptions (sanitization + transform steps)
 * @returns true if any steps are significant (not in INSIGNIFICANT_MUTATION_STEPS), false otherwise
 */
export function hasSignificantMutationSteps(
  steps: readonly string[] | string[] | undefined,
): boolean {
  if (!steps || steps.length === 0) return false;
  return steps.some((step) => !INSIGNIFICANT_MUTATION_STEPS.has(step));
}
