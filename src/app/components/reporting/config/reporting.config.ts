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

/**
 * Special table column keys that receive custom rendering treatment.
 * Used by table-data-formatter.ts to determine how to render specific columns.
 * Data providers must use these exact keys for the special rendering to apply.
 */
export const SPECIAL_TABLE_COLUMNS = {
  /** Column key for link values - rendered as clickable hyperlinks */
  LINK: "link",
  /** Column key for code example values - rendered with code formatting */
  CODE_EXAMPLE: "codeExample",
} as const;

/**
 * Type representing valid special table column keys.
 */
export type SpecialTableColumnKey =
  (typeof SPECIAL_TABLE_COLUMNS)[keyof typeof SPECIAL_TABLE_COLUMNS];

/**
 * Job trigger type identifiers used in background process reports.
 * Used by job-trigger-parser.ts to normalize raw trigger strings into known types.
 * UI components can rely on these types for consistent badge/icon rendering.
 */
export const JOB_TRIGGER_TYPES = {
  /** Cron-scheduled jobs (cron, crontab) */
  CRON: "cron",
  /** Windows Task Scheduler jobs */
  TASK_SCHEDULER: "task-scheduler",
  /** Generic scheduled jobs */
  SCHEDULED: "scheduled",
  /** Manually triggered jobs */
  MANUAL: "manual",
  /** Event-driven jobs */
  EVENT_DRIVEN: "event-driven",
  /** Systemd timer-based jobs */
  SYSTEMD_TIMER: "systemd-timer",
} as const;

/**
 * Type representing valid job trigger types.
 */
export type JobTriggerType = (typeof JOB_TRIGGER_TYPES)[keyof typeof JOB_TRIGGER_TYPES];
