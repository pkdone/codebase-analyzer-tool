import { injectable, inject } from "tsyringe";
import type { SourcesRepository } from "../../../repositories/sources/sources.repository.interface";
import { repositoryTokens } from "../../../di/tokens";
import type { ProcsAndTriggers, DatabaseIntegrationInfo } from "../report-gen.types";
import { Complexity, isComplexityLevel } from "../report-gen.types";
import { procedureTriggerSchema } from "../../../schemas/sources.schema";
import type { z } from "zod";
import { logOneLineWarning } from "../../../../common/utils/logging";

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
    @inject(repositoryTokens.SourcesRepository)
    private readonly sourcesRepository: SourcesRepository,
  ) {}

  /**
   * Returns a list of database integrations.
   */
  async getDatabaseInteractions(projectName: string): Promise<DatabaseIntegrationInfo[]> {
    const records = await this.sourcesRepository.getProjectDatabaseIntegrations(projectName);
    return records.flatMap((record) => {
      const { summary } = record;
      if (summary?.databaseIntegration) {
        const db = summary.databaseIntegration;
        return [
          {
            path: summary.namespace ?? record.filepath,
            mechanism: db.mechanism,
            name: db.name,
            description: db.description,
            databaseName: db.databaseName,
            tablesAccessed: db.tablesAccessed,
            operationType: db.operationType,
            queryPatterns: db.queryPatterns,
            transactionHandling: db.transactionHandling,
            protocol: db.protocol,
            connectionInfo: db.connectionInfo,
            codeExample: db.codeExample,
          },
        ];
      }
      return []; // This item will be filtered out by flatMap
    });
  }

  /**
   * Returns an aggregated summary of stored procedures and triggers from pre-generated summaries.
   */
  async buildProceduresAndTriggersSummary(projectName: string): Promise<ProcsAndTriggers> {
    const records = await this.sourcesRepository.getProjectStoredProceduresAndTriggers(projectName);
    const allProcs: ProcOrTrigItem[] = [];
    const allTrigs: ProcOrTrigItem[] = [];

    // Single iteration over records to collect both procedures and triggers
    for (const record of records) {
      if (record.summary?.storedProcedures) {
        allProcs.push(
          ...record.summary.storedProcedures.map((proc) => ({
            ...proc,
            filepath: record.filepath,
          })),
        );
      }
      if (record.summary?.triggers) {
        allTrigs.push(
          ...record.summary.triggers.map((trig) => ({ ...trig, filepath: record.filepath })),
        );
      }
    }

    const procs = this.summarizeItemsByComplexity(allProcs, STORED_PROCEDURE_TYPE);
    const trigs = this.summarizeItemsByComplexity(allTrigs, TRIGGER_TYPE);
    return { procs, trigs };
  }

  /**
   * Summarize items by their complexity level.
   * Groups items and counts them based on their complexity property.
   * Combines aggregation and mapping in a single pass for better performance.
   */
  private summarizeItemsByComplexity(
    items: ProcOrTrigItem[],
    type: typeof STORED_PROCEDURE_TYPE | typeof TRIGGER_TYPE,
  ): ProcsAndTriggers["procs"] {
    return items.reduce(
      (acc, item) => {
        const complexity = this.normalizeComplexity(item.complexity, item.name);
        acc.total++;
        switch (complexity) {
          case "LOW":
            acc.low++;
            break;
          case "MEDIUM":
            acc.medium++;
            break;
          case "HIGH":
            acc.high++;
            break;
          default: {
            // This ensures exhaustiveness. The `normalizeComplexity` function
            // should prevent this from being hit, but it's good practice.
            const exhaustiveCheck: never = complexity;
            return exhaustiveCheck;
          }
        }
        acc.list.push(this.mapItemToReportFormat(item, type));
        return acc;
      },
      {
        total: 0,
        low: 0,
        medium: 0,
        high: 0,
        list: [] as ReturnType<typeof this.mapItemToReportFormat>[],
      },
    );
  }

  /**
   * Transform a single item into the format required for reports
   */
  private mapItemToReportFormat(
    item: ProcOrTrigItem,
    type: typeof STORED_PROCEDURE_TYPE | typeof TRIGGER_TYPE,
  ) {
    const complexity = this.normalizeComplexity(item.complexity, item.name);

    return {
      path: item.filepath,
      type: type,
      name: item.name,
      functionName: item.name,
      complexity: complexity,
      complexityReason: item.complexityReason || "N/A",
      linesOfCode: item.linesOfCode,
      purpose: item.purpose,
    };
  }

  /**
   * Normalize and validate complexity values, providing fallback for invalid values
   */
  private normalizeComplexity(complexity: unknown, itemName: string): Complexity {
    if (isComplexityLevel(complexity)) return complexity;
    logOneLineWarning(
      `Invalid complexity value '${String(complexity)}' found for ${itemName}. Defaulting to LOW.`,
    );
    return "LOW";
  }
}
