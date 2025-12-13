import { z } from "zod";
import { AppSummaryCategoryEnum } from "../insights.types";

/**
 * Strategy interface for generating insights from source file summaries.
 * Different implementations can handle small codebases (single-pass) vs large codebases (map-reduce).
 */
export interface ICompletionStrategy {
  /**
   * Generate insights for a specific category using source file summaries.
   * The return type is inferred from the schema type S, preserving strong typing.
   *
   * @template S - The Zod schema type for the category's response schema
   * @param category - The category of insights to generate
   * @param sourceFileSummaries - Array of formatted source file summaries
   * @returns The generated insights for the category as z.infer<S>, or null if generation fails
   */
  generateInsights<S extends z.ZodType>(
    category: AppSummaryCategoryEnum,
    sourceFileSummaries: string[],
  ): Promise<z.infer<S> | null>;
}
