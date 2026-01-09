import { injectable, inject } from "tsyringe";
import type { SourcesRepository } from "../../../../repositories/sources/sources.repository.interface";
import { repositoryTokens } from "../../../../di/tokens";
import type {
  ProcsAndTriggers,
  DatabaseIntegrationInfo,
  Complexity,
  ProcsOrTrigsListItem,
} from "./database.types";
import { isComplexityLevel } from "./database.types";
import { procedureTriggerSchema } from "../../../../schemas/sources.schema";
import type { z } from "zod";
import { logWarn } from "../../../../../common/utils/logging";
import { DATABASE_OBJECT_TYPE_LABELS } from "../../reporting.constants";
import {
  NOT_AVAILABLE_PLACEHOLDER,
  DEFAULT_COMPLEXITY,
} from "../../../../../common/constants/application.constants";

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
  async getStoredProceduresAndTriggers(projectName: string): Promise<ProcsAndTriggers> {
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

    const procs = this.summarizeItemsByComplexity(
      allProcs,
      DATABASE_OBJECT_TYPE_LABELS.STORED_PROCEDURE,
    );
    const trigs = this.summarizeItemsByComplexity(allTrigs, DATABASE_OBJECT_TYPE_LABELS.TRIGGER);
    return { procs, trigs };
  }

  /**
   * Summarize items by their complexity level.
   * Groups items and counts them based on their complexity property.
   * Combines aggregation and mapping in a single pass for better performance.
   */
  private summarizeItemsByComplexity(
    items: ProcOrTrigItem[],
    type:
      | typeof DATABASE_OBJECT_TYPE_LABELS.STORED_PROCEDURE
      | typeof DATABASE_OBJECT_TYPE_LABELS.TRIGGER,
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
          case "INVALID":
            // Skip invalid complexity values - they indicate LLM returned unrecognized data
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
        list: [] as ProcsOrTrigsListItem[],
      },
    );
  }

  /**
   * Transform a single item into the format required for reports
   */
  private mapItemToReportFormat(
    item: ProcOrTrigItem,
    type:
      | typeof DATABASE_OBJECT_TYPE_LABELS.STORED_PROCEDURE
      | typeof DATABASE_OBJECT_TYPE_LABELS.TRIGGER,
  ): ProcsOrTrigsListItem {
    const complexity = this.normalizeComplexity(item.complexity, item.name);

    return {
      path: item.filepath,
      type: type,
      name: item.name,
      functionName: item.name,
      complexity: complexity,
      complexityReason: item.complexityReason || NOT_AVAILABLE_PLACEHOLDER,
      linesOfCode: item.linesOfCode,
      purpose: item.purpose,
    };
  }

  /**
   * Normalize and validate complexity values, providing fallback for invalid values
   */
  private normalizeComplexity(complexity: unknown, itemName: string): Complexity {
    if (isComplexityLevel(complexity)) return complexity;
    logWarn(
      `Invalid complexity value '${String(complexity)}' found for ${itemName}. Defaulting to ${DEFAULT_COMPLEXITY}.`,
    );
    return DEFAULT_COMPLEXITY;
  }
}
