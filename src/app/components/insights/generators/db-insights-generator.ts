import { injectable, inject } from "tsyringe";
import LLMRouter from "../../../../common/llm/llm-router";
import { fileProcessingRules as fileProcessingConfig } from "../../../config/file-handling";
import { llmConcurrencyLimiter } from "../../../config/concurrency.config";
import { logErr, logWarn } from "../../../../common/utils/logging";
import type { AppSummariesRepository } from "../../../repositories/app-summaries/app-summaries.repository.interface";
import type { SourcesRepository } from "../../../repositories/sources/sources.repository.interface";
import { repositoryTokens } from "../../../di/tokens";
import { llmTokens } from "../../../di/tokens";
import { coreTokens } from "../../../di/tokens";
import { insightsTuningConfig } from "../insights.config";
import { promptManager } from "../../../prompts/prompt-registry";
import { AppSummaryCategories } from "../../../schemas/app-summaries.schema";
import { AppSummaryCategoryEnum } from "../insights.types";
import type { IInsightGenerationStrategy } from "../strategies/completion-strategy.interface";
import { chunkTextByTokenLimit } from "../../../../common/llm/utils/text-chunking";
import { insightsTokens } from "../../../di/tokens";

/**
 * Generates metadata in database collections to capture application information,
 * such as entities and processes, for a given project.
 * Uses strategy pattern to select between single-pass and map-reduce approaches.
 */
@injectable()
export default class InsightsFromDBGenerator {
  private readonly llmProviderDescription: string;
  private readonly maxTokens: number;

  /**
   * Creates a new InsightsFromDBGenerator with strategy-based processing.
   */
  constructor(
    @inject(repositoryTokens.AppSummariesRepository)
    private readonly appSummariesRepository: AppSummariesRepository,
    @inject(llmTokens.LLMRouter) private readonly llmRouter: LLMRouter,
    @inject(repositoryTokens.SourcesRepository)
    private readonly sourcesRepository: SourcesRepository,
    @inject(coreTokens.ProjectName) private readonly projectName: string,
    @inject(insightsTokens.SinglePassInsightStrategy)
    private readonly singlePassStrategy: IInsightGenerationStrategy,
    @inject(insightsTokens.MapReduceInsightStrategy)
    private readonly mapReduceStrategy: IInsightGenerationStrategy,
  ) {
    this.llmProviderDescription = this.llmRouter.getModelsUsedDescription();
    // Get the token limit from the manifest for chunking calculations
    const manifest = this.llmRouter.getLLMManifest();
    this.maxTokens = manifest.models.primaryCompletion.maxTotalTokens;
  }

  /**
   * Gathers metadata about all classes in an application and uses an LLM to identify
   * the entities and processes for the application, storing the results
   * in the database.
   */
  async generateAndStoreInsights(): Promise<void> {
    const sourceFileSummaries = await this.formatSourcesForLLMPrompt();

    if (sourceFileSummaries.length === 0) {
      throw new Error(
        "No existing code file summaries found in the metadata database. " +
          "Please ensure you have run the script to process the source data first.",
      );
    }

    await this.appSummariesRepository.createOrReplaceAppSummary({
      projectName: this.projectName,
      llmProvider: this.llmProviderDescription,
    });
    const categories: AppSummaryCategoryEnum[] = AppSummaryCategories.options;

    // Process all categories with LLM using shared concurrency limiter
    // The limiter is shared with map-reduce chunk processing to prevent nested parallelism
    // from exceeding rate limits
    const results = await Promise.allSettled(
      categories.map(async (category) =>
        llmConcurrencyLimiter(async () =>
          this.generateAndRecordDataForCategory(category, sourceFileSummaries),
        ),
      ),
    );
    results.forEach((result, index) => {
      if (result.status === "rejected") {
        logErr(`Failed to generate data for category: ${categories[index]}`, result.reason);
      }
    });
  }

  /**
   * Formats source file summaries for LLM prompt consumption.
   */
  private async formatSourcesForLLMPrompt(): Promise<string[]> {
    const srcFilesList: string[] = [];
    const records = await this.sourcesRepository.getProjectSourcesSummariesByFileType(
      this.projectName,
      [...fileProcessingConfig.CODE_FILE_EXTENSIONS],
    );

    for (const record of records) {
      if (!record.summary || Object.keys(record.summary).length === 0) {
        console.log(`No source code summary exists for file: ${record.filepath}. Skipping.`);
        continue;
      }

      const fileLabel = record.summary.namespace ?? record.filepath;
      const purpose = record.summary.purpose;
      const implementation = record.summary.implementation;
      srcFilesList.push(`* ${fileLabel}: ${purpose} ${implementation}`);
    }

    return srcFilesList;
  }

  /**
   * Generates insights for a specific category and saves them to the database.
   * Selects the appropriate strategy (single-pass vs map-reduce) based on codebase size.
   *
   * The strategy returns a strongly-typed result based on the category, which is
   * compatible with PartialAppSummaryRecord for storage in the repository.
   */
  private async generateAndRecordDataForCategory(
    category: AppSummaryCategoryEnum,
    sourceFileSummaries: readonly string[],
  ): Promise<void> {
    const categoryLabel = promptManager.appSummaries[category].label ?? category;

    try {
      // Determine which strategy to use based on codebase size
      const summaryChunks = chunkTextByTokenLimit(sourceFileSummaries, {
        maxTokens: this.maxTokens,
        chunkTokenLimitRatio: insightsTuningConfig.CHUNK_TOKEN_LIMIT_RATIO,
      });
      const strategy =
        summaryChunks.length === 1 ? this.singlePassStrategy : this.mapReduceStrategy;
      console.log(
        `Processing ${categoryLabel} (using ${summaryChunks.length === 1 ? "single-pass" : "map-reduce"} strategy)`,
      );
      // Generate insights using the selected strategy
      // The strategy returns a strongly-typed result (CategoryInsightResult<typeof category>)
      // which is assignable to PartialAppSummaryRecord for repository storage
      const categorySummaryData = await strategy.generateInsights(category, sourceFileSummaries);

      if (!categorySummaryData) {
        logWarn(
          `No summary data generated and inserted in the database for category: ${categoryLabel}`,
        );
        return;
      }
      // Store the result - the category-specific type is compatible with PartialAppSummaryRecord
      await this.appSummariesRepository.updateAppSummary(this.projectName, categorySummaryData);
      console.log(`Captured main ${categoryLabel} summary details into database`);
    } catch (error: unknown) {
      logErr(`Unable to generate ${categoryLabel} details into database`, error);
    }
  }
}
