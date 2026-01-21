/**
 * Barrel export for reporting module.
 *
 * This module provides functionality for generating HTML and JSON reports
 * from analyzed codebase data.
 */

// Core generators and writers
export { default as AppReportGenerator } from "./app-report-generator";
export { HtmlReportWriter } from "./html-report-writer";
export type { PreparedHtmlReportData } from "./types/html-report-data.types";
export { JsonReportWriter, type PreparedJsonData } from "./json-report-writer";

// Types
export type { ReportData } from "./report-data.types";
export {
  isComplexityLevel,
  type ProcedureTrigger,
  type ProcsAndTriggers,
  type DatabaseIntegrationInfo,
} from "./sections/database/database.types";
export type { ComplexityValue as Complexity } from "../../schemas/sources.enums";
export { type IntegrationPointInfo } from "./sections/integration-points/integration-points.types";

// Types from focused sections
export { type AppStatistics } from "./sections/overview/overview.types";
export { type BomDependency } from "./sections/dependencies/dependencies.types";
export { type CodeQualitySummary } from "./sections/code-quality/code-quality.types";
export { type ScheduledJobsSummary } from "./sections/background-processes/background-processes.types";
export { type ModuleCoupling } from "./sections/architecture-analysis/architecture-analysis.types";
export { type UiTechnologyAnalysis } from "./sections/ui-analysis/ui-analysis.types";

// Section interface
export type { ReportSection } from "./sections/report-section.interface";

// Constants
export { SECTION_NAMES } from "./reporting.constants";
