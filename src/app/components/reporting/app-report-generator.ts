import { injectable, inject, injectAll } from "tsyringe";
import { reportingTokens, repositoryTokens, coreTokens } from "../../di/tokens";
import { HtmlReportWriter } from "./html-report-writer";
import type {
  PreparedHtmlReportData,
  PreparedHtmlReportDataWithoutAssets,
} from "./types/html-report-data.types";
import { JsonReportWriter, type PreparedJsonData } from "./json-report-writer";
import { AppStatisticsDataProvider } from "./sections/overview/app-statistics-data-provider";
import { CategorizedSectionDataBuilder, isCategorizedDataNameDescArray } from "./data-processing";
import type { AppSummariesRepository } from "../../repositories/app-summaries/app-summaries.repository.interface";
import type { RequestableAppSummaryField } from "../../repositories/app-summaries/app-summaries.model";
import type { ReportData } from "./report-data.types";
import { TableViewModel, type DisplayableTableRow } from "./view-models/table-view-model";
import { convertToDisplayName } from "../../../common/utils/text-utils";
import type { ReportSection } from "./sections/report-section.interface";
import path from "path";
import type { OutputConfigType } from "../../config/output.config";
import { HtmlReportAssetService } from "./services/html-report-asset.service";
import { CORE_REQUIRED_APP_SUMMARY_FIELDS } from "./reporting.constants";

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
    @inject(reportingTokens.CategorizedSectionDataBuilder)
    private readonly categoriesDataBuilder: CategorizedSectionDataBuilder,
    @injectAll(reportingTokens.ReportSection)
    private readonly sections: ReportSection[],
    @inject(coreTokens.OutputConfig) private readonly outputConfig: OutputConfigType,
    @inject(reportingTokens.HtmlReportAssetService)
    private readonly assetService: HtmlReportAssetService,
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
    // Aggregate required app summary fields from all sections plus core fields
    const allRequiredFields = this.aggregateRequiredAppSummaryFields();

    // Fetch base app summary data required for all sections
    const appSummaryData = await this.appSummariesRepository.getProjectAppSummaryFields(
      projectName,
      allRequiredFields,
    );

    if (!appSummaryData) {
      throw new Error(
        "Unable to generate report because no app summary data exists - ensure you first run the scripts to process the source data and generate insights",
      );
    }

    // Generate core app statistics and categorized data
    const appStats = await this.appStatsDataProvider.getAppStatistics(projectName, appSummaryData);
    const categorizedData = this.categoriesDataBuilder.getStandardSectionData(appSummaryData);

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
      allRequiredFields,
    );

    const preparedJsonData = this.prepareJsonDataFromSections(reportData, sectionDataMap);

    // Copy Mermaid.js to assets directory for offline support
    await this.assetService.ensureMermaidAsset(outputDir);

    // Generate reports using prepared data
    // HtmlReportWriter handles asset loading internally via HtmlReportAssetService
    await this.jsonWriter.writeAllJSONFiles(preparedJsonData);
    await this.htmlWriter.writeHTMLReportFile(preparedHtmlData, htmlFilePath);
  }

  /**
   * Prepare HTML data by delegating to each section.
   * Returns data without assets - the HtmlReportWriter will load assets separately.
   */
  private async prepareHtmlDataFromSections(
    reportData: ReportData,
    sectionDataMap: Map<string, Partial<ReportData>>,
    htmlFilePath: string,
    allRequiredFields: RequestableAppSummaryField[],
  ): Promise<PreparedHtmlReportDataWithoutAssets> {
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

    // Add categorized data view models (only for name-desc arrays, not inferred architecture)
    const categorizedDataWithViewModels = reportData.categorizedData.map((category) => {
      if (isCategorizedDataNameDescArray(category.data)) {
        return {
          ...category,
          data: category.data,
          tableViewModel: new TableViewModel(category.data as DisplayableTableRow[]),
        };
      }
      // For inferred architecture, don't create a table view model
      return {
        ...category,
        data: category.data,
        tableViewModel: new TableViewModel([]),
      };
    });

    // Construct template constants from centralized output config
    const templateConstants = {
      paths: {
        ASSETS_DIR: `${this.outputConfig.assets.ASSETS_SUBDIR}/`,
      },
    };

    // Create the config for the HTML template with all required JSON file references
    const jsonFilesConfig = {
      allRequiredAppSummaryFields: allRequiredFields,
      jsonDataFiles: {
        completeReport: this.outputConfig.jsonFiles.COMPLETE_REPORT,
        appStats: this.outputConfig.jsonFiles.APP_STATS,
        appDescription: this.outputConfig.jsonFiles.APP_DESCRIPTION,
        fileTypes: this.outputConfig.jsonFiles.FILE_TYPES,
        procsAndTriggers: this.outputConfig.jsonFiles.PROCS_AND_TRIGGERS,
        dbInteractions: this.outputConfig.jsonFiles.DB_INTERACTIONS,
        integrationPoints: this.outputConfig.jsonFiles.INTEGRATION_POINTS,
      },
      getCategoryJSONFilename: (category: string): string => `${category}.json`,
    };

    /**
     * TYPE ASSERTION RATIONALE:
     * The spread of `mergedHtmlData` combines data from all report sections, each returning
     * Partial<PreparedHtmlReportData>. TypeScript cannot verify that the combined partials
     * plus the explicit properties below satisfy all required interface properties because:
     * 1. Section contributions are determined dynamically at runtime via multi-injection
     * 2. Object spread types don't narrow through reduce iteration
     *
     * The architecture ensures coverage: each section is responsible for populating its
     * designated properties, and the explicit additions here cover core data (appStats,
     * categorizedData, etc.). If a section fails (via Promise.allSettled), the HTML template
     * handles missing optional data gracefully via conditional rendering.
     */
    return {
      ...mergedHtmlData,
      appStats: reportData.appStats,
      categorizedData: categorizedDataWithViewModels,
      jsonFilesConfig,
      htmlReportConstants: templateConstants,
      convertToDisplayName,
    } as PreparedHtmlReportDataWithoutAssets;
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
      integrationPoints: reportData.integrationPoints,
      billOfMaterials: reportData.billOfMaterials,
      codeQualitySummary: reportData.codeQualitySummary,
      scheduledJobsSummary: reportData.scheduledJobsSummary,
      moduleCoupling: reportData.moduleCoupling,
    };
    allJsonData.push({
      filename: this.outputConfig.jsonFiles.COMPLETE_REPORT,
      data: completeReportData,
    });

    // Add app stats and app description JSON files
    allJsonData.push(
      { filename: this.outputConfig.jsonFiles.APP_STATS, data: reportData.appStats },
      {
        filename: this.outputConfig.jsonFiles.APP_DESCRIPTION,
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
        filename: `${categoryData.category}.json`,
        data: categoryData.data,
      });
    }

    return allJsonData;
  }

  /**
   * Aggregate all required app summary fields from sections and core requirements.
   * This decentralizes configuration - each section declares its own requirements.
   *
   * Returns a strongly-typed array of RequestableAppSummaryField to ensure
   * compile-time safety when passing to repository methods.
   */
  private aggregateRequiredAppSummaryFields(): RequestableAppSummaryField[] {
    // Start with core fields needed by the generator
    const allFields = new Set<RequestableAppSummaryField>(CORE_REQUIRED_APP_SUMMARY_FIELDS);

    // Add fields required by each section
    for (const section of this.sections) {
      for (const field of section.getRequiredAppSummaryFields()) {
        allFields.add(field);
      }
    }

    return Array.from(allFields);
  }
}
