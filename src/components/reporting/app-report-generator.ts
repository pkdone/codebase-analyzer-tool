import { injectable, inject } from "tsyringe";
import { TOKENS } from "../../di/tokens";
import { HtmlReportWriter, type PreparedHtmlReportData } from "./html-report-writer";
import { JsonReportWriter, type PreparedJsonData } from "./json-report-writer";
import { DatabaseReportDataProvider } from "./data-providers/database-report-data-provider";
import { CodeStructureDataProvider } from "./data-providers/code-structure-data-provider";
import { AppStatisticsDataProvider } from "./data-providers/app-statistics-data-provider";
import { CategoriesDataProvider } from "./data-providers/categories-data-provider";
import { DependencyTreePngGenerator } from "./dependency-tree-png-generator";
import { PieChartGenerator } from "./pie-chart-generator";
import type { SourcesRepository } from "../../repositories/source/sources.repository.interface";
import type { AppSummariesRepository } from "../../repositories/app-summary/app-summaries.repository.interface";
import type { ReportData } from "./report-gen.types";
import type { HierarchicalJavaClassDependency } from "../../repositories/source/sources.model";
import { TableViewModel, type DisplayableTableRow } from "./view-models/table-view-model";
import { convertToDisplayName } from "../../common/utils/text-formatting";
import { ensureDirectoryExists } from "../../common/utils/directory-operations";
import { htmlReportConstants } from "./html-report.constants";
import { insightsConfig } from "./insights.config";
import path from "path";

/**
 * Class responsible for orchestrating report generation.
 * Data formatting is handled by HtmlReportWriter and JSON output by JsonReportWriter.
 * Data aggregation is handled by dedicated data provider classes.
 */
@injectable()
export default class AppReportGenerator {
  /**
   * Constructor
   */
  constructor(
    @inject(TOKENS.SourcesRepository) private readonly sourcesRepository: SourcesRepository,
    @inject(TOKENS.AppSummariesRepository)
    private readonly appSummariesRepository: AppSummariesRepository,
    @inject(TOKENS.HtmlReportWriter) private readonly htmlWriter: HtmlReportWriter,
    @inject(TOKENS.JsonReportWriter) private readonly jsonWriter: JsonReportWriter,
    @inject(TOKENS.DatabaseReportDataProvider)
    private readonly databaseDataProvider: DatabaseReportDataProvider,
    @inject(TOKENS.CodeStructureDataProvider)
    private readonly codeStructureDataProvider: CodeStructureDataProvider,
    @inject(TOKENS.AppStatisticsDataProvider)
    private readonly appStatsDataProvider: AppStatisticsDataProvider,
    @inject(TOKENS.CategoriesDataProvider)
    private readonly categoriesDataProvider: CategoriesDataProvider,
    @inject(TOKENS.DependencyTreePngGenerator)
    private readonly pngGenerator: DependencyTreePngGenerator,
    @inject(TOKENS.PieChartGenerator)
    private readonly pieChartGenerator: PieChartGenerator,
  ) {}

