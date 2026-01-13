/**
 * Section name constants used in sectionDataMap
 */
export const SECTION_NAMES = {
  FILE_TYPES: "file-types",
  DATABASE: "database",
  DEPENDENCIES: "dependencies",
  BACKGROUND_PROCESSES: "background-processes",
  ARCHITECTURE_ANALYSIS: "architecture-analysis",
  UI_ANALYSIS: "ui-analysis",
  CODE_QUALITY: "code-quality",
  BUSINESS_PROCESSES: "business-processes",
  VISUALIZATIONS: "visualizations",
  INTEGRATION_POINTS: "integration-points",
} as const;

/**
 * Database object type labels used in reports.
 * These are display labels for database objects (stored procedures, triggers, etc.)
 * in the reporting layer.
 */
export const DATABASE_OBJECT_TYPE_LABELS = {
  STORED_PROCEDURE: "STORED PROCEDURE",
  TRIGGER: "TRIGGER",
} as const;
