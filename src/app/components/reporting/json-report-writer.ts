import { injectable, inject } from "tsyringe";
import path from "node:path";
import { coreTokens } from "../../di/tokens";
import type { OutputConfigType } from "../../config/output.config";
import { writeFile } from "../../../common/fs/file-operations";
import { logErr, logInfo } from "../../../common/utils/logging";

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
  constructor(@inject(coreTokens.OutputConfig) private readonly config: OutputConfigType) {}

  /**
   * Write all prepared JSON data files to the output directory.
   */
  async writeAllJSONFiles(preparedDataList: PreparedJsonData[]): Promise<void> {
    logInfo("Generating JSON files for all data sections...");

    const tasks = preparedDataList.map(async ({ filename, data }) =>
      this.writeJsonFile(filename, data),
    );

    const results = await Promise.allSettled(tasks);
    const failures = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");

    for (const failure of failures) {
      logErr("Failed to write a JSON file", failure.reason);
    }

    logInfo("Finished generating all JSON files");
  }

  /**
   * Helper method to write a single JSON file with error handling.
   */
  private async writeJsonFile(filename: string, data: unknown): Promise<void> {
    const jsonFilePath = path.join(this.config.OUTPUT_DIR, filename);
    const jsonContent = JSON.stringify(data, null, 2);
    await writeFile(jsonFilePath, jsonContent);
    logInfo(`Generated JSON file: ${filename}`);
  }
}
