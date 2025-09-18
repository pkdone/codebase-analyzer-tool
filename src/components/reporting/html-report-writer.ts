import { injectable } from "tsyringe";
import path from "path";
import ejs from "ejs";
import { outputConfig } from "../../config/output.config";
import { jsonFilesConfig } from "./json-files.config";
import type { ReportData } from "./report-gen.types";
import { writeFile } from "../../common/utils/file-operations";
import { convertToDisplayName } from "../../common/utils/text-utils";
import { ensureDirectoryExists } from "../../common/utils/directory-operations";
import { TableViewModel, type DisplayableTableRow } from "./view-models/table-view-model";
import { htmlReportConstants } from "./html-report.constants";
import { DependencyTreePngGenerator } from "./dependency-tree-png-generator";
import { PieChartGenerator } from "./pie-chart-generator";
import type { HierarchicalJavaClassDependency } from "../../repositories/source/sources.model";

interface EjsTemplateData {
  appStats: ReportData["appStats"];
  fileTypesData: ReportData["fileTypesData"];
  fileTypesPieChartPath: string;
  categorizedData: {
    category: string;
    label: string;
    data: unknown[];
    tableViewModel: TableViewModel;
  }[];
  dbInteractions: ReportData["dbInteractions"];
  procsAndTriggers: ReportData["procsAndTriggers"];
  topLevelJavaClasses: ReportData["topLevelJavaClasses"];
  jsonFilesConfig: typeof jsonFilesConfig;
  convertToDisplayName: (text: string) => string;
  fileTypesTableViewModel: TableViewModel;
  dbInteractionsTableViewModel: TableViewModel;
  procsAndTriggersTableViewModel: TableViewModel;
  topLevelJavaClassesTableViewModel: TableViewModel;
}

/**
 * Class responsible for formatting data into HTML presentation format using EJS templates.
 * This class takes aggregated data structures and converts them to HTML using template files.
 */
@injectable()
export class HtmlReportWriter {
  constructor(
    private readonly pngGenerator: DependencyTreePngGenerator,
    private readonly pieChartGenerator: PieChartGenerator,
  ) {}

  /**
   * Generate complete HTML report from all data sections using EJS templates and write it to file.
   */
  async writeHTMLReportFile(reportData: ReportData, htmlFilePath: string): Promise<void> {
    // Create directories for PNG files
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
    const templatePath = path.join(
      __dirname,
      outputConfig.HTML_TEMPLATES_DIR,
      outputConfig.HTML_MAIN_TEMPLATE_FILE,
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
          classData.classpath,
          classData.dependencies,
          pngDir,
        );

        // Create hyperlink to the PNG file
        const pngRelativePath = htmlReportConstants.paths.DEPENDENCY_TREES_DIR + pngFileName;
        const classpathLink = htmlReportConstants.html.LINK_TEMPLATE(
          pngRelativePath,
          classData.classpath,
        );

        // Count total dependencies from hierarchical structure
        const dependencyCount = this.countAllDependencies(classData.dependencies);

        return {
          [htmlReportConstants.columnHeaders.CLASSPATH]: classpathLink,
          [htmlReportConstants.columnHeaders.DEPENDENCIES_COUNT]: dependencyCount,
        };
      }),
    );
    const topLevelJavaClassesTableViewModel = new TableViewModel(topLevelJavaClassesDisplayData);

    const data: EjsTemplateData = {
      appStats: reportData.appStats,
      fileTypesData: processedFileTypesData,
      fileTypesPieChartPath: fileTypesPieChartPath,
      categorizedData: categorizedDataWithViewModels,
      dbInteractions: reportData.dbInteractions,
      procsAndTriggers: reportData.procsAndTriggers,
      topLevelJavaClasses: reportData.topLevelJavaClasses,
      jsonFilesConfig,
      convertToDisplayName,
      fileTypesTableViewModel,
      dbInteractionsTableViewModel,
      procsAndTriggersTableViewModel,
      topLevelJavaClassesTableViewModel,
    };
    const htmlContent = await ejs.renderFile(templatePath, data);
    await writeFile(htmlFilePath, htmlContent);
    console.log(
      `View generated report in a browser: ${htmlReportConstants.protocols.FILE_PROTOCOL}${path.resolve(htmlFilePath)}`,
    );
  }

  /**
   * Counts unique dependencies in a hierarchical dependency structure, excluding the root element.
   */
  private countAllDependencies(dependencies: readonly HierarchicalJavaClassDependency[]): number {
    const uniqueClasspaths = new Set<string>();
    this.collectUniqueClasspaths(dependencies, uniqueClasspaths);
    return uniqueClasspaths.size;
  }

  /**
   * Recursively collects unique classpaths from hierarchical dependencies.
   */
  private collectUniqueClasspaths(
    dependencies: readonly HierarchicalJavaClassDependency[],
    uniqueClasspaths: Set<string>,
  ): void {
    for (const dependency of dependencies) {
      // Add this dependency to the unique set
      uniqueClasspaths.add(dependency.classpath);

      // Recursively collect from nested dependencies
      if (dependency.dependencies && dependency.dependencies.length > 0) {
        this.collectUniqueClasspaths(dependency.dependencies, uniqueClasspaths);
      }
    }
  }
}
