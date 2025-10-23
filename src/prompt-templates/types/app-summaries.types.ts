import { z } from "zod";
import { AppSummaryCategories } from "../../schemas/app-summaries.schema";

/**
 * Explicit type for app summary categories
 * This replaces z.infer<typeof AppSummaryCategories> throughout the codebase
 */
export type AppSummaryCategoryType = z.infer<typeof AppSummaryCategories>;

/**
 * Configuration interface for app summary prompt templates
 */
export interface AppSummaryPromptTemplate<
  T extends z.ZodObject<z.ZodRawShape> = z.ZodObject<z.ZodRawShape>,
> {
  label: string;
  summaryType: string;
  contentDescription: string;
  responseSchema: T;
  instructions: string;
}
