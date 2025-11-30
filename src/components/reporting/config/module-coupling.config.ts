/**
 * Configuration for module coupling data provider.
 * Contains tuning parameters for module coupling analysis.
 */

export const moduleCouplingConfig = {
  /**
   * Default depth for module name extraction from file paths.
   * For example, with depth 2: "src/components/insights/aggregator.ts" -> "src/components"
   */
  DEFAULT_MODULE_DEPTH: 2,
} as const;
