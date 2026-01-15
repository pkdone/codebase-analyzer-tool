import { injectable, inject } from "tsyringe";
import type { ReportSection } from "../report-section.interface";
import { reportingTokens } from "../../../../di/tokens";
import { ServerSideUiDataProvider } from "./server-side-ui-data-provider";
import type { PreparedHtmlReportData } from "../../html-report-writer";
import type { PreparedJsonData } from "../../json-report-writer";
import type { ReportData } from "../../report-data.types";
import { SECTION_NAMES } from "../../reporting.constants";
import type { UiTechnologyAnalysis } from "./ui-analysis.types";
import { TAG_LIBRARY_BADGE_CLASSES } from "../../config/ui-analysis.config";
import {
  calculateDebtLevel,
  getTotalScriptletsCssClass,
  getFilesWithHighScriptletCountCssClass,
  shouldShowHighDebtAlert,
} from "../../view-models/presentation-helpers";

/**
 * Report section for server-side UI technology analysis.
 * Identifies JSP scriptlets, tag libraries, and UI frameworks for technical debt assessment.
 */
@injectable()
export class UiAnalysisSection implements ReportSection {
  constructor(
    @inject(reportingTokens.ServerSideUiDataProvider)
    private readonly serverSideUiDataProvider: ServerSideUiDataProvider,
  ) {}

  getName(): string {
    return SECTION_NAMES.UI_ANALYSIS;
  }

  async getData(projectName: string): Promise<Partial<ReportData>> {
    const uiTechnologyAnalysis =
      await this.serverSideUiDataProvider.getUiTechnologyAnalysis(projectName);
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
      // Add CSS classes to tag libraries
      customTagLibraries: rawData.customTagLibraries.map((tagLib) => ({
        ...tagLib,
        tagTypeClass: TAG_LIBRARY_BADGE_CLASSES[tagLib.tagType],
      })),
      // Add debt levels and CSS classes to top scriptlet files
      topScriptletFiles: rawData.topScriptletFiles.map((file) => {
        const { level, cssClass } = calculateDebtLevel(file.totalScriptletBlocks);
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
    };

    return await Promise.resolve({
      uiTechnologyAnalysis,
    });
  }

  prepareJsonData(_baseData: ReportData, sectionData: Partial<ReportData>): PreparedJsonData[] {
    const { uiTechnologyAnalysis } = sectionData;

    if (uiTechnologyAnalysis !== undefined) {
      return [{ filename: "ui-technology-analysis.json", data: uiTechnologyAnalysis }];
    }

    return [];
  }
}
