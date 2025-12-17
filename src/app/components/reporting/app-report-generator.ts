import { injectable, inject, injectAll } from "tsyringe";
import { reportingTokens, repositoryTokens } from "../../di/tokens";
import { HtmlReportWriter, type PreparedHtmlReportData } from "./html-report-writer";
import { JsonReportWriter, type PreparedJsonData } from "./json-report-writer";
import { AppStatisticsDataProvider } from "./data-providers/app-statistics-data-provider";
import { AppSummaryCategoriesProvider } from "./data-providers/categories-data-provider";
import type { AppSummariesRepository } from "../../repositories/app-summaries/app-summaries.repository.interface";
import type { ReportData } from "./report-gen.types";
import { TableViewModel, type DisplayableTableRow } from "./view-models/table-view-model";
import { convertToDisplayName } from "../../../common/utils/text-utils";
import { reportSectionsConfig } from "./report-sections.config";
import type { ReportSection } from "./sections/report-section.interface";
import path from "path";
import { promises as fs } from "fs";
import { outputConfig } from "../../config/output.config";

/**
 * Class responsible for orchestrating report generation using a modular section-based architecture.
 * Report sections are injected via multi-injection and handle their own data fetching, processing,
 * and preparation for both HTML and JSON outputs.
 */
@injectable()
export default class AppReportGenerator {
  /**
   * Constructor
   * @param sections - Array of report sections (injected via multi-injection)
   */
  constructor(
    @inject(repositoryTokens.AppSummariesRepository)
    private readonly appSummariesRepository: AppSummariesRepository,
    @inject(reportingTokens.HtmlReportWriter) private readonly htmlWriter: HtmlReportWriter,
    @inject(reportingTokens.JsonReportWriter) private readonly jsonWriter: JsonReportWriter,
    @inject(reportingTokens.AppStatisticsDataProvider)
    private readonly appStatsDataProvider: AppStatisticsDataProvider,
    @inject(reportingTokens.AppSummaryCategoriesProvider)
    private readonly categoriesDataProvider: AppSummaryCategoriesProvider,
    @injectAll("ReportSection")
    private readonly sections: ReportSection[],
  ) {}

  /**
   * Generate the HTML static file report using the HtmlReportWriter and write JSON files using JsonReportWriter.
   * Uses a modular section-based architecture where each section handles its own data fetching and processing.
   */
  async generateReport(
    projectName: string,
    outputDir: string,
    outputFilename: string,
  ): Promise<void> {
    // Fetch base app summary data required for all sections
    const appSummaryData = await this.appSummariesRepository.getProjectAppSummaryFields(
      projectName,
      reportSectionsConfig.allRequiredAppSummaryFields,
    );

    if (!appSummaryData) {
      throw new Error(
        "Unable to generate report because no app summary data exists - ensure you first run the scripts to process the source data and generate insights",
      );
    }

    // Generate core app statistics and categorized data
    const appStats = await this.appStatsDataProvider.getAppStatistics(projectName, appSummaryData);
    const categorizedData = this.categoriesDataProvider.getStandardSectionData(appSummaryData);

    // Fetch data from all sections in parallel and merge into ReportData
    const sectionDataResults = await Promise.allSettled(
      this.sections.map(async (section) => {
        const data = await section.getData(projectName);
        return { name: section.getName(), data };
      }),
    );

    // Merge all section Partial<ReportData> objects into a single ReportData object
    const sectionDataParts: Partial<ReportData>[] = [];
    const sectionDataMap = new Map<string, Partial<ReportData>>();

    for (const result of sectionDataResults) {
      if (result.status === "fulfilled") {
        sectionDataParts.push(result.value.data);
        sectionDataMap.set(result.value.name, result.value.data);
      } else {
        console.warn(`Failed to get data for a report section:`, result.reason);
      }
    }

    // Merge all Partial<ReportData> objects with defaults
    const mergedSectionData = Object.assign({}, ...sectionDataParts) as Partial<ReportData>;
    const reportData: ReportData = {
      appStats,
      fileTypesData: [],
      categorizedData,
      integrationPoints: [],
      dbInteractions: [],
      procsAndTriggers: {
        procs: { total: 0, low: 0, medium: 0, high: 0, list: [] },
        trigs: { total: 0, low: 0, medium: 0, high: 0, list: [] },
      },
      topLevelJavaClasses: [],
      billOfMaterials: [],
      codeQualitySummary: null,
      scheduledJobsSummary: null,
      moduleCoupling: null,
      uiTechnologyAnalysis: null,
      ...mergedSectionData,
    };

    // Prepare HTML and JSON data from sections
    const htmlFilePath = path.join(outputDir, outputFilename);
    const preparedHtmlData = await this.prepareHtmlDataFromSections(
      reportData,
      sectionDataMap,
      htmlFilePath,
    );

    const preparedJsonData = this.prepareJsonDataFromSections(reportData, sectionDataMap);

    // Read asset files for HTML report
    const templatesDir = path.join(__dirname, outputConfig.HTML_TEMPLATES_DIR);
    const cssPath = path.join(templatesDir, "style.css");
    const jsonIconPath = path.join(templatesDir, "assets", "json-icon.svg");

    const [cssContent, jsonIconContent] = await Promise.all([
      fs.readFile(cssPath, "utf-8"),
      fs.readFile(jsonIconPath, "utf-8"),
    ]);

    // Add asset content to prepared HTML data
    const preparedHtmlDataWithAssets = {
      ...preparedHtmlData,
      inlineCss: cssContent,
      jsonIconSvg: jsonIconContent,
    };

    // Generate reports using prepared data
    await this.jsonWriter.writeAllJSONFiles(preparedJsonData);
    await this.htmlWriter.writeHTMLReportFile(preparedHtmlDataWithAssets, htmlFilePath);
  }

