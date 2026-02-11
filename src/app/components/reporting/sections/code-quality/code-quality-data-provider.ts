import { injectable, inject } from "tsyringe";
import type { SourcesRepository } from "../../../../repositories/sources/sources.repository.interface";
import { repositoryTokens } from "../../../../di/tokens";
import type { CodeQualitySummaryData } from "./code-quality.types";

/**
 * Data provider responsible for aggregating code quality metrics.
 * All heavy lifting is done in the database for optimal performance.
 */
@injectable()
export class CodeQualityDataProvider {
  constructor(
    @inject(repositoryTokens.SourcesRepository)
    private readonly sourcesRepository: SourcesRepository,
  ) {}

  /**
   * Aggregates code quality metrics for a project.
   * Returns raw data without presentation fields.
   */
  async getCodeQualitySummary(projectName: string): Promise<CodeQualitySummaryData> {
    // Execute all four aggregations in parallel
    const [topComplexFunctions, commonCodeSmells, overallStatistics, databaseStatistics] =
      await Promise.all([
        this.sourcesRepository.getTopComplexFunctions(projectName, 10),
        this.sourcesRepository.getCodeSmellStatistics(projectName),
        this.sourcesRepository.getCodeQualityStatistics(projectName),
        this.sourcesRepository.getDatabaseStatistics(projectName),
      ]);

    // Only include databaseStatistics if there is meaningful data
    const hasDbData =
      databaseStatistics.storedObjectCounts.totalProcedures > 0 ||
      databaseStatistics.storedObjectCounts.totalTriggers > 0;

    return {
      topComplexFunctions,
      commonCodeSmells,
      overallStatistics,
      ...(hasDbData && { databaseStatistics }),
    };
  }
}
