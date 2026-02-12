/**
 * Domain logic for calculating module coupling severity levels.
 * This module contains the business logic for coupling analysis, separate from
 * the configuration constants which remain in module-coupling.config.ts.
 */

import { CouplingLevel, COUPLING_THRESHOLDS } from "./module-coupling.config";

/**
 * Calculates the coupling level for a module relationship.
 * This is business/domain logic that determines the severity of coupling
 * based on the reference count relative to the highest coupling in the dataset.
 *
 * @param referenceCount - The number of references between modules
 * @param highestCouplingCount - The maximum reference count in the dataset
 * @returns The coupling level classification
 */
export function calculateCouplingLevel(
  referenceCount: number,
  highestCouplingCount: number,
): CouplingLevel {
  // Handle edge case where highest count is 0
  if (highestCouplingCount <= 0) {
    return CouplingLevel.LOW;
  }

  if (referenceCount >= highestCouplingCount * COUPLING_THRESHOLDS.VERY_HIGH) {
    return CouplingLevel.VERY_HIGH;
  }

  if (referenceCount >= highestCouplingCount * COUPLING_THRESHOLDS.HIGH) {
    return CouplingLevel.HIGH;
  }

  if (referenceCount >= highestCouplingCount * COUPLING_THRESHOLDS.MEDIUM) {
    return CouplingLevel.MEDIUM;
  }

  return CouplingLevel.LOW;
}