  /**
   * Prepare HTML data by delegating to each section
   */
  private async prepareHtmlDataFromSections(
    reportData: ReportData,
    sectionDataMap: Map<string, Partial<ReportData>>,
    htmlFilePath: string,
  ): Promise<PreparedHtmlReportData> {
    const htmlDir = path.dirname(htmlFilePath);

    // Prepare HTML data from all sections
    const sectionHtmlDataList = await Promise.all(
      this.sections.map(async (section) => {
        const sectionData = sectionDataMap.get(section.getName()) ?? {};
        return section.prepareHtmlData(reportData, sectionData, htmlDir);
      }),
    );

    // Merge all section HTML data
    const mergedHtmlData = sectionHtmlDataList.reduce<Partial<PreparedHtmlReportData>>(
      (acc, sectionData) => ({ ...acc, ...sectionData }),
      {},
    );

    // Add categorized data view models
    const categorizedDataWithViewModels = reportData.categorizedData.map((category) => ({
      ...category,
      tableViewModel: new TableViewModel(category.data as DisplayableTableRow[]),
    }));

    return {
      ...mergedHtmlData,
      appStats: reportData.appStats,
      categorizedData: categorizedDataWithViewModels,
      jsonFilesConfig: reportSectionsConfig,
      convertToDisplayName,
    } as PreparedHtmlReportData;
  }

  /**
   * Prepare JSON data by delegating to each section
   */
  private prepareJsonDataFromSections(
    reportData: ReportData,
    sectionDataMap: Map<string, Partial<ReportData>>,
  ): PreparedJsonData[] {
    // Collect JSON data from all sections
    const allJsonData: PreparedJsonData[] = [];

    // Add complete report JSON file
    const completeReportData = {
      appStats: reportData.appStats,
      fileTypesData: reportData.fileTypesData,
      categorizedData: reportData.categorizedData,
      dbInteractions: reportData.dbInteractions,
      procsAndTriggers: reportData.procsAndTriggers,
      topLevelJavaClasses: reportData.topLevelJavaClasses,
      integrationPoints: reportData.integrationPoints,
      billOfMaterials: reportData.billOfMaterials,
      codeQualitySummary: reportData.codeQualitySummary,
      scheduledJobsSummary: reportData.scheduledJobsSummary,
      moduleCoupling: reportData.moduleCoupling,
    };
    allJsonData.push({
      filename: `${reportSectionsConfig.jsonDataFiles.completeReport}.json`,
      data: completeReportData,
    });

    // Add app stats and app description JSON files
    allJsonData.push(
      { filename: reportSectionsConfig.jsonDataFiles.appStats, data: reportData.appStats },
      {
        filename: reportSectionsConfig.jsonDataFiles.appDescription,
        data: { appDescription: reportData.appStats.appDescription },
      },
    );

    // Collect JSON data from each section
    for (const section of this.sections) {
      const sectionData = sectionDataMap.get(section.getName()) ?? {};
      const sectionJsonData = section.prepareJsonData(reportData, sectionData);
      allJsonData.push(...sectionJsonData);
    }

    // Add categorized data JSON files
    for (const categoryData of reportData.categorizedData) {
      allJsonData.push({
        filename: reportSectionsConfig.getCategoryJSONFilename(categoryData.category),
        data: categoryData.data,
      });
    }

    return allJsonData;
  }
}
