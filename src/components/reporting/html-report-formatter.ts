import { injectable } from "tsyringe";
import path from "path";
import { appConfig } from "../../config/app.config";
import { jsonFilesConfig } from "./json-files.config";
import type { AppSummaryNameDescArray } from "../../repositories/app-summary/app-summaries.model";
import type { AppStatistics, ProcsAndTriggers, DatabaseIntegrationInfo } from "./report-gen.types";
import { ProjectedFileTypesCountAndLines } from "../../repositories/source/sources.model";
import { writeFile } from "../../common/utils/fs-utils";

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
   * Also writes JSON files for each category and all data sections.
   */
  async generateCompleteHTMLReport(
    appStats: AppStatistics,
    fileTypesData: ProjectedFileTypesCountAndLines[],
    categorizedData: { category: string; label: string; data: AppSummaryNameDescArray }[],
    dbInteractions: DatabaseIntegrationInfo[],
    procsAndTriggers: ProcsAndTriggers,
  ): Promise<string> {
    await this.writeAllJSONFiles(categorizedData, appStats, fileTypesData, dbInteractions, procsAndTriggers);
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
   * Write JSON files for all data types including categories and additional data sections.
   */
  private async writeAllJSONFiles(
    categorizedData: { category: string; label: string; data: AppSummaryNameDescArray }[],
    appStats: AppStatistics,
    fileTypesData: ProjectedFileTypesCountAndLines[],
    dbInteractions: DatabaseIntegrationInfo[],
    procsAndTriggers: ProcsAndTriggers,
  ): Promise<void> {
    console.log("Generating JSON files for all data sections...");

    // Prepare complete report data
    const completeReportData = {
      appStats,
      fileTypesData,
      categorizedData,
      dbInteractions,
      procsAndTriggers,
    };

    // Prepare all JSON files to write
    const jsonFiles: { 
      filename: string; 
      data: AppSummaryNameDescArray | AppStatistics | ProjectedFileTypesCountAndLines[] | DatabaseIntegrationInfo[] | ProcsAndTriggers | { appDescription: string } | typeof completeReportData
    }[] = [
      // Complete report file
      { filename: jsonFilesConfig.dataFiles.completeReport, data: completeReportData },
      // Category data files
      ...categorizedData.map(categoryData => ({
        filename: jsonFilesConfig.getCategoryFilename(categoryData.category),
        data: categoryData.data
      })),
      // Additional data files
      { filename: jsonFilesConfig.dataFiles.appStats, data: appStats },
      { filename: jsonFilesConfig.dataFiles.appDescription, data: { appDescription: appStats.appDescription } },
      { filename: jsonFilesConfig.dataFiles.fileTypes, data: fileTypesData },
      { filename: jsonFilesConfig.dataFiles.dbInteractions, data: dbInteractions },
      { filename: jsonFilesConfig.dataFiles.procsAndTriggers, data: procsAndTriggers },
    ];

    // Write all JSON files in parallel
    const jsonFilePromises = jsonFiles.map(async (fileInfo) => {
      const jsonFilePath = path.join(appConfig.OUTPUT_DIR, fileInfo.filename);
      const jsonContent = JSON.stringify(fileInfo.data, null, 2);
      await writeFile(jsonFilePath, jsonContent);
      console.log(`Generated JSON file: ${fileInfo.filename}`);
    });

    await Promise.all(jsonFilePromises);
    console.log("Finished generating all JSON files");
  }

  /**
   * Convert camelCase or compound words to space-separated words with proper capitalization.
   */
  private convertToDisplayName(text: string): string {
    const spacedText = text.replace(/([a-z])([A-Z])/g, "$1 $2");
    return spacedText.replace(/\b\w/g, (char) => char.toUpperCase());
  }
}
