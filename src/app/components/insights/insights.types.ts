import { z } from "zod";
import {
  appSummaryCategorySchemas,
  type AppSummaryCategorySchemas,
  type AppSummaryCategoryType,
} from "../../schemas/app-summaries.schema";
import { PartialAppSummaryRecord } from "../../repositories/app-summaries/app-summaries.model";

// Re-export schema utilities for convenient access within the insights module
export { appSummaryCategorySchemas, type AppSummaryCategorySchemas };

// Re-export category types for use by insight strategies and generators
export type { AppSummaryCategoryType };

// Re-export PartialAppSummaryRecord from the model for convenience
export type { PartialAppSummaryRecord };

/**
 * Type alias for category-specific insight result.
 * Use this to get the strongly-typed result for a specific category.
 *
 * @example
 * type EntitiesResult = CategoryInsightResult<"entities">;
 * // Results in: { entities: Array<...> }
 */
export type CategoryInsightResult<C extends AppSummaryCategoryType> = z.infer<
  AppSummaryCategorySchemas[C]
>;

/**
 * Intermediate data structure produced by the MAP phase of map-reduce insight generation.
 * This type differs from CategoryInsightResult<C> for string-valued categories:
 *
 * - For array categories (e.g., technologies): Same structure - arrays are concatenated
 * - For nested object categories (e.g., inferredArchitecture): Same structure - nested arrays merged
 * - For string categories (e.g., appDescription): Returns `{ key: string[] }` instead of `{ key: string }`
 *   because the REDUCE phase needs to consolidate multiple partial strings into one
 *
 * This explicit type documents the intermediate representation used between MAP and REDUCE phases,
 * making clear that `combinePartialResultsData` produces data that may not conform to the final schema.
 *
 * @example
 * // For "technologies" category (array):
 * type TechIntermediate = MapReduceIntermediateData<"technologies">;
 * // Results in: { technologies: Array<...> } - same as final
 *
 * // For "appDescription" category (string):
 * type DescIntermediate = MapReduceIntermediateData<"appDescription">;
 * // Results in: { appDescription: string[] } - array of partial descriptions to consolidate
 */
export type MapReduceIntermediateData<C extends AppSummaryCategoryType> = {
  [K in keyof CategoryInsightResult<C>]: CategoryInsightResult<C>[K] extends string
    ? string[] // String fields become arrays for consolidation
    : CategoryInsightResult<C>[K];
};
