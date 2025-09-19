import { injectable } from "tsyringe";
import path from "path";
import ejs from "ejs";
import { outputConfig } from "../../config/output.config";
import { writeFile } from "../../common/utils/file-operations";

export interface PreparedHtmlReportData {
  appStats: unknown;
  fileTypesData: unknown;
  fileTypesPieChartPath: string;
  categorizedData: {
    category: string;
    label: string;
    data: unknown[];
    tableViewModel: unknown;
  }[];
  dbInteractions: unknown;
  procsAndTriggers: unknown;
  topLevelJavaClasses: unknown;
  jsonFilesConfig: unknown;
  convertToDisplayName: (text: string) => string;
  fileTypesTableViewModel: unknown;
  dbInteractionsTableViewModel: unknown;
  procsAndTriggersTableViewModel: unknown;
  topLevelJavaClassesTableViewModel: unknown;
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
  async writeHTMLReportFile(preparedData: PreparedHtmlReportData, htmlFilePath: string): Promise<void> {
    const templatePath = path.join(
      __dirname,
      outputConfig.HTML_TEMPLATES_DIR,
      outputConfig.HTML_MAIN_TEMPLATE_FILE,
    );
    
    const htmlContent = await ejs.renderFile(templatePath, preparedData);
    await writeFile(htmlFilePath, htmlContent);
    console.log(
      `View generated report in a browser: file://${path.resolve(htmlFilePath)}`,
    );
  }

}
