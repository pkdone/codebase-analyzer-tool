/**
 * Barrel export for reporting module.
 *
 * This module provides functionality for generating HTML and JSON reports
 * from analyzed codebase data.
 */

// Core generators and writers
export { default as AppReportGenerator } from "./app-report-generator";
export { HtmlReportWriter, type PreparedHtmlReportData } from "./html-report-writer";
export { JsonReportWriter, type PreparedJsonData } from "./json-report-writer";

// Types
export type { ReportData } from "./report-data.types";
export {
  type Complexity,
  isComplexityLevel,
  type ProcedureTrigger,
  type ProcsAndTriggers,
  type DatabaseIntegrationInfo,
} from "./sections/database/database.types";
export { type IntegrationPointInfo } from "./sections/integration-points/integration-points.types";
export {
  type AppStatistics,
  type BomDependency,
  type CodeQualitySummary,
  type ScheduledJobsSummary,
  type ModuleCoupling,
  type UiTechnologyAnalysis,
} from "./sections/quality-metrics/quality-metrics.types";

// Section interface
export type { ReportSection } from "./sections/report-section.interface";

// Constants
export { SECTION_NAMES } from "./reporting.constants";

