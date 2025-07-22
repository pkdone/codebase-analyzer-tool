import { injectable, inject } from "tsyringe";
import { appConfig } from "../../config/app.config";
import { summaryCategoriesConfig } from "../insights/insights.config";
import { AppSummaryCategories } from "../../schemas/app-summaries.schema";
import type { SourcesRepository } from "../../repositories/source/sources.repository.interface";
import type { AppSummariesRepository } from "../../repositories/app-summary/app-summaries.repository.interface";
import type {
  AppSummaryRecord,
  AppSummaryNameDescArray,
} from "../../repositories/app-summary/app-summaries.model";
import { TOKENS } from "../../di/tokens";
import { HtmlReportWriter } from "./html-report-writer";
import { JsonReportWriter } from "./json-report-writer";
import type { AppStatistics, ProcsAndTriggers, DatabaseIntegrationInfo } from "./report-gen.types";
import { Complexity, isComplexity } from "./report-gen.types";
import path from "path";

/**
 * Class responsible for aggregating data for HTML report generation.
 * Data formatting is handled by HtmlReportFormatter and JSON output by JsonReportWriter.
 */
@injectable()
export default class AppReportGenerator {
  // Private fields
  private readonly currentDate;

  /**
   * Constructor
   */
  constructor(
    @inject(TOKENS.SourcesRepository) private readonly sourcesRepository: SourcesRepository,
    @inject(TOKENS.AppSummariesRepository)
    private readonly appSummariesRepository: AppSummariesRepository,
    @inject(TOKENS.HtmlReportFormatter) private readonly htmlWriter: HtmlReportWriter,
    @inject(TOKENS.JsonReportWriter) private readonly jsonWriter: JsonReportWriter,
  ) {
    this.currentDate = new Date().toLocaleString();
  }

  /**
   * Generate the HTML static file report using the HtmlReportFormatter and write JSON files using JsonReportWriter.
   */
  async generateReport(
    projectName: string,
    outputDir: string,
    outputFilename: string,
  ): Promise<void> {
    const appStats = await this.getAppStatistics(projectName);
    const fileTypesData =
      await this.sourcesRepository.getProjectFileTypesCountAndLines(projectName);
    const categorizedData = await this.buildCategoriesData(projectName);
    const dbInteractions = await this.buildDBInteractionList(projectName);
    const procsAndTriggers = await this.buildDBStoredProcsTriggersSummaryList(projectName);
    await this.jsonWriter.writeAllJSONFiles(
      categorizedData,
      appStats,
      fileTypesData,
      dbInteractions,
      procsAndTriggers,
    );
    const htmlFilePath = path.join(outputDir, outputFilename);
    await this.htmlWriter.writeHTMLReportFile(
      appStats,
      fileTypesData,
      categorizedData,
      dbInteractions,
      procsAndTriggers,
      htmlFilePath,
    );
  }

  /**
   * Returns a list of database integrations.
   */
  async buildDBInteractionList(projectName: string): Promise<DatabaseIntegrationInfo[]> {
    const records = await this.sourcesRepository.getProjectDatabaseIntegrations(projectName, [
      ...appConfig.CODE_FILE_EXTENSIONS,
    ]);

    return records.map((record) => {
      const { summary, filepath } = record;
      const databaseIntegration = summary?.databaseIntegration;
      if (summary && databaseIntegration) {
        return {
          path: summary.classpath ?? filepath,
          mechanism: databaseIntegration.mechanism,
          description: databaseIntegration.description,
          codeExample: databaseIntegration.codeExample,
        };
      }
      // This should not happen due to the filter above, but satisfies TypeScript
      throw new Error("Record missing required summary or databaseIntegration");
    });
  }

