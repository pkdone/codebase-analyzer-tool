/**
 * Data block header for file summary analysis prompts.
 */
export const FILE_SUMMARIES_DATA_BLOCK_HEADER = "FILE_SUMMARIES" as const;

/**
 * Default content description for app summary prompts.
 * All app summaries analyze file summaries from the codebase.
 */
export const APP_SUMMARY_CONTENT_DESC = "a set of source file summaries" as const;

/**
 * Common instruction fragments used across multiple app summary templates
 */
export const APP_SUMMARY_PROMPT_FRAGMENTS = {
  CONCISE_LIST: "a concise list",
  COMPREHENSIVE_LIST: "a comprehensive list",
} as const;

/**
 * Generates the content description for reduce insights prompts.
 * This function creates a standardized description explaining the consolidation task.
 *
 * @param categoryKey - The key name for the category being reduced (e.g., "technologies", "boundedContexts")
 * @returns A formatted content description string for the reduce insights prompt
 */
export function buildReduceInsightsContentDesc(categoryKey: string): string {
  return `what has been merged from several JSON objects, where each contained a list of '${categoryKey}' generated from different parts of a codebase, your task is to consolidate these lists into a single, de-duplicated, and coherent final JSON object. Merge similar items, remove duplicates based on semantic similarity (not just exact name matches), and ensure the final list is comprehensive and well-organized. Given that the merged raw data is`;
}
