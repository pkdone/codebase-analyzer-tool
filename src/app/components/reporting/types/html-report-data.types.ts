/**
 * Type definitions for prepared HTML report data.
 * These types define the contract for data passed to the HTML report template.
 */

import type { AppStatistics } from "../sections/overview/overview.types";
import type { CodeQualitySummary } from "../sections/code-quality/code-quality.types";
import type { ScheduledJobsSummary } from "../sections/background-processes/background-processes.types";
import type { ModuleCoupling } from "../sections/architecture-analysis/architecture-analysis.types";
import type { UiTechnologyAnalysis } from "../sections/ui-analysis/ui-analysis.types";
import type { BomStatistics } from "../sections/dependencies/dependencies.types";
import type {
  ProcsAndTriggers,
  DatabaseIntegrationInfo,
} from "../sections/database/database.types";
import type { IntegrationPointInfo } from "../sections/integration-points/integration-points.types";
import type { ProjectedFileExtensionStats } from "../../../repositories/sources/sources.model";
import type { TableViewModel } from "../presentation";
import type { CategorizedSectionItem } from "../data-processing";
import type { PieChartData } from "../sections/file-types/pie-chart.types";

/**
 * Extended categorized section item with table view model for HTML rendering.
 */
export type CategorizedSectionItemWithViewModel = CategorizedSectionItem & {
  tableViewModel: TableViewModel;
};

/**
 * Complete data structure for HTML report rendering.
 * Contains all the data required by the EJS template to generate the report.
 */
export interface PreparedHtmlReportData {
  appStats: AppStatistics;
  fileTypesData: ProjectedFileExtensionStats[];
  /** Pre-computed pie chart data for rendering */
  pieChartData: PieChartData;
  categorizedData: CategorizedSectionItemWithViewModel[];
  integrationPoints: IntegrationPointInfo[];
  dbInteractions: DatabaseIntegrationInfo[];
  procsAndTriggers: ProcsAndTriggers;
  billOfMaterials: {
    readonly name: string;
    readonly groupId?: string;
    readonly versions: string[];
    readonly hasConflict: boolean;
    readonly scopes?: string[];
    readonly locations: string[];
  }[];
  bomStatistics: BomStatistics;
  codeQualitySummary: CodeQualitySummary | null;
  scheduledJobsSummary: ScheduledJobsSummary | null;
  jobsStatistics: {
    total: number;
    triggerTypesCount: number;
    jobFilesCount: number;
  } | null;
  moduleCoupling: ModuleCoupling | null;
  couplingStatistics: {
    totalModules: number;
    totalCouplings: number;
    highestCouplingCount: number;
    moduleDepth: number;
  } | null;
  uiTechnologyAnalysis: UiTechnologyAnalysis | null;
  jsonFilesConfig: {
    readonly allRequiredAppSummaryFields: readonly string[];
    readonly jsonDataFiles: Record<string, string>;
    readonly getCategoryJSONFilename: (category: string) => string;
  };
  htmlReportConstants: {
    readonly paths: {
      readonly ASSETS_DIR: string;
    };
  };
  convertToDisplayName: (text: string) => string;
  fileTypesTableViewModel: TableViewModel;
  dbInteractionsTableViewModel: TableViewModel;
  procsAndTriggersTableViewModel: TableViewModel;
  integrationPointsTableViewModel: TableViewModel;

  // Enhanced UI data
  businessProcessesFlowchartSvgs: string[];
  domainModelData: {
    boundedContexts: {
      name: string;
      description: string;
      aggregates: {
        name: string;
        description: string;
        entities: string[];
        repository: {
          name: string;
          description: string;
        };
      }[];
      entities: {
        name: string;
        description: string;
      }[];
      repositories: {
        name: string;
        description: string;
      }[];
    }[];
    aggregates: {
      name: string;
      description: string;
      entities: string[];
      repository: {
        name: string;
        description: string;
      };
    }[];
    entities: {
      name: string;
      description: string;
    }[];
    repositories: {
      name: string;
      description: string;
    }[];
  };
  contextDiagramSvgs: string[];
  microservicesData: {
    name: string;
    description: string;
    entities: {
      name: string;
      description: string;
      attributes: string[];
    }[];
    endpoints: {
      path: string;
      method: string;
      description: string;
    }[];
    operations: {
      operation: string;
      method: string;
      description: string;
    }[];
  }[];
  architectureDiagramSvg: string;

  // Current/Inferred Architecture data
  inferredArchitectureData: {
    internalComponents: { name: string; description: string }[];
    externalDependencies: { name: string; type: string; description: string }[];
    dependencies: { from: string; to: string; description: string }[];
  } | null;
  currentArchitectureDiagramSvg: string;

  // Asset content to be embedded inline
  inlineCss: string;
  jsonIconSvg: string;
}

/**
 * Input type for writeHTMLReportFile that excludes asset properties.
 * Assets are loaded automatically by the HtmlReportWriter via HtmlReportAssetService.
 */
export type PreparedHtmlReportDataWithoutAssets = Omit<
  PreparedHtmlReportData,
  "inlineCss" | "jsonIconSvg"
>;
