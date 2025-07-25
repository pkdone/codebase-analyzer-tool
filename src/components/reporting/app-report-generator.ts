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
 * Data formatting is handled by HtmlReportFormatter and JSON output by JsonReportWriter.
 * Data aggregation is handled by dedicated data provider classes.
 */
@injectable()
export default class AppReportGenerator {
  /**
   * Constructor
   */
  constructor(
    @inject(TOKENS.SourcesRepository) private readonly sourcesRepository: SourcesRepository,
    @inject(TOKENS.HtmlReportFormatter) private readonly htmlWriter: HtmlReportWriter,
    @inject(TOKENS.JsonReportWriter) private readonly jsonWriter: JsonReportWriter,
    @inject(TOKENS.DatabaseReportDataProvider)
    private readonly databaseDataProvider: DatabaseReportDataProvider,
    @inject(TOKENS.AppStatisticsDataProvider)
    private readonly appStatsDataProvider: AppStatisticsDataProvider,
    @inject(TOKENS.CategoriesDataProvider)
    private readonly categoriesDataProvider: CategoriesDataProvider,
  ) {}

  /**
   * Generate the HTML static file report using the HtmlReportFormatter and write JSON files using JsonReportWriter.
   */
  async generateReport(
    projectName: string,
    outputDir: string,
    outputFilename: string,
  ): Promise<void> {
    // Collect all data from providers
    const appStats = await this.appStatsDataProvider.getAppStatistics(projectName);
    const fileTypesData =
      await this.sourcesRepository.getProjectFileTypesCountAndLines(projectName);
    const categorizedData = await this.categoriesDataProvider.getCategorizedData(projectName);
    const dbInteractions = await this.databaseDataProvider.getDatabaseInteractions(projectName);
    const procsAndTriggers =
      await this.databaseDataProvider.getStoredProceduresAndTriggers(projectName);

    // Construct unified report data object
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
