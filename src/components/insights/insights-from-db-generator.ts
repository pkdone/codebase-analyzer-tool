import { injectable, inject } from "tsyringe";
import LLMRouter from "../../llm/core/llm-router";
import { LLMOutputFormat } from "../../llm/types/llm.types";
import { fileProcessingConfig } from "../../config/file-processing.config";
import { logErrorMsgAndDetail, logWarningMsg } from "../../common/utils/logging";
import { joinArrayWithSeparators } from "../../common/utils/text-formatting";
import type { AppSummariesRepository } from "../../repositories/app-summary/app-summaries.repository.interface";
import type { SourcesRepository } from "../../repositories/source/sources.repository.interface";
import { TOKENS } from "../../di/tokens";
import { summaryCategoriesConfig } from "../../config/insights.config";
import { AppSummaryCategories } from "../../schemas/app-summaries.schema";
import { createPromptFromConfig } from "../../llm/utils/prompt-templator";
import type { ApplicationInsightsProcessor } from "./insights-generator.interface";
import { PartialAppSummaryRecord, AppSummaryCategoryEnum } from "./insights.types";
import { LLMProviderManager } from "../../llm/core/llm-provider-manager";
import { llmProviderConfig } from "../../llm/llm.config";

// Mark schema as being easy for LLMs to digest
const SCHEMA_HAS_VERTEXAI_INCOMPATIBILITY = false;

/**
 * Use 70% of max tokens to leave generous room for:
 * - Prompt template and instructions (~10-15% of tokens)
 * - LLM response output (~15-20% of tokens)
 */
const CHUNK_TOKEN_LIMIT_RATIO = 0.7;

// Prompt template for partial insights (MAP phase)
const PARTIAL_INSIGHTS_TEMPLATE =
  "Act as a senior developer analyzing a subset of code. Based on the list of file summaries below in 'SOURCES', return a JSON response that contains {{specificInstructions}}. This is a partial analysis of a larger codebase; focus on extracting insights from this subset only. The JSON response must follow this JSON schema:\n```json\n{{jsonSchema}}\n```\n\n{{forceJSON}}\n\nSOURCES:\n{{codeContent}}";

// Prompt template for consolidating partial insights (REDUCE phase)
const REDUCE_INSIGHTS_TEMPLATE =
  "Act as a senior developer. You have been provided with several JSON objects below in 'PARTIAL_DATA', each containing a list of '{{categoryKey}}' generated from different parts of a codebase. Your task is to consolidate these lists into a single, de-duplicated, and coherent final JSON object. Merge similar items, remove duplicates based on semantic similarity (not just exact name matches), and ensure the final list is comprehensive and well-organized. The final JSON response must follow this JSON schema:\n```json\n{{jsonSchema}}\n```\n\n{{forceJSON}}\n\nPARTIAL_DATA:\n{{codeContent}}";

/**
 * Generates metadata in database collections to capture application information,
 * such as entities and processes, for a given project.
 */
@injectable()
export default class InsightsFromDBGenerator implements ApplicationInsightsProcessor {
  // Private fields
  private readonly APP_CATEGORY_SUMMARIZER_TEMPLATE =
    "Act as a senior developer analyzing the code in a legacy application. Take the list of paths and descriptions of its {{contentDesc}} shown below in the section marked 'SOURCES', and based on their content, return a JSON response that contains {{specificInstructions}}.\n\nThe JSON response must follow this JSON schema:\n```json\n{{jsonSchema}}\n```\n\n{{forceJSON}}\n\nSOURCES:\n{{codeContent}}";
  private readonly llmProviderDescription: string;
  private readonly maxTokens: number;

  /**
   * Creates a new InsightsFromDBGenerator with Map-Reduce capability for large codebases.
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
   * Calls an LLM to summarize a specific set of data (i.e., one category), and then saves the
   * dataset under a named field of the main application summary record.
   * Uses Map-Reduce strategy for large codebases that exceed token limits.
   */
  private async generateAndRecordDataForCategory(
    category: AppSummaryCategoryEnum,
    sourceFileSummaries: string[],
  ): Promise<void> {
    const categoryLabel = summaryCategoriesConfig[category].label;

    try {
      console.log(`Processing ${categoryLabel}`);

      // 1. Chunk the summaries into token-appropriate sizes
      const summaryChunks = this.chunkSummaries(sourceFileSummaries);

      // If only one chunk, use the original single-pass approach
      if (summaryChunks.length === 1) {
        console.log(`  - Single chunk processing for ${categoryLabel}`);
        const categorySummaryData = await this.getCategorySummaryAsValidatedJSON(
          category,
          sourceFileSummaries,
        );
        if (!categorySummaryData) return;
        await this.appSummariesRepository.updateAppSummary(this.projectName, categorySummaryData);
        console.log(`Captured main ${categoryLabel} summary details into database`);
        return;
      }

      console.log(
        `  - Split summaries into ${summaryChunks.length} chunks for map-reduce processing for ${categoryLabel}`,
      );

      // 2. MAP: Generate partial insights for each chunk
      const partialResults = (
        await Promise.all(
          summaryChunks.map(async (chunk, index) => {
            console.log(
              `  - [MAP ${index + 1}/${summaryChunks.length}] Processing chunk for ${categoryLabel}...`,
            );
            return this.generatePartialInsightsForCategory(category, chunk);
          }),
        )
      ).filter((result): result is PartialAppSummaryRecord => result !== null);

      if (partialResults.length === 0) {
        logWarningMsg(
          `No partial insights were generated for ${categoryLabel}. Skipping final consolidation.`,
        );
        return;
      }

      console.log(
        `  - [REDUCE] Consolidating ${partialResults.length} partial results for ${categoryLabel}...`,
      );

      // 3. REDUCE: Consolidate partial insights into a final summary
      const finalSummaryData = await this.reducePartialInsights(category, partialResults);

      if (!finalSummaryData) {
        logWarningMsg(`Failed to generate final consolidated summary for ${categoryLabel}.`);
        return;
      }

      // 4. Store the final result
      await this.appSummariesRepository.updateAppSummary(this.projectName, finalSummaryData);
      console.log(`Captured main ${categoryLabel} summary details into database`);
    } catch (error: unknown) {
      logErrorMsgAndDetail(`Unable to generate ${categoryLabel} details into database`, error);
    }
  }

