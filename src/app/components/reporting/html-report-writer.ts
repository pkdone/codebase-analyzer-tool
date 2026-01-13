import { injectable, inject } from "tsyringe";
import path from "path";
import ejs from "ejs";
import { coreTokens, reportingTokens } from "../../di/tokens";
import type { OutputConfigType } from "../../config/output.config";
import { writeFile } from "../../../common/fs/file-operations";
import { HtmlReportAssetService } from "./services/html-report-asset.service";
import type { AppStatistics } from "./sections/overview/overview.types";
import type { CodeQualitySummary } from "./sections/code-quality/code-quality.types";
import type { ScheduledJobsSummary } from "./sections/background-processes/background-processes.types";
import type { ModuleCoupling } from "./sections/architecture-analysis/architecture-analysis.types";
import type { UiTechnologyAnalysis } from "./sections/ui-analysis/ui-analysis.types";
import type { BomStatistics } from "./sections/dependencies/dependencies.types";
import type { ProcsAndTriggers, DatabaseIntegrationInfo } from "./sections/database/database.types";
import type { IntegrationPointInfo } from "./sections/integration-points/integration-points.types";
import type { ProjectedFileTypesCountAndLines } from "../../repositories/sources/sources.model";
import type { TableViewModel } from "./view-models/table-view-model";
import type { CategorizedSectionItem } from "./sections/overview/categorized-section-data-builder";
import type { PieChartData } from "./sections/file-types/pie-chart.types";

/**
 * Extended categorized section item with table view model for HTML rendering.
 */
type CategorizedSectionItemWithViewModel = CategorizedSectionItem & {
  tableViewModel: TableViewModel;
};

export interface PreparedHtmlReportData {
  appStats: AppStatistics;
  fileTypesData: ProjectedFileTypesCountAndLines[];
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

/**
 * Class responsible for rendering HTML reports from prepared template data.
 * This is a pure presentation component that handles template rendering, asset loading, and file writing.
 *
 * Assets (CSS and SVG icons) are loaded via the injected HtmlReportAssetService,
 * decoupling the generator from asset management concerns.
 */
@injectable()
export class HtmlReportWriter {
  constructor(
    @inject(coreTokens.OutputConfig) private readonly config: OutputConfigType,
    @inject(reportingTokens.HtmlReportAssetService)
    private readonly assetService: HtmlReportAssetService,
  ) {}

  /**
   * Renders HTML report from prepared template data and writes it to file.
   * Automatically loads and injects CSS and SVG assets via HtmlReportAssetService.
   *
   * @param preparedData - The prepared report data (without inline assets)
   * @param htmlFilePath - The path where the HTML report will be written
   */
  async writeHTMLReportFile(
    preparedData: PreparedHtmlReportDataWithoutAssets,
    htmlFilePath: string,
  ): Promise<void> {
    // Load assets via the asset service
    const assets = await this.assetService.loadAssets();

    // Combine prepared data with loaded assets
    const fullData: PreparedHtmlReportData = {
      ...preparedData,
      inlineCss: assets.inlineCss,
      jsonIconSvg: assets.jsonIconSvg,
    };

    const templatePath = path.join(
      __dirname,
      this.config.HTML_TEMPLATES_DIR,
      this.config.HTML_MAIN_TEMPLATE_FILE,
    );

    const htmlContent = await ejs.renderFile(templatePath, fullData);
    await writeFile(htmlFilePath, htmlContent);

    console.log(`View generated report in a browser: file://${path.resolve(htmlFilePath)}`);
  }
}
