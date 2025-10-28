import { z } from "zod";
import { AppSummaryCategories } from "../../schemas/app-summaries.schema";
import { PromptDefinition } from "./prompt-definition.types";

/**
 * Explicit type for app summary categories
 * This replaces z.infer<typeof AppSummaryCategories> throughout the codebase
 */
export type AppSummaryCategoryType = z.infer<typeof AppSummaryCategories>;

/**
 * Configuration interface for app summary prompt templates
 * Extends PromptDefinition to ensure consistent structure
 */
export interface AppSummaryPromptTemplate extends Omit<PromptDefinition, "contentDesc"> {
  label: string;
  summaryType: string;
  contentDescription: string; // Keep backward compatibility with contentDescription for UI labels
}
