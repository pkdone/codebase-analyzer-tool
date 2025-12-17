/**
 * Configuration for UI analysis data provider.
 * Contains tuning parameters for UI technology analysis and JSP metrics.
 */

export const uiAnalysisConfig = {
  /**
   * Maximum number of top scriptlet files to include in the analysis
   */
  TOP_FILES_LIMIT: 10,

  /**
   * Threshold for identifying files with high scriptlet count.
   * Files exceeding this threshold are flagged as having high scriptlet usage.
   */
  HIGH_SCRIPTLET_THRESHOLD: 10,
} as const;
