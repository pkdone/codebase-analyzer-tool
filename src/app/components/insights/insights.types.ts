import { z } from "zod";
import {
  appSummarySchema,
  AppSummaryCategories,
  appSummaryCategorySchemas,
  type AppSummaryCategorySchemas,
} from "../../schemas/app-summaries.schema";

// Re-export for convenient access by consumers
export { appSummaryCategorySchemas, type AppSummaryCategorySchemas };

/**
 * Type for validating the LLM response for a specific category
 */
export type PartialAppSummaryRecord = Partial<z.infer<typeof appSummarySchema>>;

/**
 * Type for app summary categories
 */
export type AppSummaryCategoryType = z.infer<typeof AppSummaryCategories>;

/**
 * Type for the enum of app summary categories
 */
export type AppSummaryCategoryEnum = AppSummaryCategoryType;

/**
 * Type alias for category-specific insight result.
 * Use this to get the strongly-typed result for a specific category.
 *
 * @example
 * type EntitiesResult = CategoryInsightResult<"entities">;
 * // Results in: { entities: Array<...> }
 */
export type CategoryInsightResult<C extends AppSummaryCategoryEnum> = z.infer<
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
export type MapReduceIntermediateData<C extends AppSummaryCategoryEnum> = {
  [K in keyof CategoryInsightResult<C>]: CategoryInsightResult<C>[K] extends string
    ? string[] // String fields become arrays for consolidation
    : CategoryInsightResult<C>[K];
};
