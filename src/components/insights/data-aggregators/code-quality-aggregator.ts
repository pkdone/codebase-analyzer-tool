import { injectable, inject } from "tsyringe";
import type { SourcesRepository } from "../../../repositories/sources/sources.repository.interface";
import { repositoryTokens } from "../../../di/tokens";
import type { IAggregator } from "./aggregator.interface";
import type { AppSummaryCategoryEnum, PartialAppSummaryRecord } from "../insights.types";
import type { z } from "zod";
import { codeQualitySummarySchema } from "../../../schemas/app-summaries.schema";

/**
 * Type for the code quality aggregation result (inferred from Zod schema)
 */
export type CodeQualityAggregationResult = z.infer<typeof codeQualitySummarySchema>;

/**
 * Aggregates code quality metrics using MongoDB aggregation pipelines.
 * All heavy lifting is done in the database for optimal performance.
 */
@injectable()
export class CodeQualityAggregator implements IAggregator<CodeQualityAggregationResult> {
  constructor(
    @inject(repositoryTokens.SourcesRepository)
    private readonly sourcesRepository: SourcesRepository,
  ) {}

  getCategory(): AppSummaryCategoryEnum {
    return "codeQualitySummary";
  }

  async aggregate(projectName: string): Promise<CodeQualityAggregationResult> {
    // Execute all three aggregations in parallel
    const [topComplexMethods, commonCodeSmells, overallStatistics] = await Promise.all([
      this.sourcesRepository.getTopComplexMethods(projectName, 10),
      this.sourcesRepository.getCodeSmellStatistics(projectName),
      this.sourcesRepository.getCodeQualityStatistics(projectName),
    ]);

    return {
      topComplexMethods,
      commonCodeSmells,
      overallStatistics,
    };
  }

  /**
   * Get the update payload in the format needed for updateAppSummary.
   */
  getUpdatePayload(aggregatedData: CodeQualityAggregationResult): PartialAppSummaryRecord {
    return {
      codeQualitySummary: aggregatedData,
    };
  }
}
