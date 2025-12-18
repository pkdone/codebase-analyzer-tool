import { injectable, inject } from "tsyringe";
import type { ReportSection } from "./report-section.interface";
import { reportingTokens } from "../../../di/tokens";
import { repositoryTokens } from "../../../di/tokens";
import type { SourcesRepository } from "../../../repositories/sources/sources.repository.interface";
import { PieChartGenerator } from "../generators/png/pie-chart-generator";
import { htmlReportConstants } from "../html-report.constants";
import { reportSectionsConfig } from "../report-sections.config";
import { TableViewModel } from "../view-models/table-view-model";
import type { PreparedHtmlReportData } from "../html-report-writer";
import type { PreparedJsonData } from "../json-report-writer";
import type { ReportData } from "../report-gen.types";
import { SECTION_NAMES } from "../reporting.constants";
import path from "path";

/**
 * Report section for file types data, including pie chart generation.
 */
@injectable()
export class FileTypesSection implements ReportSection {
  constructor(
    @inject(repositoryTokens.SourcesRepository)
    private readonly sourcesRepository: SourcesRepository,
    @inject(reportingTokens.PieChartGenerator)
    private readonly pieChartGenerator: PieChartGenerator,
  ) {}

  getName(): string {
    return SECTION_NAMES.FILE_TYPES;
  }

  isStandardSection(): boolean {
    return true; // This section uses standard rendering
  }

  async getData(projectName: string): Promise<Partial<ReportData>> {
    const fileTypesData =
      await this.sourcesRepository.getProjectFileTypesCountAndLines(projectName);
    return { fileTypesData };
  }

  /**
   * Process file types data to show "unknown" for empty file types
   */
  private processFileTypesData(
    fileTypesData: ReportData["fileTypesData"],
  ): ReportData["fileTypesData"] {
    return fileTypesData.map((item) => ({
      ...item,
      fileType: item.fileType || "unknown",
    }));
  }

  // eslint-disable-next-line @typescript-eslint/member-ordering
  async prepareHtmlData(
    _baseData: ReportData,
    sectionData: Partial<ReportData>,
    htmlDir: string,
  ): Promise<Partial<PreparedHtmlReportData> | null> {
    const fileTypesData = sectionData.fileTypesData ?? [];
    const processedFileTypesData = this.processFileTypesData(fileTypesData);

    // Generate pie chart
    const chartsDir = path.join(htmlDir, htmlReportConstants.directories.CHARTS);
    const fileTypesPieChartFilename = await this.pieChartGenerator.generateFileTypesPieChart(
      processedFileTypesData,
      chartsDir,
    );
    const fileTypesPieChartPath = htmlReportConstants.paths.CHARTS_DIR + fileTypesPieChartFilename;

    // Create display data for table
    const fileTypesDisplayData = processedFileTypesData.map((item) => ({
      [htmlReportConstants.columnHeaders.FILE_TYPE]: item.fileType,
      [htmlReportConstants.columnHeaders.FILES_COUNT]: item.files,
      [htmlReportConstants.columnHeaders.LINES_COUNT]: item.lines,
    }));

    return {
      fileTypesData: processedFileTypesData,
      fileTypesPieChartPath,
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
