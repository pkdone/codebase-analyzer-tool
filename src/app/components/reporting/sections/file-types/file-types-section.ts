import { injectable, inject } from "tsyringe";
import type { ReportSection } from "../report-section.interface";
import type { RequestableAppSummaryField } from "../../../../repositories/app-summaries/app-summaries.model";
import { repositoryTokens } from "../../../../di/tokens";
import type { SourcesRepository } from "../../../../repositories/sources/sources.repository.interface";
import { htmlReportConstants } from "../../html-report.constants";
import { TableViewModel } from "../../table";
import type { PreparedHtmlReportData } from "../../types/html-report-data.types";
import type { PreparedJsonData } from "../../json-report-writer";
import type { ReportData } from "../../report-data.types";
import { SECTION_NAMES } from "../../reporting.constants";
import { UNKNOWN_VALUE_PLACEHOLDER } from "../../config/placeholders.config";
import { calculatePieChartData } from "./pie-chart-calculator";
import { outputConfig } from "../../../../config/output.config";

/**
 * Report section for file types data.
 * Pie chart is rendered client-side via SVG in the EJS template.
 */
@injectable()
export class FileTypesSection implements ReportSection {
  constructor(
    @inject(repositoryTokens.SourcesRepository)
    private readonly sourcesRepository: SourcesRepository,
  ) {}

  getName(): string {
    return SECTION_NAMES.FILE_TYPES;
  }

  getRequiredAppSummaryFields(): readonly RequestableAppSummaryField[] {
    // This section does not require any app summary fields
    return [];
  }

  async getData(projectName: string): Promise<Partial<ReportData>> {
    const fileTypesData =
      await this.sourcesRepository.getProjectFileTypesCountAndLines(projectName);
    return { fileTypesData };
  }

  async prepareHtmlData(
    _baseData: ReportData,
    sectionData: Partial<ReportData>,
    _htmlDir: string,
  ): Promise<Partial<PreparedHtmlReportData> | null> {
    const fileTypesData = sectionData.fileTypesData ?? [];
    const processedFileTypesData = this.processFileTypesData(fileTypesData);

    // Create display data for table
    const fileTypesDisplayData = processedFileTypesData.map((item) => ({
      [htmlReportConstants.columnHeaders.FILE_TYPE]: item.fileType,
      [htmlReportConstants.columnHeaders.FILES_COUNT]: item.files,
      [htmlReportConstants.columnHeaders.LINES_COUNT]: item.lines,
    }));

    // Calculate pie chart data
    const pieChartData = calculatePieChartData(processedFileTypesData);

    // Implementation of async interface - computation is synchronous but interface requires Promise
    return await Promise.resolve({
      fileTypesData: processedFileTypesData,
      pieChartData,
      fileTypesTableViewModel: new TableViewModel(fileTypesDisplayData),
    });
  }

  prepareJsonData(_baseData: ReportData, sectionData: Partial<ReportData>): PreparedJsonData[] {
    const fileTypesData = sectionData.fileTypesData ?? [];

    return [
      {
        filename: outputConfig.jsonFiles.FILE_TYPES,
        data: fileTypesData,
      },
    ];
  }

  /**
   * Process file types data to show placeholder for empty file types.
   */
  private processFileTypesData(
    fileTypesData: ReportData["fileTypesData"],
  ): ReportData["fileTypesData"] {
    return fileTypesData.map((item) => ({
      ...item,
      fileType: item.fileType || UNKNOWN_VALUE_PLACEHOLDER,
    }));
  }
}
