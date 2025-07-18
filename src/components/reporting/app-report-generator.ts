import { injectable, inject } from "tsyringe";
import { appConfig } from "../../config/app.config";
import { summaryCategoriesConfig } from "../../config/summary-categories.config";
import { AppSummaryCategoryEnum } from "../../schemas/app-summary-categories.schema";
import type { SourcesRepository } from "../../repositories/source/sources.repository.interface";
import type { AppSummariesRepository } from "../../repositories/app-summary/app-summaries.repository.interface";
import type {
  AppSummaryRecord,
  AppSummaryNameDescArray,
} from "../../repositories/app-summary/app-summaries.model";
import { appSummaryNameDescArraySchema } from "../../repositories/app-summary/app-summaries.model";
import { TOKENS } from "../../di/tokens";
import { HtmlReportFormatter } from "./html-report-formatter";
import type { AppStatistics, ProcsAndTriggers, DatabaseIntegrationInfo } from "./report-gen.types";
import { Complexity, isComplexity } from "./report-gen.types";

/**
 * Class responsible for aggregating data for HTML report generation.
 * Data formatting is handled by HtmlReportFormatter.
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
    @inject(TOKENS.HtmlReportFormatter) private readonly htmlFormatter: HtmlReportFormatter,
  ) {
    this.currentDate = new Date().toLocaleString();
  }

  /**
   * Generate the HTML static file report using the HtmlReportFormatter.
   */
  async generateHTMLReport(projectName: string): Promise<string> {
    const appStats = await this.getAppStatistics(projectName);
    const fileTypesData =
      await this.sourcesRepository.getProjectFileTypesCountAndLines(projectName);
    const categorizedData = await this.buildCategoriesData(projectName);
    const dbInteractions = await this.buildDBInteractionList(projectName);
    const procsAndTriggers = await this.buildDBStoredProcsTriggersSummaryList(projectName);
    return await this.htmlFormatter.generateCompleteHTMLReport(
      appStats,
      fileTypesData,
      categorizedData,
      dbInteractions,
      procsAndTriggers,
    );
  }

  /**
   * Returns a list of database integrations.
   */
  async buildDBInteractionList(projectName: string): Promise<DatabaseIntegrationInfo[]> {
    const records = await this.sourcesRepository.getProjectDatabaseIntegrations(projectName, [
      ...appConfig.SOURCE_FILES_FOR_CODE,
    ]);

    return records.map((record) => {
      const { summary, filepath } = record;
      const databaseIntegration = summary?.databaseIntegration;
      if (summary && databaseIntegration) {
        return {
          path: summary.classpath ?? filepath,
          mechanism: databaseIntegration.mechanism ?? "UNKNOWN",
          description: databaseIntegration.description ?? "No description available",
          codeExample: databaseIntegration.codeExample ?? "No code example available",
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
      [...appConfig.SOURCE_FILES_FOR_CODE],
    );

    for (const record of records) {
      const summary = record.summary;

      if (!summary) {
        console.log(
          `No stored procs / triggers summary exists for file: ${record.filepath}. Skipping.`,
        );
        continue;
      }

      // Process stored procedures
      for (const sp of summary.storedProcedures ?? []) {
        procsAndTriggers.procs.total++;
        this.incrementComplexityCount(procsAndTriggers.procs, sp.complexity);
        procsAndTriggers.procs.list.push({
          path: record.filepath,
          type: "STORED PROCEDURE",
          functionName: sp.name,
          complexity: isComplexity(sp.complexity) ? sp.complexity : Complexity.LOW,
          complexityReason: sp.complexityReason || "N/A",
          linesOfCode: sp.linesOfCode,
          purpose: sp.purpose,
        });
      }

      // Process triggers
      for (const trig of summary.triggers ?? []) {
        procsAndTriggers.trigs.total++;
        this.incrementComplexityCount(procsAndTriggers.trigs, trig.complexity);
        procsAndTriggers.trigs.list.push({
          path: record.filepath,
          type: "TRIGGER",
          functionName: trig.name,
          complexity: isComplexity(trig.complexity) ? trig.complexity : Complexity.LOW,
          complexityReason: trig.complexityReason || "N/A",
          linesOfCode: trig.linesOfCode,
          purpose: trig.purpose,
        });
      }
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
    const categoryKeys = AppSummaryCategoryEnum.options.filter(
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
      const parsed = appSummaryNameDescArraySchema.safeParse(result);
      const data = parsed.success ? parsed.data : [];
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
