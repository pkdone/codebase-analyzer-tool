import { z } from "zod";
import { logOneLineError } from "../../../common/utils/logging";
import type LLMRouter from "../../../common/llm/llm-router";
import { LLMOutputFormat } from "../../../common/llm/types/llm.types";
import { LLMError, LLMErrorCode } from "../../../common/llm/types/llm-errors.types";
import path from "node:path";
import { promptRegistry } from "../../prompts/prompt-registry";
import { sourceConfigMap } from "../../prompts/definitions/sources/sources.config";
import { renderPrompt } from "../../prompts/prompt-renderer";
import { sourceSummarySchema } from "../../schemas/sources.schema";
import {
  FILE_TYPE_MAPPING_RULES,
  FILENAME_TO_TYPE_MAP,
  EXTENSION_TO_TYPE_MAP,
} from "./config/file-types.config";
import { getSchemaSpecificSanitizerConfig } from "../insights/config/sanitizer.config";

/**
 * Type for source summary (full schema).
 */
export type SourceSummaryType = z.infer<typeof sourceSummarySchema>;

/**
 * Type for partial source summary.
 * The prompt metadata uses picked subsets of sourceSummarySchema for validation,
 * so the LLM may not return all optional fields. This type accurately represents
 * the actual return type from the summarization process.
 */
export type PartialSourceSummaryType = Partial<SourceSummaryType>;

/**
 * Derive the canonical file type for a given path and declared extension/suffix.
 * Uses data-driven maps for fast lookups, falling back to rule-based system for complex cases.
 */
function getCanonicalFileType(filepath: string, type: string): keyof typeof promptRegistry.sources {
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
 * The picked schemas include only the fields relevant to each file type. This function
 * returns a partial summary containing only the fields requested for that file type,
 * ensuring type safety aligns with runtime behavior.
 *
 * @param llmRouter The LLM router instance
 * @param filepath The path to the file being summarized
 * @param type The file type/extension
 * @param content The file content to summarize
 * @returns A partial summary with fields specific to the file type
 */
export async function summarizeFile(
  llmRouter: LLMRouter,
  filepath: string,
  type: string,
  content: string,
): Promise<PartialSourceSummaryType> {
  try {
    if (content.trim().length === 0) throw new Error("File is empty");
    const canonicalFileType = getCanonicalFileType(filepath, type);
    const promptMetadata = promptRegistry.sources[canonicalFileType];
    const schema = sourceConfigMap[canonicalFileType].responseSchema;
    const renderedPrompt = renderPrompt(promptMetadata, { content });

    // Use schema from sourceConfigMap.responseSchema directly.
    // Each file type uses .pick() to request only relevant fields (improves token efficiency).
    const completionOptions = {
      outputFormat: LLMOutputFormat.JSON,
      jsonSchema: schema,
      hasComplexSchema: promptMetadata.hasComplexSchema,
      sanitizerConfig: getSchemaSpecificSanitizerConfig(),
    } as const;

    // Execute completion with the file-type-specific schema.
    // The schema is z.ZodType, so we explicitly cast the response as PartialSourceSummaryType
    // which accurately represents the union of all possible returned fields.
    // The type assertion is safe because the schema is derived from sourceSummarySchema.pick().
    const response = (await llmRouter.executeCompletion(
      filepath,
      renderedPrompt,
      completionOptions,
    )) as PartialSourceSummaryType | null;

    if (response === null) {
      throw new LLMError(LLMErrorCode.BAD_RESPONSE_CONTENT, "LLM returned null response");
    }

    // The response is typed as PartialSourceSummaryType, representing the subset
    // of fields that were actually requested for this file type.
    return response;
  } catch (error: unknown) {
    const errorMsg = `Failed to generate summary for '${filepath}'`;
    logOneLineError(errorMsg, error);
    throw error;
  }
}
