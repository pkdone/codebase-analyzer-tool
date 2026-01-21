/**
 * Configuration for presentation-related constants.
 * Centralizes level labels and CSS badge classes used by view helpers.
 *
 * These classes correspond to CSS definitions in style.css.
 * If the CSS framework or terminology changes, update values here.
 */

/**
 * Human-readable labels for severity/quality levels.
 * Used across coupling analysis, technical debt, and other metrics.
 */
export const LEVEL_LABELS = {
  VERY_HIGH: "Very High",
  HIGH: "High",
  MEDIUM: "Medium",
  MODERATE: "Moderate",
  LOW: "Low",
} as const;

/**
 * CSS badge classes for styling severity indicators.
 * Maps to Bootstrap-style badge classes defined in style.css.
 */
export const BADGE_CLASSES = {
  /** Red badge for critical/very high severity */
  DANGER: "badge-danger",
  /** Orange/red badge for high severity */
  HIGH: "badge-high",
  /** Yellow badge for medium/warning severity */
  WARNING: "badge-warning",
  /** Blue badge for informational/moderate severity */
  INFO: "badge-info",
  /** Green badge for low severity/success */
  SUCCESS: "badge-success",
  /** Grey badge for secondary/other */
  SECONDARY: "badge-secondary",
} as const;

/**
 * CSS classes for warning states in the UI.
 * Used for highlighting problematic metrics.
 */
export const WARNING_CLASSES = {
  /** High scriptlet warning (red text) */
  HIGH_SCRIPTLET: "high-scriptlet-warning",
  /** Generic warning text (orange) */
  WARNING_TEXT: "warning-text",
  /** Conflict warning (red) */
  CONFLICT: "conflict-warning",
  /** No conflicts indicator (green) */
  NO_CONFLICTS: "no-conflicts",
} as const;

/**
 * Type aliases for type-safe usage of constants.
 */
export type LevelLabel = (typeof LEVEL_LABELS)[keyof typeof LEVEL_LABELS];
export type BadgeClass = (typeof BADGE_CLASSES)[keyof typeof BADGE_CLASSES];
export type WarningClass = (typeof WARNING_CLASSES)[keyof typeof WARNING_CLASSES];
