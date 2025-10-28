import type { ReportData } from "./report-gen.types";

/**
 * Constants for ReportData property names.
 *
 * IMPORTANT: Type annotations like `ReportData["fileTypesData"]` are ALREADY
 * type-safe - TypeScript will error if the property doesn't exist. These constants
 * are provided for:
 * 1. Consistency and documentation
 * 2. Runtime string access when needed
 * 3. Single source of truth for property names
 *
 * For type annotations, you can continue using: ReportData["propertyName"]
 * For runtime values, use: ReportDataKeys.PROPERTY_NAME
 *
 * If a property name changes in the ReportData interface, update both the
 * interface and these constants to maintain consistency.
 */
export const ReportDataKeys = {
  APP_STATS: "appStats",
  FILE_TYPES_DATA: "fileTypesData",
  CATEGORIZED_DATA: "categorizedData",
  INTEGRATION_POINTS: "integrationPoints",
  DB_INTERACTIONS: "dbInteractions",
  PROCS_AND_TRIGGERS: "procsAndTriggers",
  TOP_LEVEL_JAVA_CLASSES: "topLevelJavaClasses",
  BILL_OF_MATERIALS: "billOfMaterials",
  CODE_QUALITY_SUMMARY: "codeQualitySummary",
  SCHEDULED_JOBS_SUMMARY: "scheduledJobsSummary",
  MODULE_COUPLING: "moduleCoupling",
  UI_TECHNOLOGY_ANALYSIS: "uiTechnologyAnalysis",
} as const;

/**
 * Type helper to get the type of a ReportData property using the keys.
 * Usage: type FileTypesType = ReportDataByKey<typeof ReportDataKeys.FILE_TYPES_DATA>
 */
export type ReportDataByKey<K extends keyof ReportData> = ReportData[K];

/**
 * Section name constants used in sectionDataMap
 */
export const SECTION_NAMES = {
  FILE_TYPES: "file-types",
  DATABASE: "database",
  CODE_STRUCTURE: "code-structure",
  ADVANCED_DATA: "advanced-data",
  ENHANCED_UI: "enhanced-ui",
} as const;
