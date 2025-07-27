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
    const validRecords = records.filter((record) => record.summary?.databaseIntegration);
    return validRecords.map((record) => {
      const summary = record.summary;
      const databaseIntegration = summary?.databaseIntegration;

      if (summary && databaseIntegration) {
        return {
          path: summary.classpath ?? record.filepath,
          mechanism: databaseIntegration.mechanism,
          description: databaseIntegration.description,
          codeExample: databaseIntegration.codeExample,
        };
      } else {
        return {
          path: record.filepath,
          mechanism: "UNKNOWN",
          description: "Unknown database integration",
          codeExample: "N/A",
        };
      }
    });
  }

  /**
   * Returns an aggregated summary of stored procedures and triggers.
   */
  async getStoredProceduresAndTriggers(projectName: string): Promise<ProcsAndTriggers> {
    const records = await this.sourcesRepository.getProjectStoredProceduresAndTriggers(
      projectName,
      [...appConfig.CODE_FILE_EXTENSIONS],
    );
    const allProcs = records.flatMap(
      (record) =>
        record.summary?.storedProcedures?.map((proc) => ({ ...proc, filepath: record.filepath })) ??
        [],
    );
    const allTrigs = records.flatMap(
      (record) =>
        record.summary?.triggers?.map((trig) => ({ ...trig, filepath: record.filepath })) ?? [],
    );
    const procs = this.aggregateProcsOrTriggersForReport(allProcs, "STORED PROCEDURE");
    const trigs = this.aggregateProcsOrTriggersForReport(allTrigs, "TRIGGER");
    return { procs, trigs };
  }

  /**
   * Aggregate database objects (procedures or triggers) using functional programming approach
   */
  private aggregateProcsOrTriggersForReport(
    items: {
      name: string;
      complexity: unknown;
      complexityReason?: string;
      linesOfCode: number;
      purpose: string;
      filepath: string;
    }[],
    type: "STORED PROCEDURE" | "TRIGGER",
  ): ProcsAndTriggers["procs"] {
    return items.reduce<ProcsAndTriggers["procs"]>(
      (acc, item) => {
        const validComplexity = isComplexity(item.complexity) ? item.complexity : Complexity.LOW;
        if (!isComplexity(item.complexity))
          logWarningMsg(
            `Unexpected or missing complexity value encountered: ${String(item.complexity)}. Defaulting to LOW.`,
          );
        return {
          total: acc.total + 1,
          low: acc.low + (validComplexity === Complexity.LOW ? 1 : 0),
          medium: acc.medium + (validComplexity === Complexity.MEDIUM ? 1 : 0),
          high: acc.high + (validComplexity === Complexity.HIGH ? 1 : 0),
          list: [
            ...acc.list,
            {
              path: item.filepath,
              type: type,
              functionName: item.name,
              complexity: validComplexity,
              complexityReason: item.complexityReason ?? "N/A",
              linesOfCode: item.linesOfCode,
              purpose: item.purpose,
            },
          ],
        };
      },
      { total: 0, low: 0, medium: 0, high: 0, list: [] },
    );
  }
}
