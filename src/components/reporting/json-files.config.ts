import { outputConfig } from "../../config/output.config";

/**
 * Configuration for JSON file generation in HTML reports.
 * Maps data types to their corresponding JSON filenames.
 */
export const jsonFilesConfig = {
  /**
   * Filenames for additional data section JSON files
   */
  dataFiles: {
    completeReport: outputConfig.OUTPUT_SUMMARY_FILENAME,
    appStats: "app-stats.json",
    appDescription: "app-description.json",
    fileTypes: "file-types.json",
    dbInteractions: "db-interactions.json",
    procsAndTriggers: "procs-and-triggers.json",
    topLevelJavaClasses: "top-level-java-classes.json",
  },

  /**
   * Generate category filename from category key
   */
  getCategoryFilename: (category: string): string => `${category}.json`,
} as const;
