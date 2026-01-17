import { z } from "zod";
import { type JsonPromptConfig } from "../../../../common/prompts/prompt";

/**
 * Data block header for file summary analysis prompts.
 */
export const FILE_SUMMARIES_DATA_BLOCK_HEADER = "FILE_SUMMARIES" as const;

/**
 * Configuration entry for app summary prompts.
 * Uses JsonPromptConfig which requires responseSchema, ensuring all app summary prompts
 * are JSON-mode prompts with explicit schema definitions.
 *
 * @template S - The Zod schema type for validating the LLM response.
 */
export type AppSummaryConfigEntry<S extends z.ZodType = z.ZodType> = JsonPromptConfig<S>;

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
 * @param responseSchema - Zod schema for validating the LLM response
 * @param instructions - One or more instruction strings for the LLM
 * @returns A fully configured AppSummaryConfigEntry
 */
export function createAppSummaryConfig<S extends z.ZodType>(
  responseSchema: S,
  ...instructions: string[]
): AppSummaryConfigEntry<S> {
  return {
    contentDesc: DEFAULT_CONTENT_DESC,
    instructions,
    responseSchema,
    dataBlockHeader: FILE_SUMMARIES_DATA_BLOCK_HEADER,
    wrapInCodeBlock: false,
  };
}
