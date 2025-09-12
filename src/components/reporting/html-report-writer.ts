import { injectable } from "tsyringe";
import path from "path";
import ejs from "ejs";
import { appConfig } from "../../config/app.config";
import { jsonFilesConfig } from "./json-files.config";
import type { ReportData } from "./report-gen.types";
import { writeFile } from "../../common/utils/fs-utils";
import { convertToDisplayName } from "../../common/utils/text-utils";

interface EjsTemplateData {
  appStats: ReportData["appStats"];
  fileTypesData: ReportData["fileTypesData"];
  categorizedData: ReportData["categorizedData"];
  dbInteractions: ReportData["dbInteractions"];
  procsAndTriggers: ReportData["procsAndTriggers"];
  jsonFilesConfig: typeof jsonFilesConfig;
  convertToDisplayName: (text: string) => string;
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
      appConfig.HTML_TEMPLATES_DIR,
      appConfig.HTML_MAIN_TEMPLATE_FILE,
    );
    const data: EjsTemplateData = {
      appStats: reportData.appStats,
      fileTypesData: reportData.fileTypesData,
      categorizedData: reportData.categorizedData,
      dbInteractions: reportData.dbInteractions,
      procsAndTriggers: reportData.procsAndTriggers,
      jsonFilesConfig,
      convertToDisplayName,
    };
    const htmlContent = await ejs.renderFile(templatePath, data);
    await writeFile(htmlFilePath, htmlContent);
    console.log(`View generated report in a browser: file://${path.resolve(htmlFilePath)}`);
  }
}
