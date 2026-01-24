import { injectable, inject } from "tsyringe";
import { z } from "zod";
import LLMRouter from "../../../../common/llm/llm-router";
import { LLMOutputFormat } from "../../../../common/llm/types/llm-request.types";
import { insightsConfig } from "../insights.config";
import { llmConcurrencyLimiter } from "../../../config/concurrency.config";
import { getCategoryLabel } from "../../../config/category-labels.config";
import { logWarn } from "../../../../common/utils/logging";
import { isNotNull } from "../../../../common/utils/type-guards";
import { llmTokens } from "../../../di/tokens";
import { IInsightGenerationStrategy } from "./completion-strategy.interface";
import {
  AppSummaryCategoryEnum,
  CategoryInsightResult,
  MapReduceIntermediateData,
  appSummaryCategorySchemas,
} from "../insights.types";
import { getLlmArtifactCorrections } from "../../../llm";
import { executeInsightCompletion } from "./insights-completion-executor";
import { chunkTextByTokenLimit } from "../../../../common/llm/utils/text-chunking";
import { isOk } from "../../../../common/types/result.types";
import { buildReducePrompt } from "../../../prompts/prompt-builders";

/**
 * Map-reduce insight generation strategy for large codebases.
 * Splits summaries into chunks, processes each chunk (MAP), then consolidates results (REDUCE).
 */
@injectable()
export class MapReduceInsightStrategy implements IInsightGenerationStrategy {
  private readonly maxTokens: number;

  constructor(@inject(llmTokens.LLMRouter) private readonly llmRouter: LLMRouter) {
    // Get the token limit from the first completion model in the chain for chunking calculations
    this.maxTokens = this.llmRouter.getFirstCompletionModelMaxTokens();
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
      // Filter null results using type guard for proper type narrowing
      const partialResults = results.filter(isNotNull);

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
   * Uses forPartialAnalysis flag which includes a note about partial analysis.
   * Returns the strongly-typed result inferred from the category's schema.
   */
  private async generatePartialInsightsForCategory<C extends AppSummaryCategoryEnum>(
    category: C,
    summaryChunk: string[],
  ): Promise<CategoryInsightResult<C> | null> {
    return executeInsightCompletion(this.llmRouter, category, summaryChunk, {
      forPartialAnalysis: true,
      taskCategory: `${category}-chunk`,
    });
  }

  /**
   * Combines partial results from the MAP phase based on schema structure.
   * Produces intermediate data for the REDUCE phase to consolidate.
   *
   * Handles three schema shapes:
   * - Flat array: `{ categoryKey: [...] }` → flatMap all arrays
   * - Nested object: `{ categoryKey: { prop1: [], prop2: [] } }` → merge each nested array
   * - String value: `{ categoryKey: "..." }` → collect strings into array for reduce consolidation
   *
   * IMPORTANT: The return type `MapReduceIntermediateData<C>` explicitly documents that this
   * function produces intermediate data that may NOT conform to the final CategoryInsightResult<C>.
   * For string categories, it returns `{ key: string[] }` instead of `{ key: string }`.
   *
   * @returns MapReduceIntermediateData<C> - intermediate data for the REDUCE phase
   */
  private combinePartialResultsData<C extends AppSummaryCategoryEnum>(
    category: C,
    partialResults: CategoryInsightResult<C>[],
  ): MapReduceIntermediateData<C> {
    const schema = appSummaryCategorySchemas[category];
    const schemaShape = (schema as z.ZodObject<z.ZodRawShape>).shape;
    const categoryKey = Object.keys(schemaShape)[0] as keyof CategoryInsightResult<C>;
    const valueSchema = schemaShape[categoryKey as string];

    // Case 1: Flat array shape (e.g., technologies, businessProcesses)
    if (valueSchema instanceof z.ZodArray) {
      const combinedArray = partialResults.flatMap((result) => {
        const data = result[categoryKey];
        return Array.isArray(data) ? data : [];
      });
      /**
       * TYPE ASSERTION RATIONALE:
       * For array categories, MapReduceIntermediateData<C> equals CategoryInsightResult<C>.
       * The flatMap preserves element types. TypeScript cannot verify the computed key
       * produces the correct structure, but it's guaranteed by construction.
       */
      return { [categoryKey]: combinedArray } as MapReduceIntermediateData<C>;
    }

    // Case 2: Nested object shape (e.g., inferredArchitecture)
    if (valueSchema instanceof z.ZodObject) {
      const nestedShape = valueSchema.shape as z.ZodRawShape;
      const mergedObject: Record<string, unknown[]> = {};

      // Initialize arrays for each nested property that is an array
      for (const nestedKey of Object.keys(nestedShape)) {
        const nestedValueSchema = nestedShape[nestedKey];
        if (nestedValueSchema instanceof z.ZodArray) {
          mergedObject[nestedKey] = [];
        }
      }

      // Merge data from each partial result
      for (const result of partialResults) {
        const nestedData = result[categoryKey] as Record<string, unknown> | undefined;
        if (!nestedData) continue;

        for (const nestedKey of Object.keys(mergedObject)) {
          const nestedArray = nestedData[nestedKey];
          if (Array.isArray(nestedArray)) {
            mergedObject[nestedKey].push(...(nestedArray as unknown[]));
          }
        }
      }

      /**
       * TYPE ASSERTION RATIONALE:
       * For nested object categories, MapReduceIntermediateData<C> equals CategoryInsightResult<C>
       * (no string fields at the nested level). The merged structure matches the schema,
       * but TypeScript cannot verify due to dynamic key iteration.
       */
      return { [categoryKey]: mergedObject } as MapReduceIntermediateData<C>;
    }

    // Case 3: String value shape (e.g., appDescription)
    // Collect partial strings into an array for the reduce phase to consolidate.
    if (valueSchema instanceof z.ZodString) {
      const collectedStrings = partialResults
        .map((result) => {
          const data = result[categoryKey];
          return typeof data === "string" ? data : "";
        })
        .filter((s) => s.length > 0);
      /**
       * TYPE ASSERTION RATIONALE:
       * For string categories, MapReduceIntermediateData<C> transforms the string field
       * to string[], matching our return value. The REDUCE phase LLM will consolidate
       * these strings into the final single-string format required by CategoryInsightResult<C>.
       * This intermediate representation is intentional and type-safe per MapReduceIntermediateData.
       */
      return { [categoryKey]: collectedStrings } as MapReduceIntermediateData<C>;
    }

    // No silent fallback - if we reach here, the schema shape is unhandled and indicates
    // a new category type was added without updating this function
    throw new Error(
      `Unhandled schema shape for category "${category}". ` +
        `Map-reduce strategy requires explicit handling for Array, Object, or String schemas.`,
    );
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
    try {
      const schema = appSummaryCategorySchemas[category];
      const schemaShape = (schema as z.ZodObject<z.ZodRawShape>).shape;
      const categoryKey = Object.keys(schemaShape)[0] as keyof CategoryInsightResult<C>;
      const combinedData = this.combinePartialResultsData(category, partialResults);
      const content = JSON.stringify(combinedData, null, 2);
      const { prompt: renderedPrompt, metadata } = buildReducePrompt(
        String(categoryKey),
        content,
        schema,
      );
      const result = await this.llmRouter.executeCompletion(`${category}-reduce`, renderedPrompt, {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
        hasComplexSchema: metadata.hasComplexSchema,
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
       * TypeScript cannot narrow the schema type through the dynamic lookup
       * `appSummaryCategorySchemas[category]` when `category` is a generic parameter.
       * The compiler sees the union of all possible schemasrather than the specific schema for C.
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
