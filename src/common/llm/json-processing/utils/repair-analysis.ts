import { INSIGNIFICANT_REPAIR_STEPS } from "../constants/repair-steps.config";

/**
 * Determines whether a collection of repairs contains any significant repairs.
 *
 * Significant repairs are those that indicate potentially problematic LLM output,
 * excluding trivial formatting changes like whitespace trimming or code fence removal.
 *
 * This function checks both sanitization repairs (from JSON parsing) and transform repairs
 * (from schema validation) since both are included in the repairs array.
 *
 * @param repairs - Array of repair step descriptions (sanitization + transform repairs)
 * @returns true if any repairs are significant (not in INSIGNIFICANT_REPAIR_STEPS), false otherwise
 */
export function hasSignificantRepairs(repairs: readonly string[] | string[] | undefined): boolean {
  if (!repairs || repairs.length === 0) return false;
  return repairs.some((repair) => !INSIGNIFICANT_REPAIR_STEPS.has(repair));
}
