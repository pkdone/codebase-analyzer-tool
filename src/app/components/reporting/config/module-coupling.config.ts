/**
 * Configuration for module coupling data provider.
 * Contains tuning parameters for module coupling analysis.
 */

/**
 * Coupling level thresholds as percentages of highest coupling count.
 * Used by view helpers to determine coupling level badges.
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

export const moduleCouplingConfig = {
  /**
   * Default depth for module name extraction from file paths.
   * For example, with depth 2: "src/components/insights/aggregator.ts" -> "src/components"
   */
  DEFAULT_MODULE_DEPTH: 2,
} as const;
