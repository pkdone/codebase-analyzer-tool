/**
 * Report generation types - main orchestration interface.
 *
 * Domain-specific types are co-located with their respective data providers:
 * - Database types: sections/database/database.types.ts
 * - Integration point types: sections/integration-points/integration-points.types.ts
 * - Quality metrics types: sections/quality-metrics/quality-metrics.types.ts
 */

import type { ProjectedFileTypesCountAndLines } from "../../repositories/sources/sources.model";
import type { CategorizedDataItem } from "./sections/file-types/categories-data-provider";

// Re-export domain-specific types for backward compatibility
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

/**
 * Unified data model for report generation.
 * Contains all the data needed to generate both HTML and JSON reports.
 *
 * This is the high-level orchestration interface that aggregates data from
 * all report sections. Domain-specific types are defined in their respective
 * section type files.
 */
export interface ReportData {
  appStats: import("./sections/quality-metrics/quality-metrics.types").AppStatistics;
  fileTypesData: ProjectedFileTypesCountAndLines[];
  categorizedData: { category: string; label: string; data: CategorizedDataItem }[];
  integrationPoints: import("./sections/integration-points/integration-points.types").IntegrationPointInfo[];
  dbInteractions: import("./sections/database/database.types").DatabaseIntegrationInfo[];
  procsAndTriggers: import("./sections/database/database.types").ProcsAndTriggers;
  billOfMaterials: import("./sections/quality-metrics/quality-metrics.types").BomDependency[];
  codeQualitySummary:
    | import("./sections/quality-metrics/quality-metrics.types").CodeQualitySummary
    | null;
  scheduledJobsSummary:
    | import("./sections/quality-metrics/quality-metrics.types").ScheduledJobsSummary
    | null;
  moduleCoupling: import("./sections/quality-metrics/quality-metrics.types").ModuleCoupling | null;
  uiTechnologyAnalysis:
    | import("./sections/quality-metrics/quality-metrics.types").UiTechnologyAnalysis
    | null;
}
