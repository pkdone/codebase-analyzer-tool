import { injectable, inject } from "tsyringe";
import { appConfig } from "../../../config/app.config";
import type { SourcesRepository } from "../../../repositories/source/sources.repository.interface";
import { TOKENS } from "../../../di/tokens";
import type { ProcsAndTriggers, DatabaseIntegrationInfo } from "../report-gen.types";
import { Complexity, isComplexity } from "../report-gen.types";
import { logWarningMsg } from "../../../common/utils/error-utils";

/**
 * Data provider responsible for aggregating database-related information for reports.
 * Handles database integrations, stored procedures, and triggers.
 */
@injectable()
export class DatabaseReportDataProvider {
  constructor(
    @inject(TOKENS.SourcesRepository) private readonly sourcesRepository: SourcesRepository,
  ) {}

  /**
   * Returns a list of database integrations.
   */
  async getDatabaseInteractions(projectName: string): Promise<DatabaseIntegrationInfo[]> {
    const records = await this.sourcesRepository.getProjectDatabaseIntegrations(projectName, [
      ...appConfig.CODE_FILE_EXTENSIONS,
    ]);

    return records.map((record) => {
      const { summary, filepath } = record;
      const databaseIntegration = summary?.databaseIntegration;
      if (summary && databaseIntegration) {
        return {
          path: summary.classpath ?? filepath,
          mechanism: databaseIntegration.mechanism,
          description: databaseIntegration.description,
          codeExample: databaseIntegration.codeExample,
        };
      }
      // This should not happen due to the filter above, but satisfies TypeScript
      throw new Error("Record missing required summary or databaseIntegration");
    });
  }

  /**
   * Returns an aggregated summary of stored procedures and triggers.
   */
  async getStoredProceduresAndTriggers(projectName: string): Promise<ProcsAndTriggers> {
    const procsAndTriggers: ProcsAndTriggers = {
      procs: { total: 0, low: 0, medium: 0, high: 0, list: [] },
      trigs: { total: 0, low: 0, medium: 0, high: 0, list: [] },
    };

    const records = await this.sourcesRepository.getProjectStoredProceduresAndTriggers(
      projectName,
      [...appConfig.CODE_FILE_EXTENSIONS],
    );

    for (const record of records) {
      const summary = record.summary;

      if (!summary) {
        console.log(
          `No stored procs / triggers summary exists for file: ${record.filepath}. Skipping.`,
        );
        continue;
      }

      // Process stored procedures and triggers using the helper method
      this.processDbObjects(
        summary.storedProcedures,
        procsAndTriggers.procs,
        "STORED PROCEDURE",
        record.filepath,
      );
      this.processDbObjects(summary.triggers, procsAndTriggers.trigs, "TRIGGER", record.filepath);
    }

    return procsAndTriggers;
  }

  /**
   * Process database objects (stored procedures or triggers) and populate target section
   */
  private processDbObjects(
    items:
      | {
          name: string;
          complexity: unknown;
          complexityReason?: string;
          linesOfCode: number;
          purpose: string;
        }[]
      | undefined,
    target: ProcsAndTriggers["procs"] | ProcsAndTriggers["trigs"],
    type: "STORED PROCEDURE" | "TRIGGER",
    filepath: string,
  ) {
    for (const item of items ?? []) {
      target.total++;
      this.incrementComplexityCount(target, item.complexity);
      target.list.push({
        path: filepath,
        type: type,
        functionName: item.name,
        complexity: isComplexity(item.complexity) ? item.complexity : Complexity.LOW,
        complexityReason: item.complexityReason ?? "N/A",
        linesOfCode: item.linesOfCode,
        purpose: item.purpose,
      });
    }
  }

  /**
   * Increment the complexity count on a procs/trigs section.
   */
  private incrementComplexityCount(
    section: ProcsAndTriggers["procs"] | ProcsAndTriggers["trigs"],
    complexity: unknown, // Accept unknown for robust checking
  ) {
    if (!isComplexity(complexity)) {
      logWarningMsg(
        `Unexpected or missing complexity value encountered: ${String(complexity)}. Defaulting to LOW.`,
      );
      section.low++; // Default to LOW to maintain consistency
      return;
    }

    // 'complexity' is now safely typed as Complexity
    switch (complexity) {
      case Complexity.LOW:
        section.low++;
        break;
      case Complexity.MEDIUM:
        section.medium++;
        break;
      case Complexity.HIGH:
        section.high++;
        break;
      // No default needed due to exhaustive check
    }
  }
}
