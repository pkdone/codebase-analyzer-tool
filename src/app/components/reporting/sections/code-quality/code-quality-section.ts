import { injectable, inject } from "tsyringe";
import { BaseReportSection } from "../base-report-section";
import { reportingTokens } from "../../../../di/tokens";
import { CodeQualityDataProvider } from "./code-quality-data-provider";
import type { PreparedHtmlReportData } from "../../types/html-report-data.types";
import type { PreparedJsonData } from "../../json-report-writer";
import type { ReportData } from "../../report-data.types";
import { SECTION_NAMES } from "../../config/reporting.config";
import type { CodeQualitySummary } from "./code-quality.types";
import { getCodeSmellRecommendation } from "../../presentation";

/**
 * Report section for code quality metrics.
 * Provides function complexity analysis, code smells, and overall quality statistics.
 */
@injectable()
export class CodeQualitySection extends BaseReportSection {
  constructor(
    @inject(reportingTokens.CodeQualityDataProvider)
    private readonly codeQualityDataProvider: CodeQualityDataProvider,
  ) {
    super();
  }

  getName(): string {
    return SECTION_NAMES.CODE_QUALITY;
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
    const { codeQualitySummary: rawData } = sectionData;

    if (!rawData) {
      return await Promise.resolve(null);
    }

    // Transform raw data to presentation data by adding recommendations
    const codeQualitySummary: CodeQualitySummary = {
      ...rawData,
      commonCodeSmells: rawData.commonCodeSmells.map((smell) => ({
        ...smell,
        recommendation: getCodeSmellRecommendation(smell.smellType),
      })),
    };

    return await Promise.resolve({
      codeQualitySummary,
    });
  }

  prepareJsonData(_baseData: ReportData, sectionData: Partial<ReportData>): PreparedJsonData[] {
    return this.prepareSingleJsonData(sectionData.codeQualitySummary, "code-quality-summary.json");
  }
}
