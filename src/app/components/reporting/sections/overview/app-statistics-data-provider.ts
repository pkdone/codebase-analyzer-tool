import { injectable, inject } from "tsyringe";
import type { SourcesRepository } from "../../../../repositories/sources/sources.repository.interface";
import type { AppSummaryRecordWithId } from "../../../../repositories/app-summaries/app-summaries.model";
import { repositoryTokens } from "../../../../di/tokens";
import type { AppStatistics } from "./overview.types";
import { formatDateForDisplay } from "../../../../../common/utils/date-utils";
import { NO_DESCRIPTION_PLACEHOLDER } from "../../config/placeholders.config";

/**
 * Locale used for date formatting in reports.
 * Using en-GB format (DD/MM/YYYY, HH:mm:ss) for consistency.
 */
const REPORT_DATE_LOCALE = "en-GB";

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
    this.currentDate = formatDateForDisplay(new Date(), REPORT_DATE_LOCALE);
  }

  /**
   * Collect app statistics data using pre-fetched app summary data
   */
  async getAppStatistics(
    projectName: string,
    appSummaryData: Pick<AppSummaryRecordWithId, "appDescription" | "llmModels">,
  ): Promise<AppStatistics> {
    // Use single database query instead of two separate queries for better performance
    const { fileCount, linesOfCode } =
      await this.sourcesRepository.getProjectFileAndLineStats(projectName);

    return {
      projectName: projectName,
      currentDate: this.currentDate,
      llmModels: appSummaryData.llmModels,
      fileCount,
      linesOfCode,
      appDescription: appSummaryData.appDescription ?? NO_DESCRIPTION_PLACEHOLDER,
    };
  }
}
