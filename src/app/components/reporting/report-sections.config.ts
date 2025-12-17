import { outputConfig } from "../../config/output.config";

/**
 * Configuration for report generation sections.
 * Maps data types to their corresponding JSON filenames and defines required fields.
 */
export const reportSectionsConfig = {
  /**
   * All required app summary fields for report generation.
   * This includes fields needed by both AppStatisticsDataProvider and AppSummaryCategoriesProvider.
   */
  allRequiredAppSummaryFields: [
    "appDescription",
    "llmProvider",
    "technologies",
    "businessProcesses",
    "boundedContexts",
    "aggregates",
    "entities",
    "repositories",
    "potentialMicroservices",
  ],

  /**
   * Filenames for additional data section JSON files
   */
  jsonDataFiles: {
    completeReport: outputConfig.OUTPUT_SUMMARY_FILENAME,
    appStats: "app-stats.json",
    appDescription: "app-description.json",
    fileTypes: "file-types.json",
    integrationPoints: "integration-points.json",
    dbInteractions: "db-interactions.json",
    procsAndTriggers: "procs-and-triggers.json",
    topLevelJavaClasses: "top-level-java-classes.json",
  },

  /**
   * Generate category filename from category key
   */
  getCategoryJSONFilename: (category: string): string => `${category}.json`,
} as const;
