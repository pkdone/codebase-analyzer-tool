import { injectable, inject } from "tsyringe";
import { appConfig } from "../../../config/app.config";
import type { SourcesRepository } from "../../../repositories/source/sources.repository.interface";
import { TOKENS } from "../../../di/tokens";
import type { ProcsAndTriggers, DatabaseIntegrationInfo } from "../report-gen.types";
import { Complexity, isComplexity } from "../report-gen.types";
import { procedureTriggerSchema } from "../../../schemas/sources.schema";
import type { z } from "zod";

// Constants for stored procedures and triggers
const STORED_PROCEDURE_TYPE = "STORED PROCEDURE" as const;
const TRIGGER_TYPE = "TRIGGER" as const;

// Define a more specific type for the items
type ProcOrTrigItem = z.infer<typeof procedureTriggerSchema> & { filepath: string };

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
    const procs = this.aggregateProcsOrTriggersForReport(allProcs, STORED_PROCEDURE_TYPE);
    const trigs = this.aggregateProcsOrTriggersForReport(allTrigs, TRIGGER_TYPE);
    return { procs, trigs };
  }

  /**
   * Aggregate database objects (procedures or triggers) using optimized imperative approach
   */
  private aggregateProcsOrTriggersForReport(
    items: ProcOrTrigItem[],
    type: typeof STORED_PROCEDURE_TYPE | typeof TRIGGER_TYPE,
  ): ProcsAndTriggers["procs"] {
    const result: ProcsAndTriggers["procs"] = { total: 0, low: 0, medium: 0, high: 0, list: [] };

    for (const item of items) {
      const complexity = isComplexity(item.complexity) ? item.complexity : Complexity.LOW;
      if (!isComplexity(item.complexity))
        console.warn(
          `Invalid complexity value '${item.complexity}' found for ${item.name}. Defaulting to LOW.`,
        );
      result.total++;

      switch (complexity) {
        case Complexity.LOW:
          result.low++;
          break;
        case Complexity.MEDIUM:
          result.medium++;
          break;
        case Complexity.HIGH:
          result.high++;
          break;
      }

      result.list.push({
        path: item.filepath,
        type: type,
        functionName: item.name,
        complexity: complexity,
        complexityReason: item.complexityReason || "N/A",
        linesOfCode: item.linesOfCode,
        purpose: item.purpose,
      });
    }
    return result;
  }
}