  /**
   * Generate the HTML static file report using the HtmlReportWriter and write JSON files using JsonReportWriter.
   */
  async generateReport(
    projectName: string,
    outputDir: string,
    outputFilename: string,
  ): Promise<void> {
    const [appSummaryData, fileTypesData, dbInteractions, procsAndTriggers, topLevelJavaClasses] =
      await Promise.all([
        this.appSummariesRepository.getProjectAppSummaryFields(
          projectName,
          insightsConfig.allRequiredAppSummaryFields,
        ),
        this.sourcesRepository.getProjectFileTypesCountAndLines(projectName),
        this.databaseDataProvider.getDatabaseInteractions(projectName),
        this.databaseDataProvider.getSummarizedProceduresAndTriggers(projectName),
        this.codeStructureDataProvider.getTopLevelJavaClasses(projectName),
      ]);

    if (!appSummaryData) {
      throw new Error(
        "Unable to generate report because no app summary data exists - ensure you first run the scripts to process the source data and generate insights",
      );
    }

    // Generate data using consolidated app summary data
    const appStats = await this.appStatsDataProvider.getAppStatistics(projectName, appSummaryData);
    const categorizedData = this.categoriesDataProvider.getCategorizedData(appSummaryData);
    const reportData: ReportData = {
      appStats,
      fileTypesData,
      categorizedData,
      dbInteractions,
      procsAndTriggers,
      topLevelJavaClasses,
    };

    // Prepare data for both writers
    const preparedJsonData = this.prepareJsonData(reportData);
    const htmlFilePath = path.join(outputDir, outputFilename);
    const preparedHtmlData = await this.generateHtmlReportAssetsAndViewModel(
      reportData,
      htmlFilePath,
    );

    // Generate reports using prepared data
    await this.jsonWriter.writeAllJSONFiles(preparedJsonData);
    await this.htmlWriter.writeHTMLReportFile(preparedHtmlData, htmlFilePath);
  }

  /**
   * Prepares JSON data for writing by structuring all report data into filename/data pairs.
   */
  private prepareJsonData(reportData: ReportData): PreparedJsonData[] {
    const completeReportData = {
      appStats: reportData.appStats,
      fileTypesData: reportData.fileTypesData,
      categorizedData: reportData.categorizedData,
      dbInteractions: reportData.dbInteractions,
      procsAndTriggers: reportData.procsAndTriggers,
      topLevelJavaClasses: reportData.topLevelJavaClasses,
    };
    const preparedData: PreparedJsonData[] = [
      { filename: `${insightsConfig.jsonDataFiles.completeReport}.json`, data: completeReportData },
      { filename: insightsConfig.jsonDataFiles.appStats, data: reportData.appStats },
      {
        filename: insightsConfig.jsonDataFiles.appDescription,
        data: { appDescription: reportData.appStats.appDescription },
      },
      { filename: insightsConfig.jsonDataFiles.fileTypes, data: reportData.fileTypesData },
      { filename: insightsConfig.jsonDataFiles.dbInteractions, data: reportData.dbInteractions },
      {
        filename: insightsConfig.jsonDataFiles.procsAndTriggers,
        data: reportData.procsAndTriggers,
      },
      {
        filename: insightsConfig.jsonDataFiles.topLevelJavaClasses,
        data: reportData.topLevelJavaClasses,
      },
    ];

    // Add categorized data files
    reportData.categorizedData.forEach((categoryData) => {
      preparedData.push({
        filename: insightsConfig.getCategoryJSONFilename(categoryData.category),
        data: categoryData.data,
      });
    });

    return preparedData;
  }

