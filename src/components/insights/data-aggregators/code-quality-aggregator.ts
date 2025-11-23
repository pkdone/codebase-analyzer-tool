import { injectable, inject } from "tsyringe";
import type { SourcesRepository } from "../../../repositories/sources/sources.repository.interface";
import { repositoryTokens } from "../../../di/tokens";
import type { IAggregator } from "./aggregator.interface";
import type { AppSummaryCategoryEnum } from "../insights.types";

/**
 * Aggregates code quality metrics using MongoDB aggregation pipelines.
 * All heavy lifting is done in the database for optimal performance.
 */
@injectable()
export class CodeQualityAggregator implements IAggregator {
  constructor(
    @inject(repositoryTokens.SourcesRepository)
    private readonly sourcesRepository: SourcesRepository,
  ) {}

  getCategory(): AppSummaryCategoryEnum {
    return "codeQualitySummary";
  }

  async aggregate(projectName: string) {
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
}
