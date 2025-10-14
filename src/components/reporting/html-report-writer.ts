import { injectable } from "tsyringe";
import path from "path";
import ejs from "ejs";
import { outputConfig } from "../../config/output.config";
import { writeFile } from "../../common/fs/file-operations";
import type {
  AppStatistics,
  ProcsAndTriggers,
  DatabaseIntegrationInfo,
  IntegrationPointInfo,
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
    console.log(`View generated report in a browser: file://${path.resolve(htmlFilePath)}`);
  }
}
