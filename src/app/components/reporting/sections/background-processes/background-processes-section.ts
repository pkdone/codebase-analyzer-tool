import { injectable, inject } from "tsyringe";
import type { ReportSection } from "../report-section.interface";
import { reportingTokens } from "../../../../di/tokens";
import { ScheduledJobDataProvider } from "./job-data-provider";
import type { PreparedHtmlReportData } from "../../types/html-report-data.types";
import type { PreparedJsonData } from "../../json-report-writer";
import type { ReportData } from "../../report-data.types";
import { SECTION_NAMES } from "../../reporting.constants";

/**
 * Report section for background processes and scheduled jobs data.
 * Identifies cron jobs, scheduled tasks, JCL, and other automated processes.
 */
@injectable()
export class BackgroundProcessesSection implements ReportSection {
  constructor(
    @inject(reportingTokens.ScheduledJobDataProvider)
    private readonly scheduledJobDataProvider: ScheduledJobDataProvider,
  ) {}

  getName(): string {
    return SECTION_NAMES.BACKGROUND_PROCESSES;
  }

  getRequiredAppSummaryFields(): string[] {
    // This section does not require any app summary fields
    return [];
  }

  async getData(projectName: string): Promise<Partial<ReportData>> {
    const scheduledJobsSummary =
      await this.scheduledJobDataProvider.getScheduledJobsSummary(projectName);
    return { scheduledJobsSummary };
  }

  async prepareHtmlData(
    _baseData: ReportData,
    sectionData: Partial<ReportData>,
    _htmlDir: string,
  ): Promise<Partial<PreparedHtmlReportData> | null> {
    const { scheduledJobsSummary } = sectionData;

    if (!scheduledJobsSummary) {
      return await Promise.resolve(null);
    }

    // Calculate Scheduled Jobs statistics
    const jobsStatistics = {
      total: scheduledJobsSummary.totalJobs,
      triggerTypesCount: scheduledJobsSummary.triggerTypes.length,
      jobFilesCount: scheduledJobsSummary.jobFiles.length,
    };

    return await Promise.resolve({
      scheduledJobsSummary,
      jobsStatistics,
    });
  }

  prepareJsonData(_baseData: ReportData, sectionData: Partial<ReportData>): PreparedJsonData[] {
    const { scheduledJobsSummary } = sectionData;

    if (scheduledJobsSummary !== undefined) {
      return [{ filename: "scheduled-jobs-summary.json", data: scheduledJobsSummary }];
    }

    return [];
  }
}
