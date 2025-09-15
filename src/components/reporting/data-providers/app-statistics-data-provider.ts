import { injectable, inject } from "tsyringe";
import type { SourcesRepository } from "../../../repositories/source/sources.repository.interface";
import type { AppSummaryRecordWithId } from "../../../repositories/app-summary/app-summaries.model";
import { TOKENS } from "../../../di/tokens";
import type { AppStatistics } from "../report-gen.types";
import { formatDateForDisplay } from "../../../common/utils/date-utils";

/**
 * Data provider responsible for aggregating app statistics information for reports.
 */
@injectable()
export class AppStatisticsDataProvider {
  private readonly currentDate: string;

  constructor(
    @inject(TOKENS.SourcesRepository) private readonly sourcesRepository: SourcesRepository,
  ) {
    this.currentDate = formatDateForDisplay();
  }

  /**
   * Collect app statistics data using pre-fetched app summary data
   */
  async getAppStatistics(
    projectName: string,
    appSummaryData: Pick<AppSummaryRecordWithId, "appDescription" | "llmProvider">
  ): Promise<AppStatistics> {
    return {
      projectName: projectName,
      currentDate: this.currentDate,
      llmProvider: appSummaryData.llmProvider,
      fileCount: await this.sourcesRepository.getProjectFilesCount(projectName),
      linesOfCode: await this.sourcesRepository.getProjectTotalLinesOfCode(projectName),
      appDescription:
        typeof appSummaryData.appDescription === "string"
          ? appSummaryData.appDescription
          : "No description available",
    };
  }
}
