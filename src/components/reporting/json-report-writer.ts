import { injectable } from "tsyringe";
import path from "path";
import { appConfig } from "../../config/app.config";
import { jsonFilesConfig } from "./json-files.config";
import type { AppSummaryNameDescArray } from "../../repositories/app-summary/app-summaries.model";
import type { AppStatistics, ProcsAndTriggers, DatabaseIntegrationInfo } from "./report-gen.types";
import { ProjectedFileTypesCountAndLines } from "../../repositories/source/sources.model";
import { writeFile } from "../../common/utils/fs-utils";

/**
 * Class responsible for writing JSON data files to the output directory.
 * This class takes aggregated data structures and writes them as JSON files.
 */
@injectable()
export class JsonReportWriter {
  /**
   * Write JSON files for all data types including categories and additional data sections.
   */
  async writeAllJSONFiles(
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
      data:
        | AppSummaryNameDescArray
        | AppStatistics
        | ProjectedFileTypesCountAndLines[]
        | DatabaseIntegrationInfo[]
        | ProcsAndTriggers
        | { appDescription: string }
        | typeof completeReportData;
    }[] = [
      // Complete report file
      { filename: jsonFilesConfig.dataFiles.completeReport, data: completeReportData },
      // Category data files
      ...categorizedData.map((categoryData) => ({
        filename: jsonFilesConfig.getCategoryFilename(categoryData.category),
        data: categoryData.data,
      })),
      // Additional data files
      { filename: jsonFilesConfig.dataFiles.appStats, data: appStats },
      {
        filename: jsonFilesConfig.dataFiles.appDescription,
        data: { appDescription: appStats.appDescription },
      },
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
}
