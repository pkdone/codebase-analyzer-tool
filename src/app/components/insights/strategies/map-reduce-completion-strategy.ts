import { injectable, inject } from "tsyringe";
import { z } from "zod";
import LLMRouter from "../../../../common/llm/llm-router";
import { LLMOutputFormat } from "../../../../common/llm/types/llm.types";
import { insightsConfig } from "../insights.config";
import { llmConcurrencyLimiter } from "../../../config/concurrency.config";
import { getCategoryLabel } from "../../../config/category-labels.config";
import { logWarn } from "../../../../common/utils/logging";
import { renderPrompt } from "../../../prompts/prompt-renderer";
import { llmTokens } from "../../../di/tokens";
import { IInsightGenerationStrategy } from "./completion-strategy.interface";
import {
  AppSummaryCategoryEnum,
  CategoryInsightResult,
  appSummaryCategorySchemas,
} from "../insights.types";
import { getLlmArtifactCorrections } from "../../../config/llm-artifact-corrections";
import { executeInsightCompletion } from "./insights-completion-executor";
import { chunkTextByTokenLimit } from "../../../../common/llm/utils/text-chunking";
import { isOk } from "../../../../common/types/result.types";
import { buildReduceInsightsContentDesc } from "../../../prompts/definitions/app-summaries/app-summaries.fragments";
import { BASE_PROMPT_TEMPLATE } from "../../../prompts/templates";
import { DATA_BLOCK_HEADERS, type PromptDefinition } from "../../../prompts/prompt.types";

/**
 * Map-reduce insight generation strategy for large codebases.
 * Splits summaries into chunks, processes each chunk (MAP), then consolidates results (REDUCE).
 */
@injectable()
export class MapReduceInsightStrategy implements IInsightGenerationStrategy {
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
    sourceFileSummaries: readonly string[],
  ): Promise<CategoryInsightResult<C> | null> {
    const categoryLabel = getCategoryLabel(category);

    try {
      console.log(`  - Using map-reduce strategy for ${categoryLabel}`);

      // 1. Chunk the summaries into token-appropriate sizes
      const summaryChunks = chunkTextByTokenLimit(sourceFileSummaries, {
        maxTokens: this.maxTokens,
        chunkTokenLimitRatio: insightsConfig.CHUNK_TOKEN_LIMIT_RATIO,
      });

      console.log(
        `  - Split summaries into ${summaryChunks.length} chunks for map-reduce processing`,
      );

      // 2. MAP: Generate partial insights for each chunk in parallel
      // Uses shared concurrency limiter to prevent rate limit issues from nested parallelism
      // (categories are also processed in parallel at the generator level)
      const partialResultsPromises = summaryChunks.map(async (chunk, index) =>
        llmConcurrencyLimiter(async () => {
          console.log(
            `  - [MAP ${index + 1}/${summaryChunks.length}] Processing chunk for ${categoryLabel}...`,
          );
          return this.generatePartialInsightsForCategory(category, chunk);
        }),
      );

      const results = await Promise.all(partialResultsPromises);
      // Filter null results and assert type - the filter correctly removes nulls but TypeScript
      // can't narrow the Awaited<> wrapped generic type through the type guard
      const partialResults = results.filter((r) => r !== null) as CategoryInsightResult<C>[];

      if (partialResults.length === 0) {
        logWarn(
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
        logWarn(`Failed to generate final consolidated summary for ${categoryLabel}.`);
        return null;
      }

      return finalSummaryData;
    } catch (error: unknown) {
      logWarn(`${error instanceof Error ? error.message : "Unknown error"} for ${categoryLabel}`);
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
    partialResults: CategoryInsightResult<C>[],
  ): Promise<CategoryInsightResult<C> | null> {
    const schema = appSummaryCategorySchemas[category];
    const schemaShape = (schema as z.ZodObject<z.ZodRawShape>).shape;
    // Assert that the dynamically retrieved key is a valid key of the result type.
    // This enables TypeScript to correctly infer the type of result[categoryKey] without unsafe casts.
    const categoryKey = Object.keys(schemaShape)[0] as keyof CategoryInsightResult<C>;
    // Flatten the arrays from all partial results into a single combined list
    const combinedData = partialResults.flatMap((result) => {
      const categoryData = result[categoryKey];
      if (Array.isArray(categoryData)) return categoryData;
      return [];
    });
    const content = JSON.stringify({ [categoryKey]: combinedData }, null, 2);
    const reducePromptDef: PromptDefinition = {
      contentDesc: buildReduceInsightsContentDesc(categoryKey as string),
      instructions: [`a consolidated list of '${String(categoryKey)}'`],
      responseSchema: schema,
      template: BASE_PROMPT_TEMPLATE,
      dataBlockHeader: DATA_BLOCK_HEADERS.FRAGMENTED_DATA,
      wrapInCodeBlock: false,
      outputFormat: LLMOutputFormat.JSON,
    };
    const renderedPrompt = renderPrompt(reducePromptDef, { content });

    try {
      const result = await this.llmRouter.executeCompletion(`${category}-reduce`, renderedPrompt, {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
        hasComplexSchema: insightsConfig.IS_COMPLEX_SCHEMA,
        sanitizerConfig: getLlmArtifactCorrections(),
      });

      if (!isOk(result)) {
        logWarn(
          `LLM completion failed for ${getCategoryLabel(category)} reduce: ${result.error.message}`,
        );
        return null;
      }
      /**
       * TYPE ASSERTION RATIONALE:
       * This follows the same pattern as FileSummarizerService.summarize() and
       * executeInsightCompletion(). TypeScript cannot narrow the schema type through
       * the dynamic lookup `appSummaryCategorySchemas[category]` when `category` is
       * a generic parameter. The compiler sees the union of all possible schemas
       * rather than the specific schema for C.
       *
       * This is TYPE-SAFE because:
       * 1. The generic parameter C is constrained to valid AppSummaryCategoryEnum keys.
       * 2. The runtime lookup returns the exact schema corresponding to C.
       * 3. The LLM router validates the response against this schema before returning.
       * 4. CategoryInsightResult<C> accurately represents z.infer<AppSummaryCategorySchemas[C]>.
       */
      return result.value as CategoryInsightResult<C>;
    } catch (error: unknown) {
      logWarn(
        `Failed to consolidate partial insights for ${getCategoryLabel(category)}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      return null;
    }
  }
}
