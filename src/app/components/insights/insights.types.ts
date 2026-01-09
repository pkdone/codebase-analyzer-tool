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
