/**
 * View helper utilities for computing presentation values.
 * Extracts presentation logic from EJS templates to enable pre-computation
 * and easier testing.
 */

import { COUPLING_THRESHOLDS } from "../config/module-coupling.config";
import { DEBT_THRESHOLDS, uiAnalysisConfig } from "../config/ui-analysis.config";
import { LEVEL_LABELS, BADGE_CLASSES, WARNING_CLASSES } from "../config/presentation.config";

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
    return { level: LEVEL_LABELS.LOW, cssClass: BADGE_CLASSES.SUCCESS };
  }

  if (referenceCount >= highestCouplingCount * COUPLING_THRESHOLDS.VERY_HIGH) {
    return { level: LEVEL_LABELS.VERY_HIGH, cssClass: BADGE_CLASSES.DANGER };
  }

  if (referenceCount >= highestCouplingCount * COUPLING_THRESHOLDS.HIGH) {
    return { level: LEVEL_LABELS.HIGH, cssClass: BADGE_CLASSES.HIGH };
  }

  if (referenceCount >= highestCouplingCount * COUPLING_THRESHOLDS.MEDIUM) {
    return { level: LEVEL_LABELS.MEDIUM, cssClass: BADGE_CLASSES.WARNING };
  }

  return { level: LEVEL_LABELS.LOW, cssClass: BADGE_CLASSES.SUCCESS };
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
    return { level: LEVEL_LABELS.VERY_HIGH, cssClass: BADGE_CLASSES.DANGER };
  }

  if (totalScriptletBlocks > DEBT_THRESHOLDS.HIGH) {
    return { level: LEVEL_LABELS.HIGH, cssClass: BADGE_CLASSES.WARNING };
  }

  if (totalScriptletBlocks > DEBT_THRESHOLDS.MODERATE) {
    return { level: LEVEL_LABELS.MODERATE, cssClass: BADGE_CLASSES.INFO };
  }

  return { level: LEVEL_LABELS.LOW, cssClass: BADGE_CLASSES.SUCCESS };
}

/**
 * Computes the CSS class for total scriptlets display.
 * Returns a warning class when scriptlet count exceeds threshold.
 *
 * @param totalScriptlets - Total count of scriptlets in the project
 * @returns CSS class name for styling, or empty string if no warning needed
 */
export function getTotalScriptletsCssClass(totalScriptlets: number): string {
  return totalScriptlets > uiAnalysisConfig.HIGH_SCRIPTLET_WARNING_THRESHOLD
    ? WARNING_CLASSES.HIGH_SCRIPTLET
    : "";
}

/**
 * Computes the CSS class for files with high scriptlet count display.
 * Returns a warning class when there are files with high scriptlet usage.
 *
 * @param filesWithHighScriptletCount - Count of files exceeding the high scriptlet threshold
 * @returns CSS class name for styling, or empty string if no warning needed
 */
export function getFilesWithHighScriptletCountCssClass(
  filesWithHighScriptletCount: number,
): string {
  return filesWithHighScriptletCount > 0 ? WARNING_CLASSES.WARNING_TEXT : "";
}

/**
 * Determines whether to show the high technical debt alert.
 *
 * @param filesWithHighScriptletCount - Count of files exceeding the high scriptlet threshold
 * @returns true if the alert should be displayed
 */
export function shouldShowHighDebtAlert(filesWithHighScriptletCount: number): boolean {
  return filesWithHighScriptletCount > 0;
}

/**
 * Computes the CSS class for BOM conflicts count display.
 * Returns a warning class when there are version conflicts.
 *
 * @param conflicts - Number of dependencies with version conflicts
 * @returns CSS class name for styling
 */
export function getBomConflictsCssClass(conflicts: number): string {
  return conflicts > 0 ? WARNING_CLASSES.CONFLICT : WARNING_CLASSES.NO_CONFLICTS;
}

// Re-export config for tests
export { uiAnalysisConfig };
