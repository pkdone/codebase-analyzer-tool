import { injectable } from "tsyringe";
import path from "path";
import ejs from "ejs";
import { outputConfig } from "./config/output.config";
import { writeFile } from "../../../common/fs/file-operations";
import type {
  AppStatistics,
  ProcsAndTriggers,
  DatabaseIntegrationInfo,
  IntegrationPointInfo,
  CodeQualitySummary,
  ScheduledJobsSummary,
  ModuleCoupling,
  UiTechnologyAnalysis,
} from "./report-gen.types";
import type { ProjectedFileTypesCountAndLines } from "../../repositories/sources/sources.model";
import type { TableViewModel } from "./view-models/table-view-model";
import type { CategorizedDataItem } from "./sections/file-types/categories-data-provider";

export interface PreparedHtmlReportData {
  appStats: AppStatistics;
  fileTypesData: ProjectedFileTypesCountAndLines[];
  fileTypesPieChartPath: string;
  categorizedData: {
    category: string;
    label: string;
    data: CategorizedDataItem;
    tableViewModel: TableViewModel;
  }[];
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
  bomStatistics: {
    total: number;
    conflicts: number;
    buildFiles: number;
  };
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

  // Table view models for enhanced sections

  // Asset content to be embedded inline
  inlineCss: string;
  jsonIconSvg: string;
}

/**
 * Class responsible for rendering HTML reports from prepared template data.
 * This is a pure presentation component that only handles template rendering and file writing.
 */
@injectable()
export class HtmlReportWriter {
  /**
   * Renders HTML report from prepared template data and writes it to file.
   * This is a pure presentation method that only handles template rendering.
   * Asset content (CSS and SVG) should be provided in the preparedData parameter.
   */
  async writeHTMLReportFile(
    preparedData: PreparedHtmlReportData,
    htmlFilePath: string,
  ): Promise<void> {
    const templatePath = path.join(
      __dirname,
      outputConfig.HTML_TEMPLATES_DIR,
      outputConfig.HTML_MAIN_TEMPLATE_FILE,
    );

    const htmlContent = await ejs.renderFile(templatePath, preparedData);
    await writeFile(htmlFilePath, htmlContent);

    console.log(`View generated report in a browser: file://${path.resolve(htmlFilePath)}`);
  }
}
