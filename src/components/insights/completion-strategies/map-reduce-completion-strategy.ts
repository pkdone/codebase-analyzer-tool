import { injectable, inject } from "tsyringe";
import { z } from "zod";
import LLMRouter from "../../../llm/llm-router";
import { LLMOutputFormat } from "../../../llm/types/llm.types";
import { insightsTuningConfig } from "../insights.config";
import { appSummaryPromptMetadata as summaryCategoriesConfig } from "../../../prompts/definitions/app-summaries";
import { logOneLineWarning } from "../../../common/utils/logging";
import { renderPrompt } from "../../../prompts/prompt-renderer";
import { llmTokens } from "../../../di/tokens";
import { ICompletionStrategy } from "./completion-strategy.interface";
import {
  AppSummaryCategoryEnum,
  PartialAppSummaryRecord,
  CategoryInsightResult,
  appSummaryCategorySchemas,
} from "../insights.types";
import { createReduceInsightsPromptDefinition } from "../../../prompts/definitions/utility-prompts";
import { executeInsightCompletion } from "./completion-executor";
import { chunkTextByTokenLimit } from "../../../llm/utils/text-chunking";

// Individual category schemas are simple and compatible with all LLM providers including VertexAI
const CATEGORY_SCHEMA_IS_VERTEXAI_COMPATIBLE = true;

/**
 * Map-reduce insight generation strategy for large codebases.
 * Splits summaries into chunks, processes each chunk (MAP), then consolidates results (REDUCE).
 */
@injectable()
export class MapReduceCompletionStrategy implements ICompletionStrategy {
  private readonly maxTokens: number;

  constructor(@inject(llmTokens.LLMRouter) private readonly llmRouter: LLMRouter) {
    // Get the token limit from the manifest for chunking calculations
    const manifest = this.llmRouter.getLLMManifest();
    this.maxTokens = manifest.models.primaryCompletion.maxTotalTokens;
  }

  /**
   * Generate insights using map-reduce approach:
   * 1. Split summaries into chunks
   * 2. MAP: Generate partial insights for each chunk
   * 3. REDUCE: Consolidate partial insights into final result
   *
   * Returns the strongly-typed result inferred from the category's schema.
   */
  async generateInsights<C extends AppSummaryCategoryEnum>(
    category: C,
    sourceFileSummaries: string[],
  ): Promise<CategoryInsightResult<C> | null> {
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
      // Collect as PartialAppSummaryRecord since we're aggregating multiple chunk results
      const partialResults: PartialAppSummaryRecord[] = [];
      for (const chunk of summaryChunks) {
        const index = partialResults.length;
        console.log(
          `  - [MAP ${index + 1}/${summaryChunks.length}] Processing chunk for ${categoryLabel}...`,
        );
        const result = await this.generatePartialInsightsForCategory(category, chunk);
        if (result !== null) {
          partialResults.push(result);
        }
      }

      if (partialResults.length === 0) {
        logOneLineWarning(
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
        logOneLineWarning(`Failed to generate final consolidated summary for ${categoryLabel}.`);
        return null;
      }

      return finalSummaryData;
    } catch (error: unknown) {
      logOneLineWarning(
        `${error instanceof Error ? error.message : "Unknown error"} for ${categoryLabel}`,
      );
      return null;
    }
  }

  /**
   * MAP step: Generates partial insights for a single chunk of summaries.
   * This method is called once per chunk in the map-reduce process.
   * Returns the strongly-typed result inferred from the category's schema.
   */
  private async generatePartialInsightsForCategory<C extends AppSummaryCategoryEnum>(
    category: C,
    summaryChunk: string[],
  ): Promise<CategoryInsightResult<C> | null> {
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
   *
   * Uses the strongly-typed `appSummaryCategorySchemas` mapping to enable proper type inference
   * from the category parameter, returning the category-specific result type.
   */
  private async reducePartialInsights<C extends AppSummaryCategoryEnum>(
    category: C,
    partialResults: PartialAppSummaryRecord[],
  ): Promise<CategoryInsightResult<C> | null> {
    const config = summaryCategoriesConfig[category];

    // Use strongly-typed schema for type inference
    const schema = appSummaryCategorySchemas[category];

    // Get the key name for this category (e.g., "entities", "boundedContexts")
    const schemaShape = (schema as z.ZodObject<z.ZodRawShape>).shape;
    const categoryKey = Object.keys(schemaShape)[0];

    // Flatten the arrays from all partial results into a single combined list
    // We need to access the category property from PartialAppSummaryRecord
    const combinedData = partialResults.flatMap((result) => {
      const record = result as Record<string, unknown>;
      const categoryData = record[category];
      // Type guard to ensure we're working with arrays
      if (Array.isArray(categoryData)) {
        return categoryData as unknown[];
      }
      return [] as unknown[];
    });

    const content = JSON.stringify({ [categoryKey]: combinedData }, null, 2);
    const reducePromptDefinition = createReduceInsightsPromptDefinition(
      config.label ?? category,
      schema,
    );
    const renderedPrompt = renderPrompt(reducePromptDefinition, { categoryKey, content });

    try {
      // Use strongly-typed schema lookup - enables correct return type inference
      const result = await this.llmRouter.executeCompletion(`${category}-reduce`, renderedPrompt, {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
        hasComplexSchema: !CATEGORY_SCHEMA_IS_VERTEXAI_COMPATIBLE,
      });

      return result;
    } catch (error: unknown) {
      logOneLineWarning(
        `Failed to consolidate partial insights for ${config.label ?? category}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      return null;
    }
  }
}
