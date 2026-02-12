/**
 * CSS class and badge mapping utilities for presentation.
 *
 * Maps domain enum values (coupling levels, debt levels, scriptlet counts)
 * to CSS classes and badge styles for UI rendering. This module is purely
 * presentational and contains no business logic.
 */

import { CouplingLevel } from "../sections/architecture-analysis/module-coupling.config";
import { DebtLevel, uiAnalysisConfig } from "../sections/ui-analysis/ui-analysis.config";
import { LEVEL_LABELS, BADGE_CLASSES, WARNING_CLASSES } from "./presentation.config";

/**
 * Result type for coupling level presentation.
 */
export interface CouplingLevelPresentation {
  /** Human-readable coupling level label */
  readonly level: string;
  /** CSS class for styling the badge */
  readonly cssClass: string;
}

/**
 * Result type for debt level presentation.
 */
export interface DebtLevelPresentation {
  /** Human-readable debt level label */
  readonly level: string;
  /** CSS class for styling the badge */
  readonly cssClass: string;
}

/**
 * Maps a CouplingLevel enum to its presentation (label and CSS class).
 * This is purely presentational - it translates domain concepts to UI concerns.
 *
 * @param couplingLevel - The coupling level from business logic
 * @returns Object containing the level label and CSS class
 */
export function getCouplingLevelPresentation(
  couplingLevel: CouplingLevel,
): CouplingLevelPresentation {
  switch (couplingLevel) {
    case CouplingLevel.VERY_HIGH:
      return { level: LEVEL_LABELS.VERY_HIGH, cssClass: BADGE_CLASSES.DANGER };
    case CouplingLevel.HIGH:
      return { level: LEVEL_LABELS.HIGH, cssClass: BADGE_CLASSES.HIGH };
    case CouplingLevel.MEDIUM:
      return { level: LEVEL_LABELS.MEDIUM, cssClass: BADGE_CLASSES.WARNING };
    case CouplingLevel.LOW:
      return { level: LEVEL_LABELS.LOW, cssClass: BADGE_CLASSES.SUCCESS };
  }
}

/**
 * Maps a DebtLevel enum to its presentation (label and CSS class).
 * This is purely presentational - it translates domain concepts to UI concerns.
 *
 * @param debtLevel - The debt level from business logic
 * @returns Object containing the debt level label and CSS class
 */
export function getDebtLevelPresentation(debtLevel: DebtLevel): DebtLevelPresentation {
  switch (debtLevel) {
    case DebtLevel.VERY_HIGH:
      return { level: LEVEL_LABELS.VERY_HIGH, cssClass: BADGE_CLASSES.DANGER };
    case DebtLevel.HIGH:
      return { level: LEVEL_LABELS.HIGH, cssClass: BADGE_CLASSES.WARNING };
    case DebtLevel.MODERATE:
      return { level: LEVEL_LABELS.MODERATE, cssClass: BADGE_CLASSES.INFO };
    case DebtLevel.LOW:
      return { level: LEVEL_LABELS.LOW, cssClass: BADGE_CLASSES.SUCCESS };
  }
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
