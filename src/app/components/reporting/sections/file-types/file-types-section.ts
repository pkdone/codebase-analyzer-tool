import { injectable, inject } from "tsyringe";
import { BaseReportSection } from "../base-report-section";
import { repositoryTokens, coreTokens } from "../../../../di/tokens";
import type { SourcesRepository } from "../../../../repositories/sources/sources.repository.interface";
import { TableViewModel } from "../../presentation";
import type { PreparedHtmlReportData } from "../../types/html-report-data.types";
import type { PreparedJsonData } from "../../json-report-writer";
import type { ReportData } from "../../report-data.types";
import { SECTION_NAMES, HTML_TABLE_COLUMN_HEADERS } from "../../config/reporting.config";
import { UNKNOWN_VALUE_PLACEHOLDER } from "../../config/placeholders.config";
import { buildPieChartData } from "./pie-chart-data-builder";
import type { OutputConfigType } from "../../../../config/output.config";

/**
 * Report section for file types data.
 * Pie chart is rendered client-side via SVG in the EJS template.
 */
@injectable()
export class FileTypesSection extends BaseReportSection {
  constructor(
    @inject(repositoryTokens.SourcesRepository)
    private readonly sourcesRepository: SourcesRepository,
    @inject(coreTokens.OutputConfig)
    private readonly outputConfig: OutputConfigType,
  ) {
    super();
  }

  getName(): string {
    return SECTION_NAMES.FILE_TYPES;
  }

  async getData(projectName: string): Promise<Partial<ReportData>> {
    const fileTypesData = await this.sourcesRepository.getProjectFileExtensionStats(projectName);
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
      [HTML_TABLE_COLUMN_HEADERS.FILE_TYPE]: item.fileExtension,
      [HTML_TABLE_COLUMN_HEADERS.FILES_COUNT]: item.files,
      [HTML_TABLE_COLUMN_HEADERS.LINES_COUNT]: item.lines,
    }));

    // Build pie chart data
    const pieChartData = buildPieChartData(processedFileTypesData);

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
        filename: this.outputConfig.jsonFiles.FILE_TYPES,
        data: fileTypesData,
      },
    ];
  }

  /**
   * Process file types data to show placeholder for empty file extensions.
   */
  private processFileTypesData(
    fileTypesData: ReportData["fileTypesData"],
  ): ReportData["fileTypesData"] {
    return fileTypesData.map((item) => ({
      ...item,
      fileExtension: item.fileExtension || UNKNOWN_VALUE_PLACEHOLDER,
    }));
  }
}