  /**
   * Calls an LLM to summarize a specific set of data (i.e., one category), and then saves the
   * dataset under a named field of the main application summary record.
   */
  private async getCategorySummaryAsValidatedJSON(
    category: AppSummaryCategoryEnum,
    sourceFileSummaries: string[],
  ): Promise<PartialAppSummaryRecord | null> {
    const categoryLabel = summaryCategoriesConfig[category].label;

    try {
      const schema = summaryCategoriesConfig[category].schema;
      const content = joinArrayWithSeparators(sourceFileSummaries);
      const prompt = this.createInsightsForCategoryPrompt(category, content);
      const llmResponse = await this.llmRouter.executeCompletion<PartialAppSummaryRecord>(
        category,
        prompt,
        {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: schema,
          hasComplexSchema: SCHEMA_HAS_VERTEXAI_INCOMPATIBILITY,
        },
      );
      return llmResponse;
    } catch (error: unknown) {
      logWarningMsg(
        `${error instanceof Error ? error.message : "Unknown error"} for ${categoryLabel}`,
      );
      return null;
    }
  }

  /**
   * Create a prompt for the LLM to generate insights for a specific categories
   */
  private createInsightsForCategoryPrompt(
    type: AppSummaryCategoryEnum,
    codeContent: string,
  ): string {
    const config = summaryCategoriesConfig[type];
    return createPromptFromConfig(
      this.APP_CATEGORY_SUMMARIZER_TEMPLATE,
      "source files",
      config.description,
      config.schema,
      codeContent,
    );
  }

  /**
   * Splits a list of source file summaries into chunks that fit within the LLM's token limit.
   * Uses a conservative 70% of the max token limit to leave room for prompt instructions and response.
   */
  private chunkSummaries(summaries: string[]): string[][] {
    const chunks: string[][] = [];
    let currentChunk: string[] = [];
    let currentTokenCount = 0;
    const tokenLimitPerChunk = this.maxTokens * CHUNK_TOKEN_LIMIT_RATIO;

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

  /**
   * MAP step: Generates partial insights for a single chunk of summaries.
   * This method is called once per chunk in the map-reduce process.
   */
  private async generatePartialInsightsForCategory(
    category: AppSummaryCategoryEnum,
    summaryChunk: string[],
  ): Promise<PartialAppSummaryRecord | null> {
    const config = summaryCategoriesConfig[category];
    const content = joinArrayWithSeparators(summaryChunk);
    const prompt = createPromptFromConfig(
      PARTIAL_INSIGHTS_TEMPLATE,
      "source files",
      config.description,
      config.schema,
      content,
    );

    try {
      return await this.llmRouter.executeCompletion<PartialAppSummaryRecord>(
        `${category}-chunk`,
        prompt,
        {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: config.schema,
          hasComplexSchema: SCHEMA_HAS_VERTEXAI_INCOMPATIBILITY,
        },
      );
    } catch (error: unknown) {
      logWarningMsg(
        `Failed to generate partial insights for ${config.label} chunk: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      return null;
    }
  }

  /**
   * REDUCE step: Consolidates multiple partial insights into a single final result.
   * This method combines and de-duplicates results from all chunks.
   */
  private async reducePartialInsights(
    category: AppSummaryCategoryEnum,
    partialResults: PartialAppSummaryRecord[],
  ): Promise<PartialAppSummaryRecord | null> {
    const config = summaryCategoriesConfig[category];

    // Get the key name for this category (e.g., "entities", "boundedContexts")
    const categoryKey = Object.keys(config.schema.shape)[0];

    // Flatten the arrays from all partial results into a single combined list
    const combinedData = partialResults.flatMap((result) => {
      const categoryData = result[category];
      // Type guard to ensure we're working with arrays
      if (Array.isArray(categoryData)) {
        return categoryData;
      }
      return [];
    });

    // Format as JSON for the reduce prompt
    const content = JSON.stringify({ [categoryKey]: combinedData }, null, 2);

    const prompt = createPromptFromConfig(
      REDUCE_INSIGHTS_TEMPLATE.replace("{{categoryKey}}", categoryKey),
      "partial data",
      `a consolidated list of '${config.label}'`,
      config.schema,
      content,
    );

    try {
      return await this.llmRouter.executeCompletion<PartialAppSummaryRecord>(
        `${category}-reduce`,
        prompt,
        {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: config.schema,
          hasComplexSchema: SCHEMA_HAS_VERTEXAI_INCOMPATIBILITY,
        },
      );
    } catch (error: unknown) {
      logWarningMsg(
        `Failed to consolidate partial insights for ${config.label}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      return null;
    }
  }
}
