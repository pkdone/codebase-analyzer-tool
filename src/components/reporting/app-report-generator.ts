import { injectable, inject } from "tsyringe";
import { TOKENS } from "../../di/tokens";
import { HtmlReportWriter } from "./html-report-writer";
import { JsonReportWriter } from "./json-report-writer";
import { DatabaseReportDataProvider } from "./data-providers/database-report-data-provider";
import { AppStatisticsDataProvider } from "./data-providers/app-statistics-data-provider";
import { CategoriesDataProvider } from "./data-providers/categories-data-provider";
import type { SourcesRepository } from "../../repositories/source/sources.repository.interface";
import type { ReportData } from "./report-gen.types";
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
    @inject(TOKENS.HtmlReportWriter) private readonly htmlWriter: HtmlReportWriter,
    @inject(TOKENS.JsonReportWriter) private readonly jsonWriter: JsonReportWriter,
    @inject(TOKENS.DatabaseReportDataProvider)
    private readonly databaseDataProvider: DatabaseReportDataProvider,
    @inject(TOKENS.AppStatisticsDataProvider)
    private readonly appStatsDataProvider: AppStatisticsDataProvider,
    @inject(TOKENS.CategoriesDataProvider)
    private readonly categoriesDataProvider: CategoriesDataProvider,
  ) {}

  /**
   * Generate the HTML static file report using the HtmlReportWriter and write JSON files using JsonReportWriter.
   */
  async generateReport(
    projectName: string,
    outputDir: string,
    outputFilename: string,
  ): Promise<void> {
    const [appStats, fileTypesData, categorizedData, dbInteractions, procsAndTriggers] =
      await Promise.all([
        this.appStatsDataProvider.getAppStatistics(projectName),
        this.sourcesRepository.getProjectFileTypesCountAndLines(projectName),
        this.categoriesDataProvider.getCategorizedData(projectName),
        this.databaseDataProvider.getDatabaseInteractions(projectName),
        this.databaseDataProvider.getStoredProceduresAndTriggers(projectName),
      ]);
    const reportData: ReportData = {
      appStats,
      fileTypesData,
      categorizedData,
      dbInteractions,
      procsAndTriggers,
    };

    // Generate reports using the unified data object
    await this.jsonWriter.writeAllJSONFiles(reportData);
    const htmlFilePath = path.join(outputDir, outputFilename);
    await this.htmlWriter.writeHTMLReportFile(reportData, htmlFilePath);
  }
}
