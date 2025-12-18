import { injectable, inject } from "tsyringe";
import { z } from "zod";
import LLMRouter from "../../../../common/llm/llm-router";
import { LLMOutputFormat } from "../../../../common/llm/types/llm.types";
import { insightsTuningConfig } from "../insights.config";
import { appSummaryPromptMetadata as summaryCategoriesConfig } from "../../../prompts/definitions/app-summaries";
import { logOneLineWarning } from "../../../../common/utils/logging";
import { renderPrompt } from "../../../prompts/prompt-renderer";
import { llmTokens } from "../../../di/tokens";
import { ICompletionStrategy } from "./completion-strategy.interface";
import {
  AppSummaryCategoryEnum,
  CategoryInsightResult,
  appSummaryCategorySchemas,
  type AppSummaryCategorySchemas,
} from "../insights.types";
import { getSchemaSpecificSanitizerConfig } from "../../../prompts/config/schema-specific-sanitizer.config";
import { createReduceInsightsPromptDefinition } from "../../../prompts/definitions/utility-prompts";
import { executeInsightCompletion } from "./completion-executor";
import { chunkTextByTokenLimit } from "../../../../common/llm/utils/text-chunking";

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
      // Collect with category-specific typing to preserve type safety through the pipeline
      const partialResults: CategoryInsightResult<C>[] = [];
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
   * Helper method to execute completion with a schema, properly typed to help TypeScript inference.
   */
  private async executeCompletionWithSchema<C extends AppSummaryCategoryEnum>(
    resourceName: string,
    prompt: string,
    schema: AppSummaryCategorySchemas[C],
  ): Promise<z.infer<AppSummaryCategorySchemas[C]> | null> {
    // TypeScript cannot infer the exact schema type from the indexed access type,
    // but the type is guaranteed to be correct at runtime via Zod validation.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.llmRouter.executeCompletion(resourceName, prompt, {
      outputFormat: LLMOutputFormat.JSON,
      jsonSchema: schema,
      hasComplexSchema: !CATEGORY_SCHEMA_IS_VERTEXAI_COMPATIBLE,
      sanitizerConfig: getSchemaSpecificSanitizerConfig(),
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
    const config = summaryCategoriesConfig[category];

    // Use strongly-typed schema for type inference
    const schema = appSummaryCategorySchemas[category];

    // Get the key name for this category (e.g., "entities", "boundedContexts")
    const schemaShape = (schema as z.ZodObject<z.ZodRawShape>).shape;
    // Assert that the dynamically retrieved key is a valid key of the result type.
    // This enables TypeScript to correctly infer the type of result[categoryKey] without unsafe casts.
    const categoryKey = Object.keys(schemaShape)[0] as keyof CategoryInsightResult<C>;

    // Flatten the arrays from all partial results into a single combined list
    // result is strongly typed as CategoryInsightResult<C>, which is the category-specific shape
    const combinedData = partialResults.flatMap((result) => {
      // TypeScript now correctly infers the type of categoryData based on the categoryKey assertion
      const categoryData = result[categoryKey];
      if (Array.isArray(categoryData)) {
        return categoryData;
      }
      return [];
    });

    const content = JSON.stringify({ [categoryKey]: combinedData }, null, 2);
    const reducePromptDefinition = createReduceInsightsPromptDefinition(
      config.label ?? category,
      schema,
    );
    const renderedPrompt = renderPrompt(reducePromptDefinition, { categoryKey, content });

    try {
      // Use strongly-typed schema lookup - enables correct return type inference
      // Helper function call with explicit type parameter to help TypeScript infer types
      const result = await this.executeCompletionWithSchema<C>(
        `${category}-reduce`,
        renderedPrompt,
        schema,
      );

      return result;
    } catch (error: unknown) {
      logOneLineWarning(
        `Failed to consolidate partial insights for ${config.label ?? category}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      return null;
    }
  }
}
