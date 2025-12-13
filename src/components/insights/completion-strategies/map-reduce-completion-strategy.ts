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
import { AppSummaryCategoryEnum } from "../insights.types";
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
   * The return type is inferred from the category's response schema.
   */
  async generateInsights<S extends z.ZodType>(
    category: AppSummaryCategoryEnum,
    sourceFileSummaries: string[],
  ): Promise<z.infer<S> | null> {
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
      const partialResults: z.infer<S>[] = [];
      for (const chunk of summaryChunks) {
        const index = partialResults.length;
        console.log(
          `  - [MAP ${index + 1}/${summaryChunks.length}] Processing chunk for ${categoryLabel}...`,
        );
        const result = await this.generatePartialInsightsForCategory<S>(category, chunk);
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
      const finalSummaryData = await this.reducePartialInsights<S>(category, partialResults);

      if (!finalSummaryData) {
        logOneLineWarning(`Failed to generate final consolidated summary for ${categoryLabel}.`);
        return null;
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return finalSummaryData as z.infer<S> | null;
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
   * The return type is inferred from the category's response schema.
   */
  private async generatePartialInsightsForCategory<S extends z.ZodType>(
    category: AppSummaryCategoryEnum,
    summaryChunk: string[],
  ): Promise<z.infer<S> | null> {
    const partialAnalysisNote =
      "Note, this is a partial analysis of a larger codebase; focus on extracting insights from this subset of file summaries only. ";

    return executeInsightCompletion<S>(this.llmRouter, category, summaryChunk, {
      partialAnalysisNote,
      taskCategory: `${category}-chunk`,
    });
  }

  /**
   * REDUCE step: Consolidates multiple partial insights into a single final result.
   * This method combines and de-duplicates results from all chunks.
   * The return type is inferred from the category's response schema.
   */
  private async reducePartialInsights<S extends z.ZodType>(
    category: AppSummaryCategoryEnum,
    partialResults: z.infer<S>[],
  ): Promise<z.infer<S> | null> {
    const config = summaryCategoriesConfig[category];

    // Get the key name for this category (e.g., "entities", "boundedContexts")
    // Type assertion needed because responseSchema is typed as ZodType, but we know app summaries are ZodObject
    const schemaShape = (config.responseSchema as z.ZodObject<z.ZodRawShape>).shape;
    const categoryKey = Object.keys(schemaShape)[0];

    // Flatten the arrays from all partial results into a single combined list
    // Access the category property from the typed result
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
      config.responseSchema,
    );
    const renderedPrompt = renderPrompt(reducePromptDefinition, { categoryKey, content });

    try {
      // Type is inferred from the schema via executeCompletion overloads
      // Pass the schema with its type to preserve type safety
      const result = await this.llmRouter.executeCompletion(`${category}-reduce`, renderedPrompt, {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: config.responseSchema as S,
        hasComplexSchema: !CATEGORY_SCHEMA_IS_VERTEXAI_COMPATIBLE,
      });

      // Type assertion needed because executeCompletion implementation returns unknown
      // but the overload guarantees the correct type based on the schema
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return result as z.infer<S> | null;
    } catch (error: unknown) {
      logOneLineWarning(
        `Failed to consolidate partial insights for ${config.label ?? category}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      return null;
    }
  }
}
