import { injectable } from "tsyringe";
import path from "path";
import { outputConfig } from "./config/output.config";
import { writeFile } from "../../../common/fs/file-operations";

export interface PreparedJsonData {
  filename: string;
  data: unknown;
}

/**
 * Class responsible for writing prepared JSON data files to the output directory.
 * This is a pure writer component that only handles JSON serialization and file writing.
 */
@injectable()
export class JsonReportWriter {
  /**
   * Write all prepared JSON data files to the output directory.
   */
  async writeAllJSONFiles(preparedDataList: PreparedJsonData[]): Promise<void> {
    console.log("Generating JSON files for all data sections...");

    const tasks = preparedDataList.map(async ({ filename, data }) =>
      this.writeJsonFile(filename, data),
    );

    const results = await Promise.allSettled(tasks);
    const failures = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");

    for (const failure of failures) {
      console.error(`Failed to write a JSON file:`, failure.reason);
    }

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
