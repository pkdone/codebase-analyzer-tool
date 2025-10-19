import { injectable, inject } from "tsyringe";
import { z } from "zod";
import { logErrorMsgAndDetail } from "../../common/utils/logging";
import type LLMRouter from "../../llm/core/llm-router";
import { TOKENS } from "../../tokens";
import { LLMOutputFormat } from "../../llm/types/llm.types";
import { BadResponseContentLLMError } from "../../llm/types/llm-errors.types";
// Inlined file type resolution (was resolveFileType in file-type-resolver.ts)
import path from "node:path";
import { fileTypePromptMetadata } from "../../promptTemplates/sources.prompts";
import { createPromptFromConfig } from "../../llm/utils/prompt-templator";
import { sourceSummarySchema } from "../../schemas/sources.schema";
import { fileTypesToCanonicalMappings } from "../../promptTemplates/prompt.types";

/**
 * Type for source summary
 */
export type SourceSummaryType = z.infer<typeof sourceSummarySchema>;

// Base template for detailed file summary prompts
const SOURCES_SUMMARY_CAPTURE_TEMPLATE = `Act as a programmer. Take the {{contentDesc}} shown below in the section marked 'CODE' and based on its content, return a JSON response containing data that includes the following:

{{specificInstructions}}

The JSON response must follow this JSON schema:
\`\`\`json
{{jsonSchema}}
\`\`\`

{{forceJSON}}

CODE:
{{codeContent}}`;

/**
 * Responsible for LLM-based file summarization with strong typing and robust error handling.
 * File type resolution and prompt metadata lookup are performed inline (previously delegated to PromptConfigFactory).
 */
@injectable()
export class FileSummarizer {
  constructor(
    @inject(TOKENS.LLMRouter)
    private readonly llmRouter: LLMRouter,
  ) {}

  /**
   * Generate a strongly-typed summary for the given file content.
   * Throws an error if summarization fails.
   */
  async summarizeFile(filepath: string, type: string, content: string): Promise<SourceSummaryType> {
    try {
      if (content.trim().length === 0) throw new Error("File is empty");
      const filename = path.basename(filepath).toLowerCase();
      const byFilename = fileTypesToCanonicalMappings.FILENAME_TO_CANONICAL_TYPE_MAPPINGS.get(filename);
      const byExtension = fileTypesToCanonicalMappings.FILE_EXTENSION_TO_CANONICAL_TYPE_MAPPINGS.get(type.toLowerCase());
      const canonicalFileType: keyof typeof fileTypePromptMetadata = byFilename ?? byExtension ?? fileTypesToCanonicalMappings.DEFAULT_FILE_TYPE;
      const config = fileTypePromptMetadata[canonicalFileType];
      const prompt = createPromptFromConfig(
        SOURCES_SUMMARY_CAPTURE_TEMPLATE,
        config.contentDesc,
        config.instructions,
        config.schema,
        content,
      );
      const llmResponse = await this.llmRouter.executeCompletion<SourceSummaryType>(
        filepath,
        prompt,
        {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: config.schema,
          hasComplexSchema: config.hasComplexSchema,
        },
      );
      if (llmResponse === null) throw new BadResponseContentLLMError("LLM returned null response");
      return llmResponse;
    } catch (error: unknown) {
      const errorMsg = `Failed to generate summary for '${filepath}'`;
      logErrorMsgAndDetail(errorMsg, error);
      throw error; // Re-throw the original error
    }
  }
}
