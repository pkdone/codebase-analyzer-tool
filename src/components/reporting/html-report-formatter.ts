import { injectable } from "tsyringe";
import path from "path";
import { appConfig } from "../../config/app.config";
import { jsonFilesConfig } from "./json-files.config";
import type { AppSummaryNameDescArray } from "../../repositories/app-summary/app-summaries.model";
import type { AppStatistics, ProcsAndTriggers, DatabaseIntegrationInfo } from "./report-gen.types";
import { ProjectedFileTypesCountAndLines } from "../../repositories/source/sources.model";

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
export class HtmlReportFormatter {
  /**
   * Generate complete HTML report from all data sections using EJS templates.
   */
  async generateCompleteHTMLReport(
    appStats: AppStatistics,
    fileTypesData: ProjectedFileTypesCountAndLines[],
    categorizedData: { category: string; label: string; data: AppSummaryNameDescArray }[],
    dbInteractions: DatabaseIntegrationInfo[],
    procsAndTriggers: ProcsAndTriggers,
  ): Promise<string> {
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
      convertToDisplayName: this.convertToDisplayName.bind(this),
    };
    return await ejs.renderFile(templatePath, data);
  }

  /**
   * Convert camelCase or compound words to space-separated words with proper capitalization.
   */
  private convertToDisplayName(text: string): string {
    const spacedText = text.replace(/([a-z])([A-Z])/g, "$1 $2");
    return spacedText.replace(/\b\w/g, (char) => char.toUpperCase());
  }
}
