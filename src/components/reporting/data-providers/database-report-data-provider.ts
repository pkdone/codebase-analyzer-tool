import { injectable, inject } from "tsyringe";
import { fileProcessingConfig } from "../../../config/file-processing.config";
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
  private readonly codeFileExtensions = [...fileProcessingConfig.CODE_FILE_EXTENSIONS];

  constructor(
    @inject(TOKENS.SourcesRepository) private readonly sourcesRepository: SourcesRepository,
  ) {}

  /**
   * Returns a list of database integrations.
   */
  async getDatabaseInteractions(projectName: string): Promise<DatabaseIntegrationInfo[]> {
    const records = await this.sourcesRepository.getProjectDatabaseIntegrations(
      projectName,
      this.codeFileExtensions,
    );
    return records.flatMap((record) => {
      const { summary } = record;
      if (summary?.databaseIntegration) {
        return [
          {
            path: summary.classpath ?? record.filepath,
            mechanism: summary.databaseIntegration.mechanism,
            description: summary.databaseIntegration.description,
            codeExample: summary.databaseIntegration.codeExample,
          },
        ];
      }
      return []; // This item will be filtered out by flatMap
    });
  }

  /**
   * Returns an aggregated summary of stored procedures and triggers from pre-generated summaries.
   */
  async getSummarizedProceduresAndTriggers(projectName: string): Promise<ProcsAndTriggers> {
    const records = await this.sourcesRepository.getProjectStoredProceduresAndTriggers(
      projectName,
      this.codeFileExtensions,
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
   * Aggregate database objects (procedures or triggers) for report generation
   */
  private aggregateProcsOrTriggersForReport(
    items: ProcOrTrigItem[],
    type: typeof STORED_PROCEDURE_TYPE | typeof TRIGGER_TYPE,
  ): ProcsAndTriggers["procs"] {
    const stats = this.calculateComplexityStats(items);
    const list = items.map((item) => this.mapItemToReportFormat(item, type));

    return {
      ...stats,
      list,
    };
  }

  /**
   * Calculate complexity statistics for a collection of items
   */
  private calculateComplexityStats(items: ProcOrTrigItem[]): {
    total: number;
    low: number;
    medium: number;
    high: number;
  } {
    return items.reduce(
      (stats, item) => {
        const complexity = this.normalizeComplexity(item.complexity, item.name);
        stats.total++;
        const lowercaseComplexity = complexity.toLowerCase() as "low" | "medium" | "high";
        stats[lowercaseComplexity]++;
        return stats;
      },
      { total: 0, low: 0, medium: 0, high: 0 },
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
    if (isComplexity(complexity)) return complexity;
    console.warn(
      `Invalid complexity value '${String(complexity)}' found for ${itemName}. Defaulting to LOW.`,
    );
    return "LOW";
  }
}
