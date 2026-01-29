import type { RequestableAppSummaryField } from "../../../repositories/app-summaries/app-summaries.model";

/**
 * Section name identifiers used in sectionDataMap.
 * These must match the keys used by report sections.
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
 * Constants for HTML table column headers.
 * Used by report sections to create consistent table displays.
 */
export const HTML_TABLE_COLUMN_HEADERS = {
  FILE_TYPE: "File Type",
  FILES_COUNT: "Files Count",
  LINES_COUNT: "Lines Count",
} as const;

/**
 * Database object type labels used in reports.
 * Display labels for database objects (stored procedures, triggers, etc.).
 */
export const DATABASE_OBJECT_TYPE_LABELS = {
  STORED_PROCEDURE: "STORED PROCEDURE",
  TRIGGER: "TRIGGER",
} as const;

/**
 * Core app summary fields required by the report generator.
 * These fields are needed for app statistics and categorized data generation,
 * and are combined with fields requested by individual report sections.
 *
 * Note: Individual sections declare their own required fields via getRequiredAppSummaryFields().
 * This constant represents the generator's core dependencies only.
 *
 * Explicitly typed as ReadonlyArray<RequestableAppSummaryField> to ensure compile-time
 * validation that only valid app summary fields are listed.
 */
export const CORE_REQUIRED_APP_SUMMARY_FIELDS: readonly RequestableAppSummaryField[] = [
  "appDescription",
  "llmModels",
  "technologies",
] as const;
