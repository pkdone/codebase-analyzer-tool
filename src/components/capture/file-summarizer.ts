import { z } from "zod";
import { logOneLineWarning } from "../../common/utils/logging";
import type LLMRouter from "../../llm/llm-router";
import { LLMOutputFormat } from "../../llm/types/llm.types";
import { BadResponseContentLLMError } from "../../llm/types/llm-errors.types";
import path from "node:path";
import { fileTypePromptMetadata } from "../../prompts/definitions/sources";
import { sourcePromptSchemas } from "../../prompts/definitions/sources/sources.schemas";
import { renderPrompt } from "../../prompts/prompt-renderer";
import { sourceSummarySchema } from "../../schemas/sources.schema";
import {
  FILE_TYPE_MAPPING_RULES,
  FILENAME_TO_TYPE_MAP,
  EXTENSION_TO_TYPE_MAP,
} from "../../config/file-types.config";

/**
 * Type for source summary.
 * Note: The prompt metadata uses picked subsets of sourceSummarySchema for validation,
 * but all picks include the required fields (purpose, implementation), so the result
 * is always compatible with the full SourceSummaryType.
 */
export type SourceSummaryType = z.infer<typeof sourceSummarySchema>;

/**
 * Derive the canonical file type for a given path and declared extension/suffix.
 * Uses data-driven maps for fast lookups, falling back to rule-based system for complex cases.
 */
function getCanonicalFileType(filepath: string, type: string): keyof typeof fileTypePromptMetadata {
  const filename = path.basename(filepath).toLowerCase();
  const extension = type.toLowerCase();

  // 1. Check exact filename matches first (fastest lookup)
  if (Object.hasOwn(FILENAME_TO_TYPE_MAP, filename)) {
    return FILENAME_TO_TYPE_MAP[filename];
  }

  // 2. Check extension-based mappings
  if (Object.hasOwn(EXTENSION_TO_TYPE_MAP, extension)) {
    return EXTENSION_TO_TYPE_MAP[extension];
  }

  // 3. Fall back to rule-based system for complex patterns (e.g., "readme*", "license*")
  for (const rule of FILE_TYPE_MAPPING_RULES) {
    if (rule.test(filename, extension)) {
      return rule.type;
    }
  }

  // Fallback to default (should never reach here as last rule always matches)
  return "default";
}

/**
 * Generate a strongly-typed summary for the given file content.
 * Throws an error if summarization fails.
 *
 * Note: The prompt metadata uses picked subsets of sourceSummarySchema for validation.
 * While the picked schemas include required fields (purpose, implementation), they may not
 * include all fields of the full schema. This function validates the LLM response against
 * the full schema to ensure type safety and catch any missing fields.
 *
 * @param llmRouter The LLM router instance
 * @param filepath The path to the file being summarized
 * @param type The file type/extension
 * @param content The file content to summarize
 * @returns The generated summary
 */
export async function summarizeFile(
  llmRouter: LLMRouter,
  filepath: string,
  type: string,
  content: string,
): Promise<SourceSummaryType> {
  try {
    if (content.trim().length === 0) throw new Error("File is empty");
    const canonicalFileType = getCanonicalFileType(filepath, type);
    const promptMetadata = fileTypePromptMetadata[canonicalFileType];
    const schema = sourcePromptSchemas[canonicalFileType];
    const renderedPrompt = renderPrompt(promptMetadata, { content });

    // Use strongly-typed schema from the sourcePromptSchemas map.
    // This ensures proper type inference throughout the call chain.
    // Each file type uses .pick() to request only relevant fields (improves token efficiency).
    const completionOptions = {
      outputFormat: LLMOutputFormat.JSON,
      jsonSchema: schema,
      hasComplexSchema: promptMetadata.hasComplexSchema,
    } as const;

    // The response type is now correctly inferred from the strongly-typed schema.
    // Type safety is maintained throughout the entire call chain.
    const response = await llmRouter.executeCompletion(filepath, renderedPrompt, completionOptions);

    if (response === null) {
      throw new BadResponseContentLLMError("LLM returned null response");
    }

    // Type assertion: The picked schema includes all required fields (purpose, implementation).
    // Optional fields not in the pick will be undefined, which is valid for SourceSummaryType.
    // This is a pragmatic cast from a strongly-typed partial to the full type, not from 'any'.
    return response as SourceSummaryType;
  } catch (error: unknown) {
    const errorMsg = `Failed to generate summary for '${filepath}'`;
    logOneLineWarning(errorMsg, error);
    throw error;
  }
}
