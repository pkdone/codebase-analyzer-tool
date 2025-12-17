/**
 * Common instruction fragments used across multiple app summary templates
 */
export const APP_SUMMARY_PROMPT_FRAGMENTS = {
  DETAILED_DESCRIPTION: "a detailed description of the application's purpose and implementation",
  CONCISE_LIST: "a concise list",
  COMPREHENSIVE_LIST: "a comprehensive list",
  COMPREHENSIVE_ANALYSIS: "a comprehensive analysis",
  AGGREGATED_METRICS:
    "aggregated code quality metrics including complexity analysis, code smell detection, and maintainability indicators to help prioritize refactoring efforts",
  DEPENDENCY_MATRIX:
    "a dependency matrix showing coupling relationships between modules to identify highly coupled components (candidates for single services) and loosely coupled components (candidates for easy separation)",
} as const;
