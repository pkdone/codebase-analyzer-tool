import { injectable } from "tsyringe";
import path from "path";
import { appConfig } from "../../config/app.config";
import { jsonFilesConfig } from "./json-files.config";
import type { AppSummaryNameDescArray } from "../../repositories/app-summary/app-summaries.model";
import type { AppStatistics, ProcsAndTriggers, DatabaseIntegrationInfo } from "./report-gen.types";
import { ProjectedFileTypesCountAndLines } from "../../repositories/source/sources.model";

import { writeFile } from "../../common/utils/fs-utils";
import { convertToDisplayName } from "../../common/utils/text-utils";

interface EjsTemplateData {
  appStats: AppStatistics;
  fileTypesData: ProjectedFileTypesCountAndLines[];
  categorizedData: { category: string; label: string; data: AppSummaryNameDescArray }[];
  dbInteractions: DatabaseIntegrationInfo[];
  procsAndTriggers: ProcsAndTriggers;
  jsonFilesConfig: typeof jsonFilesConfig;
  convertToDisplayName: (text: string) => string;
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ejs = require("ejs") as {
  renderFile: (path: string, data: EjsTemplateData) => Promise<string>;
};

/**
 * Class responsible for formatting data into HTML presentation format using EJS templates.
 * This class takes aggregated data structures and converts them to HTML using template files.
 */
@injectable()
export class HtmlReportWriter {
  /**
   * Generate complete HTML report from all data sections using EJS templates and write it to file.
   */
  async writeHTMLReportFile(
    appStats: AppStatistics,
    fileTypesData: ProjectedFileTypesCountAndLines[],
    categorizedData: { category: string; label: string; data: AppSummaryNameDescArray }[],
    dbInteractions: DatabaseIntegrationInfo[],
    procsAndTriggers: ProcsAndTriggers,
    htmlFilePath: string,
  ): Promise<void> {
    const templatePath = path.join(
      __dirname,
      appConfig.HTML_TEMPLATES_DIR,
      appConfig.HTML_MAIN_TEMPLATE_FILE,
    );
    const data: EjsTemplateData = {
      appStats,
      fileTypesData,
      categorizedData,
      dbInteractions,
      procsAndTriggers,
      jsonFilesConfig,
      convertToDisplayName,
    };
    const htmlContent = await ejs.renderFile(templatePath, data);
    await writeFile(htmlFilePath, htmlContent);
    console.log(`View generated report in a browser: file://${path.resolve(htmlFilePath)}`);
  }

  // ...existing code...
}
