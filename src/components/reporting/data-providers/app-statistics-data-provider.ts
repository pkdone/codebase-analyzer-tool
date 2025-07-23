import { injectable, inject } from "tsyringe";
import type { SourcesRepository } from "../../../repositories/source/sources.repository.interface";
import type { AppSummariesRepository } from "../../../repositories/app-summary/app-summaries.repository.interface";
import { TOKENS } from "../../../di/tokens";
import type { AppStatistics } from "../report-gen.types";

/**
 * Data provider responsible for aggregating app statistics information for reports.
 */
@injectable()
export class AppStatisticsDataProvider {
  private readonly currentDate: string;

  constructor(
    @inject(TOKENS.SourcesRepository) private readonly sourcesRepository: SourcesRepository,
    @inject(TOKENS.AppSummariesRepository)
    private readonly appSummariesRepository: AppSummariesRepository,
  ) {
    this.currentDate = new Date().toLocaleString();
  }

  /**
   * Collect app statistics data
   */
  async getAppStatistics(projectName: string): Promise<AppStatistics> {
    const appSummaryRecord =
      await this.appSummariesRepository.getProjectAppSummaryDescAndLLMProvider(projectName);
    if (!appSummaryRecord)
      throw new Error(
        "Unable to generate app statistics for a report because no app summary data exists - ensure you first run the scripts to process the source data and generate insights",
      );
    return {
      projectName: projectName,
      currentDate: this.currentDate,
      llmProvider: appSummaryRecord.llmProvider,
      fileCount: await this.sourcesRepository.getProjectFilesCount(projectName),
      linesOfCode: await this.sourcesRepository.getProjectTotalLinesOfCode(projectName),
      appDescription:
        typeof appSummaryRecord.appDescription === "string"
          ? appSummaryRecord.appDescription
          : "No description available",
    };
  }
} 