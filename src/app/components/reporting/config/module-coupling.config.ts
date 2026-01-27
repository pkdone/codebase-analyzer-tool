/**
 * Configuration for module coupling data provider.
 * Contains tuning parameters and constants for module coupling analysis.
 *
 * Note: The calculateCouplingLevel() function has been moved to
 * domain/coupling-calculator.ts to separate domain logic from configuration.
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

export const moduleCouplingConfig = {
  /**
   * Default depth for module name extraction from file paths.
   * For example, with depth 2: "src/components/insights/aggregator.ts" -> "src/components"
   */
  DEFAULT_MODULE_DEPTH: 2,
} as const;
