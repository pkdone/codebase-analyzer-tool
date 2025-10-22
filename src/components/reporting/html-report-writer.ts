import { injectable } from "tsyringe";
import path from "path";
import ejs from "ejs";
import { outputConfig } from "../../config/output.config";
import { writeFile } from "../../common/fs/file-operations";
import { promises as fs } from "fs";
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
import type {
  ProjectedFileTypesCountAndLines,
  HierarchicalTopLevelJavaClassDependencies,
} from "../../repositories/source/sources.model";
import type { AppSummaryNameDescArray } from "../../repositories/app-summary/app-summaries.model";
import type { TableViewModel } from "./view-models/table-view-model";

export interface PreparedHtmlReportData {
  appStats: AppStatistics;
  fileTypesData: ProjectedFileTypesCountAndLines[];
  fileTypesPieChartPath: string;
  categorizedData: {
    category: string;
    label: string;
    data: AppSummaryNameDescArray;
    tableViewModel: TableViewModel;
  }[];
  integrationPoints: IntegrationPointInfo[];
  dbInteractions: DatabaseIntegrationInfo[];
  procsAndTriggers: ProcsAndTriggers;
  topLevelJavaClasses: HierarchicalTopLevelJavaClassDependencies[];
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
  topLevelJavaClassesTableViewModel: TableViewModel;
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
        repository?: string;
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
      repository?: string;
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

  // Table view models for enhanced sections
  microservicesTableViewModel: TableViewModel;
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

    // Copy CSS file to output directory
    await this.copyCssFile(htmlFilePath);

    console.log(`View generated report in a browser: file://${path.resolve(htmlFilePath)}`);
  }

  /**
   * Copy the CSS file from the templates directory to the output directory
   */
  private async copyCssFile(htmlFilePath: string): Promise<void> {
    try {
      const outputDir = path.dirname(htmlFilePath);
      const cssSourcePath = path.join(__dirname, outputConfig.HTML_TEMPLATES_DIR, "style.css");
      const cssDestPath = path.join(outputDir, "style.css");

      // Copy the CSS file
      await fs.copyFile(cssSourcePath, cssDestPath);
      console.log(`CSS file copied to: ${cssDestPath}`);
    } catch (error) {
      console.error("Failed to copy CSS file:", error);
      // Don't throw - the report can still work without CSS
    }
  }
}
