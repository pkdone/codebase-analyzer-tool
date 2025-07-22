import { z } from "zod";
import {  AppSummaryCategories, appSummarySchema } from "../../schemas/app-summaries.schema";

// TODO: remove need for this variable
const partialAppSummarySchemaTMP = appSummarySchema.partial();

/**
 * Schema for all category fields of app summary (so excluding 'projectName' and 'llmProvider')
 */
export const appSummaryRecordCategoriesSchema = partialAppSummarySchemaTMP.omit({
  projectName: true,
  llmProvider: true,
});

/**
 * Type for validating the LLM response for a specific category
 */
export type PartialAppSummaryRecord = Partial<z.infer<typeof partialAppSummarySchemaTMP>>;

/**
 * TODO
 */
export type AppSummaryCategoryEnum = z.infer<typeof AppSummaryCategories>;
