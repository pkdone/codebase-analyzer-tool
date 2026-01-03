/**
 * View helper utilities for computing presentation values.
 * Extracts presentation logic from EJS templates to enable pre-computation
 * and easier testing.
 */

/**
 * Result type for coupling level calculations.
 */
export interface CouplingLevelResult {
  /** Human-readable coupling level label */
  readonly level: string;
  /** CSS class for styling the badge */
  readonly cssClass: string;
}

/**
 * Result type for debt level calculations.
 */
export interface DebtLevelResult {
  /** Human-readable debt level label */
  readonly level: string;
  /** CSS class for styling the badge */
  readonly cssClass: string;
}

/**
 * Coupling level thresholds as percentages of highest coupling count.
 */
const COUPLING_THRESHOLDS = {
  VERY_HIGH: 0.7,
  HIGH: 0.4,
  MEDIUM: 0.2,
} as const;

/**
 * Debt level thresholds based on total scriptlet blocks.
 */
const DEBT_THRESHOLDS = {
  VERY_HIGH: 20,
  HIGH: 10,
  MODERATE: 5,
} as const;

/**
 * Calculates the coupling level and CSS class for a module coupling relationship.
 * The coupling level is determined relative to the highest coupling count in the dataset.
 *
 * Thresholds:
 * - Very High: >= 70% of highest count
 * - High: >= 40% of highest count
 * - Medium: >= 20% of highest count
 * - Low: < 20% of highest count
 *
 * @param referenceCount - The number of references between modules
 * @param highestCouplingCount - The maximum reference count in the dataset
 * @returns Object containing the level label and CSS class
 */
export function calculateCouplingLevel(
  referenceCount: number,
  highestCouplingCount: number,
): CouplingLevelResult {
  // Handle edge case where highest count is 0
  if (highestCouplingCount <= 0) {
    return { level: "Low", cssClass: "badge-success" };
  }

  if (referenceCount >= highestCouplingCount * COUPLING_THRESHOLDS.VERY_HIGH) {
    return { level: "Very High", cssClass: "badge-danger" };
  }

  if (referenceCount >= highestCouplingCount * COUPLING_THRESHOLDS.HIGH) {
    return { level: "High", cssClass: "badge-high" };
  }

  if (referenceCount >= highestCouplingCount * COUPLING_THRESHOLDS.MEDIUM) {
    return { level: "Medium", cssClass: "badge-warning" };
  }

  return { level: "Low", cssClass: "badge-success" };
}

/**
 * Calculates the technical debt level and CSS class for a JSP file based on
 * its total scriptlet blocks (scriptlets + expressions + declarations).
 *
 * Thresholds:
 * - Very High: > 20 blocks
 * - High: > 10 blocks
 * - Moderate: > 5 blocks
 * - Low: <= 5 blocks
 *
 * @param totalScriptletBlocks - Total count of scriptlet blocks in the file
 * @returns Object containing the debt level label and CSS class
 */
export function calculateDebtLevel(totalScriptletBlocks: number): DebtLevelResult {
  if (totalScriptletBlocks > DEBT_THRESHOLDS.VERY_HIGH) {
    return { level: "Very High", cssClass: "badge-danger" };
  }

  if (totalScriptletBlocks > DEBT_THRESHOLDS.HIGH) {
    return { level: "High", cssClass: "badge-warning" };
  }

  if (totalScriptletBlocks > DEBT_THRESHOLDS.MODERATE) {
    return { level: "Moderate", cssClass: "badge-info" };
  }

  return { level: "Low", cssClass: "badge-success" };
}
