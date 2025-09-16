import { injectable } from "tsyringe";
import path from "path";
import ejs from "ejs";
import { outputConfig } from "../../config/output.config";
import { jsonFilesConfig } from "./json-files.config";
import type { ReportData } from "./report-gen.types";
import { writeFile } from "../../common/utils/file-operations";
import { convertToDisplayName } from "../../common/utils/text-utils";
import { TableViewModel, type DisplayableTableRow } from "./view-models/table-view-model";

interface EjsTemplateData {
  appStats: ReportData["appStats"];
  fileTypesData: ReportData["fileTypesData"];
  categorizedData: {
    category: string;
    label: string;
    data: unknown[];
    tableViewModel: TableViewModel;
  }[];
  dbInteractions: ReportData["dbInteractions"];
  procsAndTriggers: ReportData["procsAndTriggers"];
  jsonFilesConfig: typeof jsonFilesConfig;
  convertToDisplayName: (text: string) => string;
  fileTypesTableViewModel: TableViewModel;
  dbInteractionsTableViewModel: TableViewModel;
  procsAndTriggersTableViewModel: TableViewModel;
}

/**
 * Class responsible for formatting data into HTML presentation format using EJS templates.
 * This class takes aggregated data structures and converts them to HTML using template files.
 */
@injectable()
export class HtmlReportWriter {
  /**
   * Generate complete HTML report from all data sections using EJS templates and write it to file.
   */
  async writeHTMLReportFile(reportData: ReportData, htmlFilePath: string): Promise<void> {
    const templatePath = path.join(
      __dirname,
      outputConfig.HTML_TEMPLATES_DIR,
      outputConfig.HTML_MAIN_TEMPLATE_FILE,
    );
    // Create view models for file types summary
    const fileTypesDisplayData = reportData.fileTypesData.map((item) => ({
      "File Type": item.fileType,
      "Files Count": item.files,
      "Lines Count": item.lines,
    }));
    const fileTypesTableViewModel = new TableViewModel(fileTypesDisplayData);

    // Create view models for categorized data
    const categorizedDataWithViewModels = reportData.categorizedData.map((category) => ({
      ...category,
      tableViewModel: new TableViewModel(category.data as DisplayableTableRow[]),
    }));

    // Create view models for database interactions
    const dbInteractionsTableViewModel = new TableViewModel(
      reportData.dbInteractions as unknown as DisplayableTableRow[],
    );

    // Create view model for stored procedures and triggers
    const combinedProcsTrigsList = [
      ...reportData.procsAndTriggers.procs.list,
      ...reportData.procsAndTriggers.trigs.list,
    ];
    const procsAndTriggersTableViewModel = new TableViewModel(
      combinedProcsTrigsList as unknown as DisplayableTableRow[],
    );

    const data: EjsTemplateData = {
      appStats: reportData.appStats,
      fileTypesData: reportData.fileTypesData,
      categorizedData: categorizedDataWithViewModels,
      dbInteractions: reportData.dbInteractions,
      procsAndTriggers: reportData.procsAndTriggers,
      jsonFilesConfig,
      convertToDisplayName,
      fileTypesTableViewModel,
      dbInteractionsTableViewModel,
      procsAndTriggersTableViewModel,
    };
    const htmlContent = await ejs.renderFile(templatePath, data);
    await writeFile(htmlFilePath, htmlContent);
    console.log(`View generated report in a browser: file://${path.resolve(htmlFilePath)}`);
  }
}
