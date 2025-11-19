import { injectable, inject, injectAll } from "tsyringe";
import { reportingTokens } from "./reporting.tokens";
import { repositoryTokens } from "../../di/repositories.tokens";
import { HtmlReportWriter, type PreparedHtmlReportData } from "./html-report-writer";
import { JsonReportWriter, type PreparedJsonData } from "./json-report-writer";
import { AppStatisticsDataProvider } from "./data-providers/app-statistics-data-provider";
import { AppSummaryCategoriesProvider } from "./data-providers/categories-data-provider";
import type { AppSummariesRepository } from "../../repositories/app-summaries/app-summaries.repository.interface";
import type { ReportData } from "./report-gen.types";
import { TableViewModel, type DisplayableTableRow } from "./view-models/table-view-model";
import { convertToDisplayName } from "../../common/utils/text-utils";
import { reportSectionsConfig } from "./report-sections.config";
import type { ReportSection } from "./sections/report-section.interface";
import { SECTION_NAMES } from "./reporting.constants";
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

    // Fetch data from all sections in parallel
    const sectionDataMap = new Map<string, unknown>();
    await Promise.all(
      this.sections.map(async (section) => {
        const data = await section.getData(projectName);
        sectionDataMap.set(section.getName(), data);
      }),
    );

    // Build base report data from section outputs
    const reportData = this.buildReportDataFromSections(sectionDataMap, appStats, categorizedData);

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
   * Build ReportData from section outputs and base data
   */
  private buildReportDataFromSections(
    sectionDataMap: Map<string, unknown>,
    appStats: ReportData["appStats"],
    categorizedData: ReportData["categorizedData"],
  ): ReportData {
    // Extract data from sections
    const fileTypesData =
      (sectionDataMap.get(SECTION_NAMES.FILE_TYPES) as ReportData["fileTypesData"] | undefined) ??
      [];
    const dbSectionData = sectionDataMap.get(SECTION_NAMES.DATABASE) as
      | {
          integrationPoints?: ReportData["integrationPoints"];
          dbInteractions?: ReportData["dbInteractions"];
          procsAndTriggers?: ReportData["procsAndTriggers"];
        }
      | undefined;
    const topLevelJavaClasses =
      (sectionDataMap.get(SECTION_NAMES.CODE_STRUCTURE) as
        | ReportData["topLevelJavaClasses"]
        | undefined) ?? [];
    const advancedDataSection = sectionDataMap.get(SECTION_NAMES.ADVANCED_DATA) as
      | {
          billOfMaterials?: ReportData["billOfMaterials"];
          codeQualitySummary?: ReportData["codeQualitySummary"];
          scheduledJobsSummary?: ReportData["scheduledJobsSummary"];
          moduleCoupling?: ReportData["moduleCoupling"];
          uiTechnologyAnalysis?: ReportData["uiTechnologyAnalysis"];
        }
      | undefined;

    return {
      appStats,
      fileTypesData,
      categorizedData,
      integrationPoints: dbSectionData?.integrationPoints ?? [],
      dbInteractions: dbSectionData?.dbInteractions ?? [],
      procsAndTriggers: dbSectionData?.procsAndTriggers ?? {
        procs: { total: 0, low: 0, medium: 0, high: 0, list: [] },
        trigs: { total: 0, low: 0, medium: 0, high: 0, list: [] },
      },
      topLevelJavaClasses,
      billOfMaterials: (advancedDataSection?.billOfMaterials ??
        []) as unknown as ReportData["billOfMaterials"],
      codeQualitySummary: (advancedDataSection?.codeQualitySummary ??
        null) as unknown as ReportData["codeQualitySummary"],
      scheduledJobsSummary: (advancedDataSection?.scheduledJobsSummary ??
        null) as unknown as ReportData["scheduledJobsSummary"],
      moduleCoupling: (advancedDataSection?.moduleCoupling ??
        null) as unknown as ReportData["moduleCoupling"],
      uiTechnologyAnalysis: (advancedDataSection?.uiTechnologyAnalysis ??
        null) as unknown as ReportData["uiTechnologyAnalysis"],
    };
  }

  /**
   * Prepare HTML data by delegating to each section
   */
  private async prepareHtmlDataFromSections(
    reportData: ReportData,
    sectionDataMap: Map<string, unknown>,
    htmlFilePath: string,
  ): Promise<PreparedHtmlReportData> {
    const htmlDir = path.dirname(htmlFilePath);

    // Prepare HTML data from all sections
    const sectionHtmlDataList = await Promise.all(
      this.sections.map(async (section) => {
        const sectionData = sectionDataMap.get(section.getName());
        return section.prepareHtmlData(reportData, sectionData ?? {}, htmlDir);
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
    sectionDataMap: Map<string, unknown>,
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
      const sectionData = sectionDataMap.get(section.getName());
      const sectionJsonData = section.prepareJsonData(reportData, sectionData ?? {});
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