  /**
   * Prepares HTML template data by processing all report data, generating assets, and creating view models.
   */
  // Renamed from prepareHtmlData to make side effects (asset generation) explicit
  private async generateHtmlReportAssetsAndViewModel(
    reportData: ReportData,
    htmlFilePath: string,
  ): Promise<PreparedHtmlReportData> {
    // Create directories for PNG files and charts
    const htmlDir = path.dirname(htmlFilePath);
    const pngDir = path.join(htmlDir, htmlReportConstants.directories.DEPENDENCY_TREES);
    const chartsDir = path.join(htmlDir, htmlReportConstants.directories.CHARTS);
    await ensureDirectoryExists(pngDir);
    await ensureDirectoryExists(chartsDir);

    // Process file types data to show "unknown" for empty file types
    const processedFileTypesData = reportData.fileTypesData.map((item) => ({
      ...item,
      fileType: item.fileType || "unknown",
    }));

    // Generate file types pie chart
    const fileTypesPieChartFilename = await this.pieChartGenerator.generateFileTypesPieChart(
      processedFileTypesData,
      chartsDir,
    );
    const fileTypesPieChartPath = htmlReportConstants.paths.CHARTS_DIR + fileTypesPieChartFilename;

    // Create view models for file types summary
    const fileTypesDisplayData = processedFileTypesData.map((item) => ({
      [htmlReportConstants.columnHeaders.FILE_TYPE]: item.fileType,
      [htmlReportConstants.columnHeaders.FILES_COUNT]: item.files,
      [htmlReportConstants.columnHeaders.LINES_COUNT]: item.lines,
    }));
    const fileTypesTableViewModel = new TableViewModel(fileTypesDisplayData);

    // Create view models for categorized data
    const categorizedDataWithViewModels = reportData.categorizedData.map((category) => ({
      ...category,
      tableViewModel: new TableViewModel(category.data as DisplayableTableRow[]),
    }));

    // Create view models for database interactions
    const dbInteractionsTableViewModel = new TableViewModel(
      reportData.dbInteractions as unknown as DisplayableTableRow[],
    );

    // Create view model for stored procedures and triggers
    const combinedProcsTrigsList = [
      ...reportData.procsAndTriggers.procs.list,
      ...reportData.procsAndTriggers.trigs.list,
    ];
    const procsAndTriggersTableViewModel = new TableViewModel(
      combinedProcsTrigsList as unknown as DisplayableTableRow[],
    );

    // Generate PNG files for each top-level Java class and create hyperlinks
    const topLevelJavaClassesDisplayData = await Promise.all(
      reportData.topLevelJavaClasses.map(async (classData) => {
        // Generate PNG file for this class's dependency tree
        const pngFileName = await this.pngGenerator.generateHierarchicalDependencyTreePng(
          classData.namespace,
          classData.dependencies,
          pngDir,
        );

        // Create hyperlink to the PNG file
        const pngRelativePath = htmlReportConstants.paths.DEPENDENCY_TREES_DIR + pngFileName;
        const classpathLink = htmlReportConstants.html.LINK_TEMPLATE(
          pngRelativePath,
          classData.namespace,
        );

        // Count total dependencies from hierarchical structure
        const dependencyCount = this.countUniqueDependencies(classData.dependencies);

        return {
          [htmlReportConstants.columnHeaders.CLASSPATH]: classpathLink,
          [htmlReportConstants.columnHeaders.DEPENDENCIES_COUNT]: dependencyCount,
        };
      }),
    );
    const topLevelJavaClassesTableViewModel = new TableViewModel(topLevelJavaClassesDisplayData);

    return {
      appStats: reportData.appStats,
      fileTypesData: processedFileTypesData,
      fileTypesPieChartPath: fileTypesPieChartPath,
      categorizedData: categorizedDataWithViewModels,
      dbInteractions: reportData.dbInteractions,
      procsAndTriggers: reportData.procsAndTriggers,
      topLevelJavaClasses: reportData.topLevelJavaClasses,
      jsonFilesConfig: insightsConfig,
      convertToDisplayName,
      fileTypesTableViewModel,
      dbInteractionsTableViewModel,
      procsAndTriggersTableViewModel,
      topLevelJavaClassesTableViewModel,
    };
  }

  /**
   * Counts unique dependencies in a hierarchical dependency structure, excluding the root element.
   * Uses an iterative approach with a stack to avoid potential stack overflow with deep trees.
   */
  private countUniqueDependencies(
    dependencies: readonly HierarchicalJavaClassDependency[],
  ): number {
    const uniqueClasspaths = new Set<string>();
    const stack = [...dependencies]; // Initialize stack with top-level dependencies

    while (stack.length > 0) {
      const dependency = stack.pop();
      if (!dependency) continue;

      uniqueClasspaths.add(dependency.namespace);

      // Add children to the stack to be processed
      if (dependency.dependencies && dependency.dependencies.length > 0) {
        for (const child of dependency.dependencies) {
          stack.push(child);
        }
      }
    }

    return uniqueClasspaths.size;
  }
}
