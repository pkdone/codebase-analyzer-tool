import { z } from "zod";
import { type PromptConfig } from "../../../../common/prompts/prompt.types";

/**
 * Data block header for file summary analysis prompts.
 */
export const FILE_SUMMARIES_DATA_BLOCK_HEADER = "FILE_SUMMARIES" as const;

/**
 * Configuration entry for app summary prompts.
 * Extends the base PromptConfig with a required `label` field.
 *
 * @template S - The Zod schema type for validating the LLM response.
 */
export interface AppSummaryConfigEntry<S extends z.ZodType = z.ZodType> extends PromptConfig<S> {
  /** Label for UI display and logging (required for app summary configs) */
  label: string;
}

/**
 * Default content description for app summary prompts.
 * All app summaries analyze file summaries from the codebase.
 */
const DEFAULT_CONTENT_DESC = "a set of source file summaries";

/**
 * Factory function to create an app summary configuration entry.
 * This eliminates duplication of the contentDesc field across all entries
 * and ensures consistent structure for all app summary configs.
 *
 * Uses rest parameters for cleaner call sites - no array brackets or `as const` needed.
 *
 * @template S - The Zod schema type for validating the LLM response
 * @param label - Display label for UI and logging
 * @param responseSchema - Zod schema for validating the LLM response
 * @param instructions - One or more instruction strings for the LLM
 * @returns A fully configured AppSummaryConfigEntry
 */
export function createAppSummaryConfig<S extends z.ZodType>(
  label: string,
  responseSchema: S,
  ...instructions: string[]
): AppSummaryConfigEntry<S> {
  return {
    label,
    contentDesc: DEFAULT_CONTENT_DESC,
    instructions,
    responseSchema,
    dataBlockHeader: FILE_SUMMARIES_DATA_BLOCK_HEADER,
    wrapInCodeBlock: false,
  };
}
