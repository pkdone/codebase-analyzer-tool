import { injectable, inject } from "tsyringe";
import type { SourcesRepository } from "../../../../repositories/sources/sources.repository.interface";
import { repositoryTokens } from "../../../../di/tokens";
import type {
  ProcsAndTriggers,
  ComplexityCounts,
  DatabaseIntegrationInfo,
  ProcsOrTrigsListItem,
} from "./database.types";
import { isComplexityLevel } from "./database.types";
import {
  type ComplexityValue,
  procedureTriggerSchema,
  DEFAULT_COMPLEXITY,
} from "../../../../schemas/source-file.schema";
import type { z } from "zod";
import { logWarn } from "../../../../../common/utils/logging";
import { DATABASE_OBJECT_TYPE_LABELS } from "../../config/reporting.config";
import { NOT_AVAILABLE_PLACEHOLDER } from "../../config/placeholders.config";

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
   * Returns an aggregated summary of stored procedures, functions, and triggers
   * from pre-generated summaries, with per-category complexity breakdowns.
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

    const procedures = this.newComplexityCounts();
    const functions = this.newComplexityCounts();
    const triggers = this.newComplexityCounts();
    const list: ProcsOrTrigsListItem[] = [];

    // Classify procs into PROCEDURE vs FUNCTION and tally complexity
    for (const item of allProcs) {
      const reportItem = this.mapItemToReportFormat(item, "proc");
      list.push(reportItem);
      const bucket =
        reportItem.type === DATABASE_OBJECT_TYPE_LABELS.FUNCTION ? functions : procedures;
      this.incrementComplexity(bucket, reportItem.complexity);
    }

    // Tally triggers
    for (const item of allTrigs) {
      const reportItem = this.mapItemToReportFormat(item, "trigger");
      list.push(reportItem);
      this.incrementComplexity(triggers, reportItem.complexity);
    }

    return { procedures, functions, triggers, list };
  }

  /**
   * Create a zeroed-out complexity counts object.
   */
  private newComplexityCounts(): ComplexityCounts {
    return { total: 0, low: 0, medium: 0, high: 0 };
  }

  /**
   * Increment the appropriate complexity bucket for an item.
   */
  private incrementComplexity(counts: ComplexityCounts, complexity: string): void {
    counts.total++;
    switch (complexity) {
      case "LOW":
        counts.low++;
        break;
      case "MEDIUM":
        counts.medium++;
        break;
      case "HIGH":
        counts.high++;
        break;
      case "INVALID":
        // INVALID is counted in total but not in any complexity bucket
        break;
    }
  }

  /**
   * Transform a single item into the format required for reports.
   * Derives the display type from the item's objectType field when available,
   * falling back to the category (proc -> PROCEDURE, trigger -> TRIGGER).
   */
  private mapItemToReportFormat(
    item: ProcOrTrigItem,
    category: "proc" | "trigger",
  ): ProcsOrTrigsListItem {
    const complexity = this.normalizeComplexity(item.complexity, String(item.name));

    let type: string;
    if (category === "trigger") {
      type = DATABASE_OBJECT_TYPE_LABELS.TRIGGER;
    } else if (item.objectType === "FUNCTION") {
      type = DATABASE_OBJECT_TYPE_LABELS.FUNCTION;
    } else {
      // Default to PROCEDURE for procs without objectType (backward compat)
      type = DATABASE_OBJECT_TYPE_LABELS.PROCEDURE;
    }

    return {
      path: item.filepath,
      type,
      name: String(item.name),
      functionName: String(item.name),
      complexity: complexity,
      complexityReason: String(item.complexityReason || NOT_AVAILABLE_PLACEHOLDER),
      linesOfCode: item.linesOfCode,
      purpose: item.purpose,
    };
  }

  /**
   * Normalize and validate complexity values, providing fallback for invalid values
   */
  private normalizeComplexity(complexity: unknown, itemName: string): ComplexityValue {
    if (isComplexityLevel(complexity)) return complexity;
    logWarn(
      `Invalid complexity value '${String(complexity)}' found for ${itemName}. Defaulting to ${DEFAULT_COMPLEXITY}.`,
    );
    return DEFAULT_COMPLEXITY;
  }
}
