import { injectable, inject } from "tsyringe";
import LLMRouter from "../../llm/core/llm-router";
import { fileProcessingConfig } from "../../config/file-processing.config";
import { logErrorMsgAndDetail, logWarningMsg } from "../../common/utils/logging";
import type { AppSummariesRepository } from "../../repositories/app-summary/app-summaries.repository.interface";
import type { SourcesRepository } from "../../repositories/source/sources.repository.interface";
import { TOKENS } from "../../di/tokens";
import { summaryCategoriesConfig, insightsTuningConfig } from "../../config/insights.config";
import { AppSummaryCategories } from "../../schemas/app-summaries.schema";
import type { ApplicationInsightsProcessor } from "./insights-generator.interface";
import { AppSummaryCategoryEnum } from "./insights.types";
import { LLMProviderManager } from "../../llm/core/llm-provider-manager";
import { llmProviderConfig } from "../../llm/llm.config";
import { IInsightGenerationStrategy } from "./strategies/insight-generation-strategy.interface";
import { SinglePassInsightStrategy } from "./strategies/single-pass-strategy";
import { MapReduceInsightStrategy } from "./strategies/map-reduce-strategy";

/**
 * Generates metadata in database collections to capture application information,
 * such as entities and processes, for a given project.
 * Uses strategy pattern to select between single-pass and map-reduce approaches.
 */
@injectable()
export default class InsightsFromDBGenerator implements ApplicationInsightsProcessor {
  private readonly llmProviderDescription: string;
  private readonly maxTokens: number;
  private readonly singlePassStrategy: IInsightGenerationStrategy;
  private readonly mapReduceStrategy: IInsightGenerationStrategy;

  /**
   * Creates a new InsightsFromDBGenerator with strategy-based processing.
   */
  constructor(
    @inject(TOKENS.AppSummariesRepository)
    private readonly appSummariesRepository: AppSummariesRepository,
    @inject(TOKENS.LLMRouter) private readonly llmRouter: LLMRouter,
    @inject(TOKENS.SourcesRepository) private readonly sourcesRepository: SourcesRepository,
    @inject(TOKENS.ProjectName) private readonly projectName: string,
    @inject(TOKENS.LLMProviderManager) private readonly llmProviderManager: LLMProviderManager,
  ) {
    this.llmProviderDescription = this.llmRouter.getModelsUsedDescription();
    // Get the token limit from the manifest for chunking calculations
    const manifest = this.llmProviderManager.getLLMManifest();
    this.maxTokens = manifest.models.primaryCompletion.maxTotalTokens;

    // Initialize strategies
    this.singlePassStrategy = new SinglePassInsightStrategy(this.llmRouter);
    this.mapReduceStrategy = new MapReduceInsightStrategy(this.llmRouter, this.llmProviderManager);
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
    const results = await Promise.allSettled(
      categories.map(async (category) =>
        this.generateAndRecordDataForCategory(category, sourceFileSummaries),
      ),
    );
    results.forEach((result, index) => {
      if (result.status === "rejected") {
        logErrorMsgAndDetail(
          `Failed to generate data for category: ${categories[index]}`,
          result.reason,
        );
      }
    });
  }

  /**
   * Formats source file summaries for LLM prompt consumption.
   */
  private async formatSourcesForLLMPrompt(): Promise<string[]> {
    const srcFilesList: string[] = [];
    const records = await this.sourcesRepository.getProjectSourcesSummaries(this.projectName, [
      ...fileProcessingConfig.CODE_FILE_EXTENSIONS,
    ]);

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
   */
  private async generateAndRecordDataForCategory(
    category: AppSummaryCategoryEnum,
    sourceFileSummaries: string[],
  ): Promise<void> {
    const categoryLabel = summaryCategoriesConfig[category].label;

    try {
      console.log(`Processing ${categoryLabel}`);

      // Determine which strategy to use based on codebase size
      const summaryChunks = this.chunkSummaries(sourceFileSummaries);
      const strategy =
        summaryChunks.length === 1 ? this.singlePassStrategy : this.mapReduceStrategy;

      // Log strategy selection
      if (summaryChunks.length === 1) {
        console.log(`  - Using single-pass strategy for ${categoryLabel}`);
      }

      // Generate insights using the selected strategy
      const categorySummaryData = await strategy.generateInsights(category, sourceFileSummaries);

      if (!categorySummaryData) {
        return;
      }

      // Store the result
      await this.appSummariesRepository.updateAppSummary(this.projectName, categorySummaryData);
      console.log(`Captured main ${categoryLabel} summary details into database`);
    } catch (error: unknown) {
      logErrorMsgAndDetail(`Unable to generate ${categoryLabel} details into database`, error);
    }
  }

  /**
   * Splits a list of source file summaries into chunks that fit within the LLM's token limit.
   * Uses a conservative 70% of the max token limit to leave room for prompt instructions and response.
   * This method is used to determine which strategy to use (single-pass vs map-reduce).
   */
  private chunkSummaries(summaries: string[]): string[][] {
    const chunks: string[][] = [];
    let currentChunk: string[] = [];
    let currentTokenCount = 0;
    const tokenLimitPerChunk = this.maxTokens * insightsTuningConfig.CHUNK_TOKEN_LIMIT_RATIO;

    for (const summary of summaries) {
      // Estimate token count using character-to-token ratio
      let summaryToProcess = summary;
      let summaryTokenCount = summary.length / llmProviderConfig.AVERAGE_CHARS_PER_TOKEN;

      // Handle summaries that are individually too large
      if (summaryTokenCount > tokenLimitPerChunk) {
        logWarningMsg(`A file summary is too large and will be truncated to fit token limit.`);
        const truncatedLength = Math.floor(
          tokenLimitPerChunk * llmProviderConfig.AVERAGE_CHARS_PER_TOKEN,
        );
        summaryToProcess = summary.substring(0, truncatedLength);
        summaryTokenCount = tokenLimitPerChunk;
      }

      // If adding this summary would exceed the limit, start a new chunk
      if (currentTokenCount + summaryTokenCount > tokenLimitPerChunk && currentChunk.length > 0) {
        chunks.push(currentChunk);
        currentChunk = [];
        currentTokenCount = 0;
      }

      currentChunk.push(summaryToProcess);
      currentTokenCount += summaryTokenCount;
    }

    // Add the last chunk if it has any content
    if (currentChunk.length > 0) {
      chunks.push(currentChunk);
    }

    // Edge case: if no chunks were created but we have summaries, force a single chunk
    if (chunks.length === 0 && summaries.length > 0) {
      chunks.push(summaries);
    }

    return chunks;
  }
}
