import { injectable, inject, injectAll } from "tsyringe";
import LLMRouter from "../../llm/llm-router";
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
import { IInsightGenerationStrategy } from "./strategies/insight-generation-strategy.interface";
import { SinglePassInsightStrategy } from "./strategies/single-pass-strategy";
import { MapReduceInsightStrategy } from "./strategies/map-reduce-strategy";
import { chunkTextByTokenLimit } from "../../llm/utils/text-chunking";
import type { IAggregator } from "./data-aggregators/aggregator.interface";
import type { BomAggregationResult } from "./data-aggregators/bom-aggregator";
import type { CodeQualityAggregationResult } from "./data-aggregators/code-quality-aggregator";
import type { ScheduledJobsAggregationResult } from "./data-aggregators/job-aggregator";
import type { ModuleCouplingAggregationResult } from "./data-aggregators/module-coupling-aggregator";
import type { UiAnalysisSummary } from "./data-aggregators/ui-aggregator";

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
    @injectAll(insightsTokens.Aggregator) private readonly aggregators: IAggregator[],
  ) {
    this.llmProviderDescription = this.llmRouter.getModelsUsedDescription();
    // Get the token limit from the manifest for chunking calculations
    const manifest = this.llmRouter.getLLMManifest();
    this.maxTokens = manifest.models.primaryCompletion.maxTotalTokens;

    // Initialize strategies
    this.singlePassStrategy = new SinglePassInsightStrategy(this.llmRouter);
    this.mapReduceStrategy = new MapReduceInsightStrategy(this.llmRouter);
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
  private async generateAndStoreAggregatedData<T>(aggregator: IAggregator<T>): Promise<void> {
    const category = aggregator.getCategory();
    const categoryLabel = summaryCategoriesConfig[category].label ?? category;

    try {
      console.log(`Processing ${categoryLabel}`);
      const aggregatedData = await aggregator.aggregate(this.projectName);

      // Map aggregator results to the appropriate update method
      // Special handling for billOfMaterials - it stores dependencies array, not the full object
      if (category === "billOfMaterials") {
        const bomData = aggregatedData as BomAggregationResult;
        await this.appSummariesRepository.updateAppSummary(this.projectName, {
          billOfMaterials: bomData.dependencies,
        });
      } else if (category === "codeQualitySummary") {
        await this.appSummariesRepository.updateAppSummary(this.projectName, {
          codeQualitySummary: aggregatedData as CodeQualityAggregationResult,
        });
      } else if (category === "scheduledJobsSummary") {
        await this.appSummariesRepository.updateAppSummary(this.projectName, {
          scheduledJobsSummary: aggregatedData as ScheduledJobsAggregationResult,
        });
      } else if (category === "moduleCoupling") {
        await this.appSummariesRepository.updateAppSummary(this.projectName, {
          moduleCoupling: aggregatedData as ModuleCouplingAggregationResult,
        });
      } else if (category === "uiTechnologyAnalysis") {
        await this.appSummariesRepository.updateAppSummary(this.projectName, {
          uiTechnologyAnalysis: aggregatedData as UiAnalysisSummary,
        });
      } else {
        // Fallback for any other categories (shouldn't happen with current aggregators)
        await this.appSummariesRepository.updateAppSummary(this.projectName, {
          [category]: aggregatedData,
        } as PartialAppSummaryRecord);
      }

      // Log success with category-specific details
      if (category === "billOfMaterials") {
        const bomData = aggregatedData as BomAggregationResult;
        console.log(
          `Captured Bill of Materials: ${bomData.totalDependencies} dependencies, ${bomData.conflictCount} conflicts`,
        );
      } else if (category === "codeQualitySummary") {
        const qualityData = aggregatedData as CodeQualityAggregationResult;
        const totalMethods = qualityData.overallStatistics.totalMethods;
        const codeSmellsCount = qualityData.commonCodeSmells.length;
        console.log(
          `Captured Code Quality Summary: ${totalMethods} methods analyzed, ` +
            `${codeSmellsCount} smell types detected`,
        );
      } else if (category === "scheduledJobsSummary") {
        const jobsData = aggregatedData as ScheduledJobsAggregationResult;
        console.log(
          `Captured Scheduled Jobs Summary: ${jobsData.totalJobs} jobs found, ` +
            `${jobsData.triggerTypes.length} trigger types`,
        );
      } else if (category === "moduleCoupling") {
        const couplingData = aggregatedData as ModuleCouplingAggregationResult;
        console.log(
          `Captured Module Coupling: ${couplingData.totalModules} modules, ` +
            `${couplingData.totalCouplings} coupling relationships`,
        );
      } else if (category === "uiTechnologyAnalysis") {
        const uiData = aggregatedData as UiAnalysisSummary;
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
