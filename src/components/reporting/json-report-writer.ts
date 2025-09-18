import { injectable } from "tsyringe";
import path from "path";
import { outputConfig } from "../../config/output.config";
import { jsonFilesConfig } from "./json-files.config";
import type { AppSummaryNameDescArray } from "../../repositories/app-summary/app-summaries.model";
import type {
  ReportData,
  AppStatistics,
  ProcsAndTriggers,
  DatabaseIntegrationInfo,
} from "./report-gen.types";
import {
  ProjectedFileTypesCountAndLines,
  ProjectedTopLevelJavaClassDependencies,
} from "../../repositories/source/sources.model";
import { writeFile } from "../../common/utils/file-operations";

/**
 * Class responsible for writing JSON data files to the output directory.
 * This class takes aggregated data structures and writes them as JSON files.
 */
@injectable()
export class JsonReportWriter {
  /**
   * Write JSON files for all data types including categories and additional data sections.
   */
  async writeAllJSONFiles(reportData: ReportData): Promise<void> {
    console.log("Generating JSON files for all data sections...");
    const completeReportData = {
      appStats: reportData.appStats,
      fileTypesData: reportData.fileTypesData,
      categorizedData: reportData.categorizedData,
      dbInteractions: reportData.dbInteractions,
      procsAndTriggers: reportData.procsAndTriggers,
      topLevelJavaClasses: reportData.topLevelJavaClasses,
    };
    const jsonFiles: {
      filename: string;
      data:
        | AppSummaryNameDescArray
        | AppStatistics
        | ProjectedFileTypesCountAndLines[]
        | DatabaseIntegrationInfo[]
        | ProcsAndTriggers
        | { appDescription: string }
        | ProjectedTopLevelJavaClassDependencies[]
        | typeof completeReportData;
    }[] = [
      { filename: `${jsonFilesConfig.dataFiles.completeReport}.json`, data: completeReportData },
      ...reportData.categorizedData.map((categoryData) => ({
        filename: jsonFilesConfig.getCategoryFilename(categoryData.category),
        data: categoryData.data,
      })),
      { filename: jsonFilesConfig.dataFiles.appStats, data: reportData.appStats },
      {
        filename: jsonFilesConfig.dataFiles.appDescription,
        data: { appDescription: reportData.appStats.appDescription },
      },
      { filename: jsonFilesConfig.dataFiles.fileTypes, data: reportData.fileTypesData },
      { filename: jsonFilesConfig.dataFiles.dbInteractions, data: reportData.dbInteractions },
      { filename: jsonFilesConfig.dataFiles.procsAndTriggers, data: reportData.procsAndTriggers },
      {
        filename: jsonFilesConfig.dataFiles.topLevelJavaClasses,
        data: reportData.topLevelJavaClasses,
      },
    ];
    const jsonFilePromises = jsonFiles.map(async (fileInfo) => {
      const jsonFilePath = path.join(outputConfig.OUTPUT_DIR, fileInfo.filename);
      const jsonContent = JSON.stringify(fileInfo.data, null, 2);
      await writeFile(jsonFilePath, jsonContent);
      console.log(`Generated JSON file: ${fileInfo.filename}`);
    });
    const results = await Promise.allSettled(jsonFilePromises);
    results.forEach((result, index) => {
      // Check for any failures and log them
      if (result.status === "rejected") {
        console.error(`Failed to write JSON file: ${jsonFiles[index].filename}`, result.reason);
      }
    });
    console.log("Finished generating all JSON files");
  }
}
