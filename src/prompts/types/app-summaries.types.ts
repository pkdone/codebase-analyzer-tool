import { z } from "zod";
import { AppSummaryCategories } from "../../schemas/app-summaries.schema";

/**
 * Explicit type for app summary categories
 * This replaces z.infer<typeof AppSummaryCategories> throughout the codebase
 */
export type AppSummaryCategoryType = z.infer<typeof AppSummaryCategories>;
