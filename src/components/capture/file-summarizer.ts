import { injectable, inject } from "tsyringe";
import { z } from "zod";
import { logErrorMsgAndDetail } from "../../common/utils/logging";
import type LLMRouter from "../../llm/core/llm-router";
import { llmTokens } from "../../llm/core/llm.tokens";
import { LLMOutputFormat } from "../../llm/types/llm.types";
import { BadResponseContentLLMError } from "../../llm/types/llm-errors.types";
import path from "node:path";
import { fileTypePromptMetadata } from "../../prompts/definitions/sources";
import { Prompt } from "../../prompts/prompt";
import { SOURCES_TEMPLATE } from "../../prompts/templates/sources-templates.prompt";
import { sourceSummarySchema } from "../../schemas/sources.schema";
import { fileTypeMappingsConfig } from "../../config/file-type-mappings.config";

/**
 * Type for source summary
 */
export type SourceSummaryType = z.infer<typeof sourceSummarySchema>;

/**
 * Responsible for LLM-based file summarization with strong typing and robust error handling.
 */
@injectable()
export class FileSummarizer {
  constructor(
    @inject(llmTokens.LLMRouter)
    private readonly llmRouter: LLMRouter,
  ) {}

  /**
   * Generate a strongly-typed summary for the given file content.
   * Throws an error if summarization fails.
   */
  async summarizeFile(filepath: string, type: string, content: string): Promise<SourceSummaryType> {
    try {
      if (content.trim().length === 0) throw new Error("File is empty");
      const canonicalFileType = this.getCanonicalFileType(filepath, type);
      const promptMetadata = fileTypePromptMetadata[canonicalFileType];
      const prompt = new Prompt(
        SOURCES_TEMPLATE,
        promptMetadata.contentDesc,
        promptMetadata.instructions,
        promptMetadata.responseSchema,
        content,
      ).render();
      const llmResponse = await this.llmRouter.executeCompletion<SourceSummaryType>(
        filepath,
        prompt,
        {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: promptMetadata.responseSchema,
          hasComplexSchema: promptMetadata.hasComplexSchema,
        },
      );
      if (llmResponse === null) throw new BadResponseContentLLMError("LLM returned null response");
      return llmResponse;
    } catch (error: unknown) {
      const errorMsg = `Failed to generate summary for '${filepath}'`;
      logErrorMsgAndDetail(errorMsg, error);
      throw error;
    }
  }

  /**
   * Derive the canonical file type for a given path and declared extension/suffix.
   * Encapsulates filename and extension based lookup logic.
   */
  private getCanonicalFileType(
    filepath: string,
    type: string,
  ): keyof typeof fileTypePromptMetadata {
    const filename = path.basename(filepath).toLowerCase();
    const byFilenameFileType =
      fileTypeMappingsConfig.FILENAME_TO_CANONICAL_TYPE_MAPPINGS.get(filename);
    const byExtensionFileType =
      fileTypeMappingsConfig.FILE_EXTENSION_TO_CANONICAL_TYPE_MAPPINGS.get(type.toLowerCase());
    return byFilenameFileType ?? byExtensionFileType ?? fileTypeMappingsConfig.DEFAULT_FILE_TYPE;
  }
}
