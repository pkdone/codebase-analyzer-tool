/**
 * Section name constants used in sectionDataMap
 */
export const SECTION_NAMES = {
  FILE_TYPES: "file-types",
  DATABASE: "database",
  QUALITY_METRICS: "quality-metrics",
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
