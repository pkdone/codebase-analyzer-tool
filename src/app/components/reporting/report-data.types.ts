/**
 * Report generation types - main orchestration interface.
 *
 * Domain-specific types are co-located with their respective data providers:
 * - Database types: sections/database/database.types.ts
 * - Integration point types: sections/integration-points/integration-points.types.ts
 * - Dependencies types: sections/dependencies/dependencies.types.ts
 * - Background processes types: sections/background-processes/background-processes.types.ts
 * - Architecture analysis types: sections/architecture-analysis/architecture-analysis.types.ts
 * - UI analysis types: sections/ui-analysis/ui-analysis.types.ts
 * - Code quality types: sections/code-quality/code-quality.types.ts
 * - Overview types: sections/overview/overview.types.ts
 */

import type { ProjectedFileTypesCountAndLines } from "../../repositories/sources/sources.model";
import type { CategorizedSectionItem } from "./data-processing";

/**
 * Unified data model for report generation.
 * Contains all the data needed to generate both HTML and JSON reports.
 *
 * This is the high-level orchestration interface that aggregates data from
 * all report sections. Domain-specific types are defined in their respective
 * section type files.
 *
 * The categorizedData property uses a discriminated union (CategorizedSectionItem)
 * for type-safe access to category-specific data structures.
 */
export interface ReportData {
  appStats: import("./sections/overview/overview.types").AppStatistics;
  fileTypesData: ProjectedFileTypesCountAndLines[];
  categorizedData: CategorizedSectionItem[];
  integrationPoints: import("./sections/integration-points/integration-points.types").IntegrationPointInfo[];
  dbInteractions: import("./sections/database/database.types").DatabaseIntegrationInfo[];
  procsAndTriggers: import("./sections/database/database.types").ProcsAndTriggers;
  billOfMaterials: import("./sections/dependencies/dependencies.types").BomDependency[];
  codeQualitySummary:
    | import("./sections/code-quality/code-quality.types").CodeQualitySummary
    | null;
  scheduledJobsSummary:
    | import("./sections/background-processes/background-processes.types").ScheduledJobsSummary
    | null;
  moduleCoupling:
    | import("./sections/architecture-analysis/architecture-analysis.types").ModuleCoupling
    | null;
  uiTechnologyAnalysis:
    | import("./sections/ui-analysis/ui-analysis.types").UiTechnologyAnalysisData
    | null;
}
