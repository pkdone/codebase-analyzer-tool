import { injectable, inject } from "tsyringe";
import type { ReportSection } from "../report-section.interface";
import { reportingTokens } from "../../../../di/tokens";
import { CodeQualityDataProvider } from "./code-quality-data-provider";
import type { PreparedHtmlReportData } from "../../types/html-report-data.types";
import type { PreparedJsonData } from "../../json-report-writer";
import type { ReportData } from "../../report-data.types";
import { SECTION_NAMES } from "../../reporting.constants";

/**
 * Report section for code quality metrics.
 * Provides function complexity analysis, code smells, and overall quality statistics.
 */
@injectable()
export class CodeQualitySection implements ReportSection {
  constructor(
    @inject(reportingTokens.CodeQualityDataProvider)
    private readonly codeQualityDataProvider: CodeQualityDataProvider,
  ) {}

  getName(): string {
    return SECTION_NAMES.CODE_QUALITY;
  }

  getRequiredAppSummaryFields(): string[] {
    // This section does not require any app summary fields
    return [];
  }

  async getData(projectName: string): Promise<Partial<ReportData>> {
    const codeQualitySummary =
      await this.codeQualityDataProvider.getCodeQualitySummary(projectName);
    return { codeQualitySummary };
  }

  async prepareHtmlData(
    _baseData: ReportData,
    sectionData: Partial<ReportData>,
    _htmlDir: string,
  ): Promise<Partial<PreparedHtmlReportData> | null> {
    const { codeQualitySummary } = sectionData;

    if (!codeQualitySummary) {
      return await Promise.resolve(null);
    }

    return await Promise.resolve({
      codeQualitySummary,
    });
  }

  prepareJsonData(_baseData: ReportData, sectionData: Partial<ReportData>): PreparedJsonData[] {
    const { codeQualitySummary } = sectionData;

    if (codeQualitySummary !== undefined) {
      return [{ filename: "code-quality-summary.json", data: codeQualitySummary }];
    }

    return [];
  }
}
