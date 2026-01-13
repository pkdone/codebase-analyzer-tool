import { injectable, inject } from "tsyringe";
import type { SourcesRepository } from "../../../../repositories/sources/sources.repository.interface";
import type { AppSummaryRecordWithId } from "../../../../repositories/app-summaries/app-summaries.model";
import { repositoryTokens } from "../../../../di/tokens";
import type { AppStatistics } from "./overview.types";
import { formatDateForDisplay } from "../../../../../common/utils/date-utils";
import { NO_DESCRIPTION_PLACEHOLDER } from "../../../../../common/constants/application.constants";

/**
 * Data provider responsible for aggregating app statistics information for reports.
 */
@injectable()
export class AppStatisticsDataProvider {
  private readonly currentDate: string;

  constructor(
    @inject(repositoryTokens.SourcesRepository)
    private readonly sourcesRepository: SourcesRepository,
  ) {
    this.currentDate = formatDateForDisplay();
  }

  /**
   * Collect app statistics data using pre-fetched app summary data
   */
  async getAppStatistics(
    projectName: string,
    appSummaryData: Pick<AppSummaryRecordWithId, "appDescription" | "llmProvider">,
  ): Promise<AppStatistics> {
    // Use single database query instead of two separate queries for better performance
    const { fileCount, linesOfCode } =
      await this.sourcesRepository.getProjectFileAndLineStats(projectName);

    return {
      projectName: projectName,
      currentDate: this.currentDate,
      llmProvider: appSummaryData.llmProvider,
      fileCount,
      linesOfCode,
      appDescription: appSummaryData.appDescription ?? NO_DESCRIPTION_PLACEHOLDER,
    };
  }
}
