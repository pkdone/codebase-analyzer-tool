import { z } from "zod";
import { AppSummaryCategories, appSummarySchema } from "../../schemas/app-summaries.schema";

/**
 * Schema for all category fields of app summary (so excluding 'projectName' and 'llmProvider')
 */
export const appSummaryRecordCategoriesSchema = appSummarySchema.partial().omit({
  projectName: true,
  llmProvider: true,
});

/**
 * Type for validating the LLM response for a specific category
 */
export type PartialAppSummaryRecord = Partial<z.infer<typeof appSummarySchema>>;

/**
 * Type for the enum of app summary categories
 */
export type AppSummaryCategoryEnum = z.infer<typeof AppSummaryCategories>;
