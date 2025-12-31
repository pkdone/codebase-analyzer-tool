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
  return `several JSON objects, each containing a list of '${categoryKey}' generated from different parts of a codebase. Your task is to consolidate these lists into a single, de-duplicated, and coherent final JSON object. Merge similar items, remove duplicates based on semantic similarity (not just exact name matches), and ensure the final list is comprehensive and well-organized`;
}
