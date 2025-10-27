import { injectable, inject } from "tsyringe";
import LLMRouter from "../../../llm/core/llm-router";
import { LLMOutputFormat } from "../../../llm/types/llm.types";
import { insightsTuningConfig } from "../insights.config";
import {
  appSummaryPromptMetadata as summaryCategoriesConfig,
  PARTIAL_INSIGHTS_TEMPLATE,
  REDUCE_INSIGHTS_TEMPLATE,
} from "../../../prompt-templates/app-summaries.prompts";
import { logWarningMsg } from "../../../common/utils/logging";
import { joinArrayWithSeparators } from "../../../common/utils/text-utils";
import { createPromptFromConfig } from "../../../llm/utils/prompt-templator";
import { llmTokens } from "../../../llm/core/llm.tokens";
import { LLMProviderManager } from "../../../llm/core/llm-provider-manager";
import { llmProviderConfig } from "../../../llm/llm.config";
import { IInsightGenerationStrategy } from "./insight-generation-strategy.interface";
import { AppSummaryCategoryEnum, PartialAppSummaryRecord } from "../insights.types";

// Individual category schemas are simple and compatible with all LLM providers including VertexAI
const CATEGORY_SCHEMA_IS_VERTEXAI_COMPATIBLE = true;

/**
 * Map-reduce insight generation strategy for large codebases.
 * Splits summaries into chunks, processes each chunk (MAP), then consolidates results (REDUCE).
 */
@injectable()
export class MapReduceInsightStrategy implements IInsightGenerationStrategy {
  private readonly maxTokens: number;

  constructor(
    @inject(llmTokens.LLMRouter) private readonly llmRouter: LLMRouter,
    @inject(llmTokens.LLMProviderManager) private readonly llmProviderManager: LLMProviderManager,
  ) {
    // Get the token limit from the manifest for chunking calculations
    const manifest = this.llmProviderManager.getLLMManifest();
    this.maxTokens = manifest.models.primaryCompletion.maxTotalTokens;
  }

  /**
   * Generate insights using map-reduce approach:
   * 1. Split summaries into chunks
   * 2. MAP: Generate partial insights for each chunk
   * 3. REDUCE: Consolidate partial insights into final result
   */
  async generateInsights(
    category: AppSummaryCategoryEnum,
    sourceFileSummaries: string[],
  ): Promise<PartialAppSummaryRecord | null> {
    const categoryLabel = summaryCategoriesConfig[category].label;

    try {
      console.log(`  - Using map-reduce strategy for ${categoryLabel}`);

      // 1. Chunk the summaries into token-appropriate sizes
      const summaryChunks = this.chunkSummaries(sourceFileSummaries);

      console.log(
        `  - Split summaries into ${summaryChunks.length} chunks for map-reduce processing`,
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
        return null;
      }

      console.log(
        `  - [REDUCE] Consolidating ${partialResults.length} partial results for ${categoryLabel}...`,
      );

      // 3. REDUCE: Consolidate partial insights into a final summary
      const finalSummaryData = await this.reducePartialInsights(category, partialResults);

      if (!finalSummaryData) {
        logWarningMsg(`Failed to generate final consolidated summary for ${categoryLabel}.`);
        return null;
      }

      return finalSummaryData;
    } catch (error: unknown) {
      logWarningMsg(
        `${error instanceof Error ? error.message : "Unknown error"} for ${categoryLabel}`,
      );
      return null;
    }
  }

  /**
   * Splits a list of source file summaries into chunks that fit within the LLM's token limit.
   * Uses a conservative 70% of the max token limit to leave room for prompt instructions and response.
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

  /**
   * MAP step: Generates partial insights for a single chunk of summaries.
   * This method is called once per chunk in the map-reduce process.
   */
  private async generatePartialInsightsForCategory(
    category: AppSummaryCategoryEnum,
    summaryChunk: string[],
  ): Promise<PartialAppSummaryRecord | null> {
    const config = summaryCategoriesConfig[category];
    const codeContent = joinArrayWithSeparators(summaryChunk);
    const prompt = createPromptFromConfig(
      PARTIAL_INSIGHTS_TEMPLATE,
      "source files",
      config.instructions,
      config.responseSchema,
      codeContent,
    );

    try {
      return await this.llmRouter.executeCompletion<PartialAppSummaryRecord>(
        `${category}-chunk`,
        prompt,
        {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: config.responseSchema,
          hasComplexSchema: !CATEGORY_SCHEMA_IS_VERTEXAI_COMPATIBLE,
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
    const categoryKey = Object.keys(config.responseSchema.shape)[0];

    // Flatten the arrays from all partial results into a single combined list
    const combinedData = partialResults.flatMap((result) => {
      const categoryData = result[category as Exclude<AppSummaryCategoryEnum, "billOfMaterials">];
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
      [`a consolidated list of '${config.label}'`], // Convert string to array
      config.responseSchema,
      content,
    );

    try {
      return await this.llmRouter.executeCompletion<PartialAppSummaryRecord>(
        `${category}-reduce`,
        prompt,
        {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: config.responseSchema,
          hasComplexSchema: !CATEGORY_SCHEMA_IS_VERTEXAI_COMPATIBLE,
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
