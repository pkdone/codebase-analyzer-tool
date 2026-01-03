import { injectable, inject, injectAll } from "tsyringe";
import { reportingTokens, repositoryTokens } from "../../di/tokens";
import { HtmlReportWriter, type PreparedHtmlReportData } from "./html-report-writer";
import { JsonReportWriter, type PreparedJsonData } from "./json-report-writer";
import { AppStatisticsDataProvider } from "./sections/quality-metrics/app-statistics-data-provider";
import {
  CategorizedSectionDataBuilder,
  isCategorizedDataNameDescArray,
} from "./sections/shared/categorized-section-data-builder";
import type { AppSummariesRepository } from "../../repositories/app-summaries/app-summaries.repository.interface";
import type { ReportData } from "./report-data.types";
import { TableViewModel, type DisplayableTableRow } from "./view-models/table-view-model";
import { convertToDisplayName } from "../../../common/utils/text-utils";
import { reportSectionsConfig } from "./report-sections.config";
import type { ReportSection } from "./sections/report-section.interface";
import path from "path";
import { promises as fs } from "fs";
import { outputConfig } from "../../config/output.config";
import { htmlReportConstants } from "./html-report.constants";

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

    // Copy Mermaid.js to assets directory for offline support
    await this.copyMermaidJsToAssets(outputDir);

    // Generate reports using prepared data
    await this.jsonWriter.writeAllJSONFiles(preparedJsonData);
    await this.htmlWriter.writeHTMLReportFile(preparedHtmlDataWithAssets, htmlFilePath);
  }

  /**
   * Download and copy Mermaid.js to the assets directory for offline report viewing.
   */
  private async copyMermaidJsToAssets(outputDir: string): Promise<void> {
    const assetsDir = path.join(outputDir, htmlReportConstants.directories.ASSETS);
    const mermaidPath = path.join(assetsDir, outputConfig.externalAssets.MERMAID_UMD_FILENAME);

    try {
      await fs.mkdir(assetsDir, { recursive: true });

      // Check if file already exists
      try {
        await fs.access(mermaidPath);
        console.log("Mermaid.js already exists in assets directory, skipping download");
        return;
      } catch {
        // File doesn't exist, proceed with download
      }

      // Prefer copying from local node_modules for true offline report generation.
      const localMermaidPath = path.join(
        process.cwd(),
        "node_modules",
        "mermaid",
        "dist",
        "mermaid.min.js",
      );

      try {
        const buffer = await fs.readFile(localMermaidPath);
        await fs.writeFile(mermaidPath, buffer);
        console.log(`Mermaid.js copied from node_modules to ${mermaidPath}`);
        return;
      } catch {
        // Fall back to downloading from CDN (requires internet during report generation)
      }

      console.log("Downloading Mermaid.js for offline report support...");
      const response = await fetch(outputConfig.externalAssets.MERMAID_CDN_UMD_URL);
      if (!response.ok) {
        throw new Error(`Failed to download Mermaid.js: ${response.status} ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      await fs.writeFile(mermaidPath, buffer);
      console.log(`Mermaid.js downloaded and copied to ${mermaidPath}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(
        `Warning: Failed to download Mermaid.js. Report will require internet connection: ${errorMessage}`,
      );
      // Don't throw - allow report generation to continue even if Mermaid download fails
    }
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

    return {
      ...mergedHtmlData,
      appStats: reportData.appStats,
      categorizedData: categorizedDataWithViewModels,
      jsonFilesConfig: reportSectionsConfig,
      htmlReportConstants,
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
