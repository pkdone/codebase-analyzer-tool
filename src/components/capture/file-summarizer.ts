import { injectable, inject } from "tsyringe";
import { z } from "zod";
import { logSingleLineWarning } from "../../common/utils/logging";
import type LLMRouter from "../../llm/llm-router";
import { llmTokens } from "../../di/tokens";
import { LLMOutputFormat } from "../../llm/types/llm.types";
import { BadResponseContentLLMError } from "../../llm/types/llm-errors.types";
import path from "node:path";
import { fileTypePromptMetadata } from "../../prompts/definitions/sources";
import { Prompt } from "../../prompts/prompt";
import { sourceSummarySchema } from "../../schemas/sources.schema";
import { FILE_TYPE_MAPPING_RULES } from "../../config/file-types.config";

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
      const prompt = new Prompt(promptMetadata);
      const renderedPrompt = prompt.render({ content });
      const llmResponse = await this.llmRouter.executeCompletion<SourceSummaryType>(
        filepath,
        renderedPrompt,
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
      logSingleLineWarning(errorMsg, error);
      throw error;
    }
  }

  /**
   * Derive the canonical file type for a given path and declared extension/suffix.
   * Uses the consolidated ordered list of file type mapping rules.
   */
  private getCanonicalFileType(
    filepath: string,
    type: string,
  ): keyof typeof fileTypePromptMetadata {
    const filename = path.basename(filepath).toLowerCase();
    const extension = type.toLowerCase();

    // Iterate through rules in order, returning the first match
    for (const rule of FILE_TYPE_MAPPING_RULES) {
      if (rule.test(filename, extension)) {
        return rule.type;
      }
    }

    // Fallback to default (should never reach here as last rule always matches)
    return "default";
  }
}
