import { injectable } from "tsyringe";
import path from "path";
import { outputConfig } from "../../config/output.config";
import { jsonFilesConfig } from "./json-files.config";
import type { ReportData } from "./report-gen.types";
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

    // Create array of write tasks
    const tasks = [
      this.writeJsonFile(`${jsonFilesConfig.dataFiles.completeReport}.json`, completeReportData),
      this.writeJsonFile(jsonFilesConfig.dataFiles.appStats, reportData.appStats),
      this.writeJsonFile(jsonFilesConfig.dataFiles.appDescription, { appDescription: reportData.appStats.appDescription }),
      this.writeJsonFile(jsonFilesConfig.dataFiles.fileTypes, reportData.fileTypesData),
      this.writeJsonFile(jsonFilesConfig.dataFiles.dbInteractions, reportData.dbInteractions),
      this.writeJsonFile(jsonFilesConfig.dataFiles.procsAndTriggers, reportData.procsAndTriggers),
      this.writeJsonFile(jsonFilesConfig.dataFiles.topLevelJavaClasses, reportData.topLevelJavaClasses),
    ];

    // Add categorized data files
    reportData.categorizedData.forEach(categoryData => {
      tasks.push(
        this.writeJsonFile(
          jsonFilesConfig.getCategoryFilename(categoryData.category),
          categoryData.data
        )
      );
    });

    const results = await Promise.allSettled(tasks);
    
    // Check for any failures and log them
    results.forEach((result, index) => {
      if (result.status === "rejected") {
        console.error(`Failed to write JSON file at index ${index}:`, result.reason);
      }
    });
    
    console.log("Finished generating all JSON files");
  }

  /**
   * Helper method to write a single JSON file with error handling.
   */
  private async writeJsonFile(filename: string, data: unknown): Promise<void> {
    const jsonFilePath = path.join(outputConfig.OUTPUT_DIR, filename);
    const jsonContent = JSON.stringify(data, null, 2);
    await writeFile(jsonFilePath, jsonContent);
    console.log(`Generated JSON file: ${filename}`);
  }
}
