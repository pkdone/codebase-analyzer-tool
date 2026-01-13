/**
 * Types for the overview report section.
 * Contains app statistics and categorized data for the report overview tab.
 */

/**
 * Interface for app statistics data
 */
export interface AppStatistics {
  projectName: string;
  currentDate: string;
  llmProvider: string;
  fileCount: number;
  linesOfCode: number;
  appDescription: string;
}
