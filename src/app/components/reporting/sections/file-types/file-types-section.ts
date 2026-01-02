import { injectable, inject } from "tsyringe";
import type { ReportSection } from "../report-section.interface";
import { repositoryTokens } from "../../../../di/tokens";
import type { SourcesRepository } from "../../../../repositories/sources/sources.repository.interface";
import { htmlReportConstants } from "../../html-report.constants";
import { reportSectionsConfig } from "../../report-sections.config";
import { TableViewModel } from "../../view-models/table-view-model";
import type { PreparedHtmlReportData } from "../../html-report-writer";
import type { PreparedJsonData } from "../../json-report-writer";
import type { ReportData } from "../../report-data.types";
import { SECTION_NAMES } from "../../reporting.constants";
import { UNKNOWN_VALUE_PLACEHOLDER } from "../../../../../common/constants/application.constants";
import { calculatePieChartData } from "./pie-chart-calculator";

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

  async getData(projectName: string): Promise<Partial<ReportData>> {
    const fileTypesData =
      await this.sourcesRepository.getProjectFileTypesCountAndLines(projectName);
    return { fileTypesData };
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

  // eslint-disable-next-line @typescript-eslint/member-ordering, @typescript-eslint/require-await
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

    // Calculate pie chart data (moved from EJS template)
    const pieChartData = calculatePieChartData(processedFileTypesData);

    return {
      fileTypesData: processedFileTypesData,
      pieChartData,
      fileTypesTableViewModel: new TableViewModel(fileTypesDisplayData),
    };
  }

  // eslint-disable-next-line @typescript-eslint/member-ordering
  prepareJsonData(_baseData: ReportData, sectionData: Partial<ReportData>): PreparedJsonData[] {
    const fileTypesData = sectionData.fileTypesData ?? [];

    return [
      {
        filename: reportSectionsConfig.jsonDataFiles.fileTypes,
        data: fileTypesData,
      },
    ];
  }
}
