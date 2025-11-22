import { injectable, inject, injectAll } from "tsyringe";
import LLMRouter from "../../llm/core/llm-router";
import { fileProcessingConfig } from "../../config/file-processing.config";
import { logSingleLineWarning } from "../../common/utils/logging";
import type { AppSummariesRepository } from "../../repositories/app-summaries/app-summaries.repository.interface";
import type { SourcesRepository } from "../../repositories/sources/sources.repository.interface";
import { repositoryTokens } from "../../di/tokens";
import { llmTokens } from "../../di/tokens";
import { coreTokens } from "../../di/tokens";
import { insightsTokens } from "../../di/tokens";
import { insightsTuningConfig } from "./insights.config";
import { appSummaryPromptMetadata as summaryCategoriesConfig } from "../../prompts/definitions/app-summaries";
import { AppSummaryCategories } from "../../schemas/app-summaries.schema";
import type { ApplicationInsightsProcessor, PartialAppSummaryRecord } from "./insights.types";
import { AppSummaryCategoryEnum } from "./insights.types";
import { LLMProviderManager } from "../../llm/core/llm-provider-manager";
import { IInsightGenerationStrategy } from "./strategies/insight-generation-strategy.interface";
import { SinglePassInsightStrategy } from "./strategies/single-pass-strategy";
import { MapReduceInsightStrategy } from "./strategies/map-reduce-strategy";
import { chunkTextByTokenLimit } from "../../llm/utils/text-chunking";
import type { IAggregator } from "./data-aggregators/aggregator.interface";

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
    @inject(repositoryTokens.AppSummariesRepository)
    private readonly appSummariesRepository: AppSummariesRepository,
    @inject(llmTokens.LLMRouter) private readonly llmRouter: LLMRouter,
    @inject(repositoryTokens.SourcesRepository)
    private readonly sourcesRepository: SourcesRepository,
    @inject(coreTokens.ProjectName) private readonly projectName: string,
    @inject(llmTokens.LLMProviderManager) private readonly llmProviderManager: LLMProviderManager,
    @injectAll(insightsTokens.Aggregator) private readonly aggregators: IAggregator[],
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

    // Process aggregator-based categories using the pluggable pattern
    const aggregatorCategories = new Set(this.aggregators.map((a) => a.getCategory()));
    const aggregatorResults = await Promise.allSettled(
      this.aggregators.map(async (aggregator) => {
        if (categories.includes(aggregator.getCategory())) {
          await this.generateAndStoreAggregatedData(aggregator);
        }
      }),
    );

    // Log any failures
    aggregatorResults.forEach((result, index) => {
      if (result.status === "rejected") {
        logSingleLineWarning(
          `Failed to generate data for aggregator category: ${this.aggregators[index].getCategory()}`,
          result.reason,
        );
      }
    });

    // Process remaining categories with LLM
    const llmCategories = categories.filter((c) => !aggregatorCategories.has(c));
    const results = await Promise.allSettled(
      llmCategories.map(async (category) =>
        this.generateAndRecordDataForCategory(category, sourceFileSummaries),
      ),
    );
    results.forEach((result, index) => {
      if (result.status === "rejected") {
        logSingleLineWarning(
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
    const categoryLabel = summaryCategoriesConfig[category].label ?? category;

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
      logSingleLineWarning(`Unable to generate ${categoryLabel} details into database`, error);
    }
  }

  /**
   * Generates and stores aggregated data for a specific aggregator
   */
  private async generateAndStoreAggregatedData(aggregator: IAggregator): Promise<void> {
    const category = aggregator.getCategory();
    const categoryLabel = summaryCategoriesConfig[category].label ?? category;

    try {
      console.log(`Processing ${categoryLabel}`);
      const aggregatedData = await aggregator.aggregate(this.projectName);

      // Map aggregator results to the appropriate update method
      // Special handling for billOfMaterials - it stores dependencies array, not the full object
      if (category === "billOfMaterials") {
        const bomData = aggregatedData as {
          dependencies: unknown[];
          totalDependencies: number;
          conflictCount: number;
        };
        await this.appSummariesRepository.updateAppSummary(this.projectName, {
          billOfMaterials: bomData.dependencies,
        } as unknown as PartialAppSummaryRecord);
      } else {
        await this.appSummariesRepository.updateAppSummary(this.projectName, {
          [category]: aggregatedData,
        } as unknown as PartialAppSummaryRecord);
      }

      // Log success with category-specific details
      if (category === "billOfMaterials") {
        const bomData = aggregatedData as {
          totalDependencies: number;
          conflictCount: number;
        };
        console.log(
          `Captured Bill of Materials: ${bomData.totalDependencies} dependencies, ${bomData.conflictCount} conflicts`,
        );
      } else if (category === "codeQualitySummary") {
        const qualityData = aggregatedData as {
          overallStatistics: { totalMethods: number };
          commonCodeSmells: unknown[];
        };
        console.log(
          `Captured Code Quality Summary: ${qualityData.overallStatistics.totalMethods} methods analyzed, ` +
            `${qualityData.commonCodeSmells.length} smell types detected`,
        );
      } else if (category === "scheduledJobsSummary") {
        const jobsData = aggregatedData as {
          totalJobs: number;
          triggerTypes: string[];
        };
        console.log(
          `Captured Scheduled Jobs Summary: ${jobsData.totalJobs} jobs found, ` +
            `${jobsData.triggerTypes.length} trigger types`,
        );
      } else if (category === "moduleCoupling") {
        const couplingData = aggregatedData as {
          totalModules: number;
          totalCouplings: number;
        };
        console.log(
          `Captured Module Coupling: ${couplingData.totalModules} modules, ` +
            `${couplingData.totalCouplings} coupling relationships`,
        );
      } else if (category === "uiTechnologyAnalysis") {
        const uiData = aggregatedData as {
          totalJspFiles: number;
          totalScriptlets: number;
          frameworks: unknown[];
        };
        console.log(
          `Captured UI Technology Analysis: ${uiData.totalJspFiles} JSP files, ` +
            `${uiData.totalScriptlets} scriptlets, ${uiData.frameworks.length} frameworks detected`,
        );
      } else {
        console.log(`Captured ${categoryLabel} summary details into database`);
      }
    } catch (error: unknown) {
      logSingleLineWarning(`Unable to generate ${categoryLabel} details into database`, error);
    }
  }
}
