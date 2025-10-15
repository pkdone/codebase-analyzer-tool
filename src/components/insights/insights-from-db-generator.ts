import { injectable, inject } from "tsyringe";
import LLMRouter from "../../llm/core/llm-router";
import { fileProcessingConfig } from "../../config/file-processing.config";
import { logErrorMsgAndDetail } from "../../common/utils/logging";
import type { AppSummaryRepository } from "../../repositories/app-summary/app-summaries.repository.interface";
import type { SourcesRepository } from "../../repositories/source/sources.repository.interface";
import { TOKENS } from "../../tokens";
import { summaryCategoriesConfig, insightsTuningConfig } from "./insights-generation.config";
import { AppSummaryCategories } from "../../schemas/app-summaries.schema";
import type { ApplicationInsightsProcessor } from "./insights-generator.interface";
import { AppSummaryCategoryEnum } from "./insights.types";
import { LLMProviderManager } from "../../llm/core/llm-provider-manager";
import { IInsightGenerationStrategy } from "./strategies/insight-generation-strategy.interface";
import { SinglePassInsightStrategy } from "./strategies/single-pass-strategy";
import { MapReduceInsightStrategy } from "./strategies/map-reduce-strategy";
import { chunkTextByTokenLimit } from "../../llm/utils/text-chunking";
import { BomAggregator } from "./bom-aggregator";
import { CodeQualityAggregator } from "./code-quality-aggregator";

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
    @inject(TOKENS.AppSummaryRepository)
    private readonly appSummariesRepository: AppSummaryRepository,
    @inject(TOKENS.LLMRouter) private readonly llmRouter: LLMRouter,
    @inject(TOKENS.SourcesRepository) private readonly sourcesRepository: SourcesRepository,
    @inject(TOKENS.ProjectName) private readonly projectName: string,
    @inject(TOKENS.LLMProviderManager) private readonly llmProviderManager: LLMProviderManager,
    @inject(TOKENS.BomAggregator) private readonly bomAggregator: BomAggregator,
    @inject(TOKENS.CodeQualityAggregator)
    private readonly codeQualityAggregator: CodeQualityAggregator,
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

    // Special handling for aggregator-based categories
    if (categories.includes("billOfMaterials")) {
      await this.generateBillOfMaterials();
    }
    if (categories.includes("codeQualitySummary")) {
      await this.generateCodeQualitySummary();
    }

    // Process remaining categories with LLM
    const llmCategories = categories.filter(
      (c) => c !== "billOfMaterials" && c !== "codeQualitySummary",
    );
    const results = await Promise.allSettled(
      llmCategories.map(async (category) =>
        this.generateAndRecordDataForCategory(category, sourceFileSummaries),
      ),
    );
    results.forEach((result, index) => {
      if (result.status === "rejected") {
        logErrorMsgAndDetail(
          `Failed to generate data for category: ${llmCategories[index]}`,
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
      const summaryChunks = chunkTextByTokenLimit(sourceFileSummaries, {
        maxTokens: this.maxTokens,
        chunkTokenLimitRatio: insightsTuningConfig.CHUNK_TOKEN_LIMIT_RATIO,
      });
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
   * Generates Bill of Materials by aggregating dependencies from build files
   */
  private async generateBillOfMaterials(): Promise<void> {
    try {
      console.log("Processing Bill of Materials");
      const bomData = await this.bomAggregator.aggregateBillOfMaterials(this.projectName);

      await this.appSummariesRepository.updateAppSummary(this.projectName, {
        billOfMaterials: bomData.dependencies,
      });

      console.log(
        `Captured Bill of Materials: ${bomData.totalDependencies} dependencies, ${bomData.conflictCount} conflicts`,
      );
    } catch (error: unknown) {
      logErrorMsgAndDetail("Unable to generate Bill of Materials", error);
    }
  }

  /**
   * Generates Code Quality Summary by aggregating metrics from code files
   */
  private async generateCodeQualitySummary(): Promise<void> {
    try {
      console.log("Processing Code Quality Summary");
      const qualityData = await this.codeQualityAggregator.aggregateCodeQualityMetrics(
        this.projectName,
      );

      await this.appSummariesRepository.updateAppSummary(this.projectName, {
        codeQualitySummary: qualityData,
      });

      console.log(
        `Captured Code Quality Summary: ${qualityData.overallStatistics.totalMethods} methods analyzed, ` +
          `${qualityData.commonCodeSmells.length} smell types detected`,
      );
    } catch (error: unknown) {
      logErrorMsgAndDetail("Unable to generate Code Quality Summary", error);
    }
  }
}
