import { injectable, inject } from "tsyringe";
import { z } from "zod";
import LLMRouter from "../../../llm/llm-router";
import { LLMOutputFormat } from "../../../llm/types/llm.types";
import { insightsTuningConfig } from "../insights.config";
import { appSummaryPromptMetadata as summaryCategoriesConfig } from "../../../prompts/definitions/app-summaries";
import { logSingleLineWarning } from "../../../common/utils/logging";
import { Prompt } from "../../../prompts/prompt";
import { llmTokens } from "../../../di/tokens";
import { LLMProviderManager } from "../../../llm/llm-provider-manager";
import { IInsightGenerationStrategy } from "./insight-generation-strategy.interface";
import { AppSummaryCategoryEnum, PartialAppSummaryRecord } from "../insights.types";
import { createReduceInsightsPromptDefinition } from "../../../prompts/definitions/utility-prompts";
import { executeInsightCompletion } from "./insight-completion.service";
import { chunkTextByTokenLimit } from "../../../llm/utils/text-chunking";

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
    const categoryLabel = summaryCategoriesConfig[category].label ?? category;

    try {
      console.log(`  - Using map-reduce strategy for ${categoryLabel}`);

      // 1. Chunk the summaries into token-appropriate sizes
      const summaryChunks = chunkTextByTokenLimit(sourceFileSummaries, {
        maxTokens: this.maxTokens,
        chunkTokenLimitRatio: insightsTuningConfig.CHUNK_TOKEN_LIMIT_RATIO,
      });

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
        logSingleLineWarning(
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
        logSingleLineWarning(`Failed to generate final consolidated summary for ${categoryLabel}.`);
        return null;
      }

      return finalSummaryData;
    } catch (error: unknown) {
      logSingleLineWarning(
        `${error instanceof Error ? error.message : "Unknown error"} for ${categoryLabel}`,
      );
      return null;
    }
  }

  /**
   * MAP step: Generates partial insights for a single chunk of summaries.
   * This method is called once per chunk in the map-reduce process.
   */
  private async generatePartialInsightsForCategory(
    category: AppSummaryCategoryEnum,
    summaryChunk: string[],
  ): Promise<PartialAppSummaryRecord | null> {
    const partialAnalysisNote =
      "Note, this is a partial analysis of a larger codebase; focus on extracting insights from this subset of file summaries only. ";

    return executeInsightCompletion(this.llmRouter, category, summaryChunk, {
      partialAnalysisNote,
      taskCategory: `${category}-chunk`,
    });
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
    // Type assertion needed because responseSchema is typed as ZodType, but we know app summaries are ZodObject
    const schemaShape = (config.responseSchema as z.ZodObject<z.ZodRawShape>).shape;
    const categoryKey = Object.keys(schemaShape)[0];

    // Flatten the arrays from all partial results into a single combined list
    const combinedData = partialResults.flatMap((result) => {
      const categoryData = result[category as Exclude<AppSummaryCategoryEnum, "billOfMaterials">];
      // Type guard to ensure we're working with arrays
      if (Array.isArray(categoryData)) {
        return categoryData;
      }
      return [];
    });

    const content = JSON.stringify({ [categoryKey]: combinedData }, null, 2);
    const reducePromptDefinition = createReduceInsightsPromptDefinition(
      config.label ?? category,
      config.responseSchema,
    );
    const prompt = new Prompt(reducePromptDefinition);
    const renderedPrompt = prompt.render({ categoryKey, content });

    try {
      return await this.llmRouter.executeCompletion<PartialAppSummaryRecord>(
        `${category}-reduce`,
        renderedPrompt,
        {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: config.responseSchema,
          hasComplexSchema: !CATEGORY_SCHEMA_IS_VERTEXAI_COMPATIBLE,
        },
      );
    } catch (error: unknown) {
      logSingleLineWarning(
        `Failed to consolidate partial insights for ${config.label ?? category}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      return null;
    }
  }
}