  /**
   * Returns an aggregated summary of stored procedures and triggers.
   */
  async buildDBStoredProcsTriggersSummaryList(projectName: string) {
    const procsAndTriggers: ProcsAndTriggers = {
      procs: { total: 0, low: 0, medium: 0, high: 0, list: [] },
      trigs: { total: 0, low: 0, medium: 0, high: 0, list: [] },
    };

    const records = await this.sourcesRepository.getProjectStoredProceduresAndTriggers(
      projectName,
      [...appConfig.CODE_FILE_EXTENSIONS],
    );

    for (const record of records) {
      const summary = record.summary;

      if (!summary) {
        console.log(
          `No stored procs / triggers summary exists for file: ${record.filepath}. Skipping.`,
        );
        continue;
      }

      // Process stored procedures and triggers using the helper method
      this.processDbObjects(
        summary.storedProcedures,
        procsAndTriggers.procs,
        "STORED PROCEDURE",
        record.filepath,
      );
      this.processDbObjects(summary.triggers, procsAndTriggers.trigs, "TRIGGER", record.filepath);
    }

    return procsAndTriggers;
  }

  /**
   * Collect app statistics data
   */
  private async getAppStatistics(projectName: string): Promise<AppStatistics> {
    const appSummaryRecord =
      await this.appSummariesRepository.getProjectAppSummaryDescAndLLMProvider(projectName);
    if (!appSummaryRecord)
      throw new Error(
        "Unable to generate app statistics for a report because no app summary data exists - ensure you first run the scripts to process the source data and generate insights",
      );
    return {
      projectName: projectName,
      currentDate: this.currentDate,
      llmProvider: appSummaryRecord.llmProvider,
      fileCount: await this.sourcesRepository.getProjectFilesCount(projectName),
      linesOfCode: await this.sourcesRepository.getProjectTotalLinesOfCode(projectName),
      appDescription:
        typeof appSummaryRecord.appDescription === "string"
          ? appSummaryRecord.appDescription
          : "No description available",
    };
  }

  /**
   * Build categorized data for all categories.
   */
  private async buildCategoriesData(
    projectName: string,
  ): Promise<{ category: string; label: string; data: AppSummaryNameDescArray }[]> {
    const categoryKeys = AppSummaryCategories.options.filter(
      (key) => key !== appConfig.APP_DESCRIPTION_KEY,
    );
    const categorizedData: { category: string; label: string; data: AppSummaryNameDescArray }[] =
      [];

    for (const category of categoryKeys) {
      const label = summaryCategoriesConfig[category].label;
      const result = await this.appSummariesRepository.getProjectAppSummaryField(
        projectName,
        category as keyof AppSummaryRecord,
      );
      const data = result ? (result as AppSummaryNameDescArray) : [];
      categorizedData.push({
        category,
        label,
        data,
      });
      console.log(`Generated ${label} table`);
    }

    return categorizedData;
  }

  /**
   * Process database objects (stored procedures or triggers) and populate target section
   */
  private processDbObjects(
    items:
      | {
          name: string;
          complexity: unknown;
          complexityReason?: string;
          linesOfCode: number;
          purpose: string;
        }[]
      | undefined,
    target: ProcsAndTriggers["procs"] | ProcsAndTriggers["trigs"],
    type: "STORED PROCEDURE" | "TRIGGER",
    filepath: string,
  ) {
    for (const item of items ?? []) {
      target.total++;
      this.incrementComplexityCount(target, item.complexity);
      target.list.push({
        path: filepath,
        type: type,
        functionName: item.name,
        complexity: isComplexity(item.complexity) ? item.complexity : Complexity.LOW,
        complexityReason: item.complexityReason ?? "N/A",
        linesOfCode: item.linesOfCode,
        purpose: item.purpose,
      });
    }
  }

  /**
   * Increment the complexity count on a procs/trigs section.
   */
  private incrementComplexityCount(
    section: ProcsAndTriggers["procs"] | ProcsAndTriggers["trigs"],
    complexity: unknown, // Accept unknown for robust checking
  ) {
    if (!isComplexity(complexity)) {
      console.warn(
        `Unexpected or missing complexity value encountered: ${String(complexity)}. Defaulting to LOW.`,
      );
      section.low++; // Default to LOW to maintain consistency
      return;
    }

    // 'complexity' is now safely typed as Complexity
    switch (complexity) {
      case Complexity.LOW:
        section.low++;
        break;
      case Complexity.MEDIUM:
        section.medium++;
        break;
      case Complexity.HIGH:
        section.high++;
        break;
      // No default needed due to exhaustive check
    }
  }
}
