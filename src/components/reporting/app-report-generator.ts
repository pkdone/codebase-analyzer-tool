import { injectable, inject } from "tsyringe";
import { TOKENS } from "../../tokens";
import { HtmlReportWriter, type PreparedHtmlReportData } from "./html-report-writer";
import { JsonReportWriter, type PreparedJsonData } from "./json-report-writer";
import { DatabaseReportDataProvider } from "./data-providers/database-report-data-provider";
import { CodeStructureDataProvider } from "./data-providers/code-structure-data-provider";
import { AppStatisticsDataProvider } from "./data-providers/app-statistics-data-provider";
import { AppSummaryCategoriesProvider } from "./data-providers/categories-data-provider";
import { DependencyTreePngGenerator } from "./generators/dependency-tree-png-generator";
import { PieChartGenerator } from "./generators/pie-chart-generator";
import type { SourcesRepository } from "../../repositories/source/sources.repository.interface";
import type { AppSummaryRepository } from "../../repositories/app-summary/app-summaries.repository.interface";
import type { ReportData } from "./report-gen.types";
import type { HierarchicalJavaClassDependency } from "../../repositories/source/sources.model";
import { TableViewModel, type DisplayableTableRow } from "./view-models/table-view-model";
import { convertToDisplayName } from "../../common/utils/text-utils";
import { ensureDirectoryExists } from "../../common/fs/directory-operations";
import { htmlReportConstants } from "./html-report.constants";
import { reportSectionsConfig } from "./report-sections.config";
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
    @inject(TOKENS.AppSummaryRepository)
    private readonly appSummariesRepository: AppSummaryRepository,
    @inject(TOKENS.HtmlReportWriter) private readonly htmlWriter: HtmlReportWriter,
    @inject(TOKENS.JsonReportWriter) private readonly jsonWriter: JsonReportWriter,
    @inject(TOKENS.DatabaseReportDataProvider)
    private readonly databaseDataProvider: DatabaseReportDataProvider,
    @inject(TOKENS.CodeStructureDataProvider)
    private readonly codeStructureDataProvider: CodeStructureDataProvider,
    @inject(TOKENS.AppStatisticsDataProvider)
    private readonly appStatsDataProvider: AppStatisticsDataProvider,
    @inject(TOKENS.AppSummaryCategoriesProvider)
    private readonly categoriesDataProvider: AppSummaryCategoriesProvider,
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
    const [
      appSummaryData,
      fileTypesData,
      integrationPoints,
      dbInteractions,
      procsAndTriggers,
      topLevelJavaClasses,
    ] = await Promise.all([
      this.appSummariesRepository.getProjectAppSummaryFields(
        projectName,
        reportSectionsConfig.allRequiredAppSummaryFields,
      ),
      this.sourcesRepository.getProjectFileTypesCountAndLines(projectName),
      this.databaseDataProvider.getIntegrationPoints(projectName),
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
      integrationPoints,
    };

    // Prepare data for both writers
    const preparedJsonData = this.structureDataForJsonFiles(reportData);
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
   * Structures report data into filename/data pairs for JSON file output.
   */
  private structureDataForJsonFiles(reportData: ReportData): PreparedJsonData[] {
    const completeReportData = {
      appStats: reportData.appStats,
      fileTypesData: reportData.fileTypesData,
      categorizedData: reportData.categorizedData,
      dbInteractions: reportData.dbInteractions,
      procsAndTriggers: reportData.procsAndTriggers,
      topLevelJavaClasses: reportData.topLevelJavaClasses,
      integrationPoints: reportData.integrationPoints,
    };
    const preparedData: PreparedJsonData[] = [
      {
        filename: `${reportSectionsConfig.jsonDataFiles.completeReport}.json`,
        data: completeReportData,
      },
      { filename: reportSectionsConfig.jsonDataFiles.appStats, data: reportData.appStats },
      {
        filename: reportSectionsConfig.jsonDataFiles.appDescription,
        data: { appDescription: reportData.appStats.appDescription },
      },
      { filename: reportSectionsConfig.jsonDataFiles.fileTypes, data: reportData.fileTypesData },
      {
        filename: reportSectionsConfig.jsonDataFiles.dbInteractions,
        data: reportData.dbInteractions,
      },
      {
        filename: reportSectionsConfig.jsonDataFiles.procsAndTriggers,
        data: reportData.procsAndTriggers,
      },
      {
        filename: reportSectionsConfig.jsonDataFiles.topLevelJavaClasses,
        data: reportData.topLevelJavaClasses,
      },
      {
        filename: reportSectionsConfig.jsonDataFiles.integrationPoints,
        data: reportData.integrationPoints,
      },
    ];

    // Add categorized data files
    for (const categoryData of reportData.categorizedData) {
      preparedData.push({
        filename: reportSectionsConfig.getCategoryJSONFilename(categoryData.category),
        data: categoryData.data,
      });
    }

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
    const htmlDir = path.dirname(htmlFilePath);
    await this.ensureReportDirectories(htmlDir);

    const processedFileTypesData = this.processFileTypesData(reportData.fileTypesData);
    const fileTypesPieChartPath = await this.generateFileTypesChart(
      processedFileTypesData,
      htmlDir,
    );

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
    // Database interactions need to be cast via unknown due to strict type checking
    const dbInteractionsTableViewModel = new TableViewModel(
      reportData.dbInteractions as unknown as DisplayableTableRow[],
    );

    // Create view model for stored procedures and triggers
    const combinedProcsTrigsList = [
      ...reportData.procsAndTriggers.procs.list,
      ...reportData.procsAndTriggers.trigs.list,
    ];
    // Combined list needs to be cast via unknown due to strict type checking
    const procsAndTriggersTableViewModel = new TableViewModel(
      combinedProcsTrigsList as unknown as DisplayableTableRow[],
    );

    // Generate PNG files for each top-level Java class and create hyperlinks
    const topLevelJavaClassesDisplayData = await this.generateDependencyTreeDisplayData(
      reportData.topLevelJavaClasses,
      htmlDir,
    );
    const topLevelJavaClassesTableViewModel = new TableViewModel(topLevelJavaClassesDisplayData);

    // Create view model for integration points
    const integrationPointsTableViewModel = new TableViewModel(
      reportData.integrationPoints as unknown as DisplayableTableRow[],
    );

    return {
      appStats: reportData.appStats,
      fileTypesData: processedFileTypesData,
      fileTypesPieChartPath: fileTypesPieChartPath,
      categorizedData: categorizedDataWithViewModels,
      dbInteractions: reportData.dbInteractions,
      procsAndTriggers: reportData.procsAndTriggers,
      topLevelJavaClasses: reportData.topLevelJavaClasses,
      integrationPoints: reportData.integrationPoints,
      jsonFilesConfig: reportSectionsConfig,
      convertToDisplayName,
      fileTypesTableViewModel,
      dbInteractionsTableViewModel,
      procsAndTriggersTableViewModel,
      topLevelJavaClassesTableViewModel,
      integrationPointsTableViewModel,
    };
  }

  /**
   * Ensure required directories exist for report generation
   */
  private async ensureReportDirectories(htmlDir: string): Promise<void> {
    const pngDir = path.join(htmlDir, htmlReportConstants.directories.DEPENDENCY_TREES);
    const chartsDir = path.join(htmlDir, htmlReportConstants.directories.CHARTS);
    await ensureDirectoryExists(pngDir);
    await ensureDirectoryExists(chartsDir);
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

  /**
   * Generate file types pie chart and return the path
   */
  private async generateFileTypesChart(
    processedFileTypesData: ReportData["fileTypesData"],
    htmlDir: string,
  ): Promise<string> {
    const chartsDir = path.join(htmlDir, htmlReportConstants.directories.CHARTS);
    const fileTypesPieChartFilename = await this.pieChartGenerator.generateFileTypesPieChart(
      processedFileTypesData,
      chartsDir,
    );
    return htmlReportConstants.paths.CHARTS_DIR + fileTypesPieChartFilename;
  }

  /**
   * Generate dependency tree PNG files and create display data with hyperlinks
   */
  private async generateDependencyTreeDisplayData(
    topLevelJavaClasses: ReportData["topLevelJavaClasses"],
    htmlDir: string,
  ): Promise<DisplayableTableRow[]> {
    const pngDir = path.join(htmlDir, htmlReportConstants.directories.DEPENDENCY_TREES);

    return await Promise.all(
      topLevelJavaClasses.map(async (classData) => {
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
