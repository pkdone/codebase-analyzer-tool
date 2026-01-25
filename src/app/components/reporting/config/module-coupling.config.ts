/**
 * Configuration for module coupling data provider.
 * Contains tuning parameters for module coupling analysis.
 */

/**
 * Enumeration of coupling severity levels.
 * These are business domain concepts representing the severity of module coupling.
 */
export enum CouplingLevel {
  VERY_HIGH = "VERY_HIGH",
  HIGH = "HIGH",
  MEDIUM = "MEDIUM",
  LOW = "LOW",
}

/**
 * Coupling level thresholds as percentages of highest coupling count.
 * Used to determine coupling severity levels.
 *
 * Thresholds:
 * - Very High: >= 70% of highest count
 * - High: >= 40% of highest count
 * - Medium: >= 20% of highest count
 * - Low: < 20% of highest count
 */
export const COUPLING_THRESHOLDS = {
  VERY_HIGH: 0.7,
  HIGH: 0.4,
  MEDIUM: 0.2,
} as const;

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

export const moduleCouplingConfig = {
  /**
   * Default depth for module name extraction from file paths.
   * For example, with depth 2: "src/components/insights/aggregator.ts" -> "src/components"
   */
  DEFAULT_MODULE_DEPTH: 2,
} as const;
