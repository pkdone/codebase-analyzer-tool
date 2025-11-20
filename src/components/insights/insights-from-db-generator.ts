import { injectable, inject } from "tsyringe";
import LLMRouter from "../../llm/core/llm-router";
import { fileProcessingConfig } from "../../config/file-processing.config";
import { logErrorMsgAndDetail } from "../../common/utils/logging";
import type { AppSummariesRepository } from "../../repositories/app-summaries/app-summaries.repository.interface";
import type { SourcesRepository } from "../../repositories/sources/sources.repository.interface";
import { repositoryTokens } from "../../di/tokens";
import { llmTokens } from "../../di/tokens";
import { coreTokens } from "../../di/tokens";
import { insightsTokens } from "../../di/tokens";
import { insightsTuningConfig } from "./insights.config";
import { appSummaryPromptMetadata as summaryCategoriesConfig } from "../../prompts/definitions/app-summaries";
import { AppSummaryCategories } from "../../schemas/app-summaries.schema";
import type { ApplicationInsightsProcessor } from "./insights.types";
import { AppSummaryCategoryEnum } from "./insights.types";
import { LLMProviderManager } from "../../llm/core/llm-provider-manager";
import { IInsightGenerationStrategy } from "./strategies/insight-generation-strategy.interface";
import { SinglePassInsightStrategy } from "./strategies/single-pass-strategy";
import { MapReduceInsightStrategy } from "./strategies/map-reduce-strategy";
import { chunkTextByTokenLimit } from "../../llm/utils/text-chunking";
import { BomAggregator } from "./data-aggregators/bom-aggregator";
import { CodeQualityAggregator } from "./data-aggregators/code-quality-aggregator";
import { JobAggregator } from "./data-aggregators/job-aggregator";
import { ModuleCouplingAggregator } from "./data-aggregators/module-coupling-aggregator";
import { UiAggregator } from "./data-aggregators/ui-aggregator";

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
    @inject(insightsTokens.BomAggregator) private readonly bomAggregator: BomAggregator,
    @inject(insightsTokens.CodeQualityAggregator)
    private readonly codeQualityAggregator: CodeQualityAggregator,
    @inject(insightsTokens.JobAggregator) private readonly jobAggregator: JobAggregator,
    @inject(insightsTokens.ModuleCouplingAggregator)
    private readonly moduleCouplingAggregator: ModuleCouplingAggregator,
    @inject(insightsTokens.UiAggregator) private readonly uiAggregator: UiAggregator,
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
    if (categories.includes("scheduledJobsSummary")) {
      await this.generateScheduledJobsSummary();
    }
    if (categories.includes("moduleCoupling")) {
      await this.generateModuleCoupling();
    }
    if (categories.includes("uiTechnologyAnalysis")) {
      await this.generateUiAnalysis();
    }

    // Process remaining categories with LLM
    const llmCategories = categories.filter(
      (c) =>
        c !== "billOfMaterials" &&
        c !== "codeQualitySummary" &&
        c !== "scheduledJobsSummary" &&
        c !== "moduleCoupling" &&
        c !== "uiTechnologyAnalysis",
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

  /**
   * Generates Scheduled Jobs Summary by aggregating jobs from script files
   */
  private async generateScheduledJobsSummary(): Promise<void> {
    try {
      console.log("Processing Scheduled Jobs Summary");
      const jobsData = await this.jobAggregator.aggregateScheduledJobs(this.projectName);

      await this.appSummariesRepository.updateAppSummary(this.projectName, {
        scheduledJobsSummary: jobsData,
      });

      console.log(
        `Captured Scheduled Jobs Summary: ${jobsData.totalJobs} jobs found, ` +
          `${jobsData.triggerTypes.length} trigger types`,
      );
    } catch (error: unknown) {
      logErrorMsgAndDetail("Unable to generate Scheduled Jobs Summary", error);
    }
  }

  /**
   * Generates Module Coupling Analysis by analyzing internal references between modules
   */
  private async generateModuleCoupling(): Promise<void> {
    try {
      console.log("Processing Module Coupling Analysis");
      const couplingData = await this.moduleCouplingAggregator.aggregateModuleCoupling(
        this.projectName,
      );

      await this.appSummariesRepository.updateAppSummary(this.projectName, {
        moduleCoupling: couplingData,
      });

      console.log(
        `Captured Module Coupling: ${couplingData.totalModules} modules, ` +
          `${couplingData.totalCouplings} coupling relationships`,
      );
    } catch (error: unknown) {
      logErrorMsgAndDetail("Unable to generate Module Coupling Analysis", error);
    }
  }

  /**
   * Generates UI Technology Analysis by aggregating JSP metrics and framework detection
   */
  private async generateUiAnalysis(): Promise<void> {
    try {
      console.log("Processing UI Technology Analysis");
      const uiData = await this.uiAggregator.aggregateUiAnalysis(this.projectName);

      await this.appSummariesRepository.updateAppSummary(this.projectName, {
        uiTechnologyAnalysis: uiData,
      });

      console.log(
        `Captured UI Technology Analysis: ${uiData.totalJspFiles} JSP files, ` +
          `${uiData.totalScriptlets} scriptlets, ${uiData.frameworks.length} frameworks detected`,
      );
    } catch (error: unknown) {
      logErrorMsgAndDetail("Unable to generate UI Technology Analysis", error);
    }
  }
}
