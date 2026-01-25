import { injectable, inject } from "tsyringe";
import { BaseReportSection } from "../base-report-section";
import { reportingTokens } from "../../../../di/tokens";
import { JavaUiTechnologyDataProvider } from "./java-ui-technology-data-provider";
import type { PreparedHtmlReportData } from "../../types/html-report-data.types";
import type { PreparedJsonData } from "../../json-report-writer";
import type { ReportData } from "../../report-data.types";
import { SECTION_NAMES } from "../../reporting.constants";
import type { UiTechnologyAnalysis } from "./ui-analysis.types";
import { TAG_LIBRARY_BADGE_CLASSES, calculateDebtLevel } from "../../config/ui-analysis.config";
import {
  getDebtLevelPresentation,
  getTotalScriptletsCssClass,
  getFilesWithHighScriptletCountCssClass,
  shouldShowHighDebtAlert,
  getScriptletUsageInsight,
} from "../../view-models/presentation-helpers";
import { outputConfig } from "../../../../config/output.config";
import { UNKNOWN_VALUE_PLACEHOLDER } from "../../config/placeholders.config";

/**
 * Report section for server-side UI technology analysis.
 * Identifies JSP scriptlets, tag libraries, and UI frameworks for technical debt assessment.
 */
@injectable()
export class UiAnalysisSection extends BaseReportSection {
  constructor(
    @inject(reportingTokens.JavaUiTechnologyDataProvider)
    private readonly javaUiTechnologyDataProvider: JavaUiTechnologyDataProvider,
  ) {
    super();
  }

  getName(): string {
    return SECTION_NAMES.UI_ANALYSIS;
  }

  async getData(projectName: string): Promise<Partial<ReportData>> {
    const uiTechnologyAnalysis =
      await this.javaUiTechnologyDataProvider.getUiTechnologyAnalysis(projectName);
    return { uiTechnologyAnalysis };
  }

  async prepareHtmlData(
    _baseData: ReportData,
    sectionData: Partial<ReportData>,
    _htmlDir: string,
  ): Promise<Partial<PreparedHtmlReportData> | null> {
    const { uiTechnologyAnalysis: rawData } = sectionData;

    if (!rawData) {
      return await Promise.resolve(null);
    }

    // Transform raw data to HTML-ready data with presentation fields
    const uiTechnologyAnalysis: UiTechnologyAnalysis = {
      ...rawData,
      // Normalize framework versions to ensure display consistency
      frameworks: rawData.frameworks.map((framework) => ({
        ...framework,
        version: framework.version ?? UNKNOWN_VALUE_PLACEHOLDER,
      })),
      // Add CSS classes to tag libraries
      customTagLibraries: rawData.customTagLibraries.map((tagLib) => ({
        ...tagLib,
        tagTypeClass: TAG_LIBRARY_BADGE_CLASSES[tagLib.tagType],
      })),
      // Add debt levels and CSS classes to top scriptlet files
      // Business logic (calculateDebtLevel) determines the level,
      // then presentation helper maps it to display values
      topScriptletFiles: rawData.topScriptletFiles.map((file) => {
        const debtLevel = calculateDebtLevel(file.totalScriptletBlocks);
        const { level, cssClass } = getDebtLevelPresentation(debtLevel);
        return {
          ...file,
          debtLevel: level,
          debtLevelClass: cssClass,
        };
      }),
      // Add aggregate presentation fields
      totalScriptletsCssClass: getTotalScriptletsCssClass(rawData.totalScriptlets),
      filesWithHighScriptletCountCssClass: getFilesWithHighScriptletCountCssClass(
        rawData.filesWithHighScriptletCount,
      ),
      showHighDebtAlert: shouldShowHighDebtAlert(rawData.filesWithHighScriptletCount),
      scriptletUsageInsight: getScriptletUsageInsight(
        rawData.totalScriptlets,
        rawData.averageScriptletsPerFile,
      ),
    };

    return await Promise.resolve({
      uiTechnologyAnalysis,
    });
  }

  prepareJsonData(_baseData: ReportData, sectionData: Partial<ReportData>): PreparedJsonData[] {
    return this.prepareSingleJsonData(
      sectionData.uiTechnologyAnalysis,
      outputConfig.jsonFiles.UI_TECHNOLOGY_ANALYSIS,
    );
  }
}
