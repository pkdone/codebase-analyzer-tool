import { injectable, inject } from "tsyringe";
import { z } from "zod";
import { logErrorMsgAndDetail } from "../../common/utils/logging";
import type LLMRouter from "../../llm/core/llm-router";
import { TOKENS } from "../../di/tokens";
import { LLMOutputFormat } from "../../llm/types/llm.types";
import { BadResponseContentLLMError } from "../../llm/types/llm-errors.types";
import { PromptConfigFactory } from "./prompt-config-factory";
import { createPromptFromConfig } from "../../llm/utils/prompt-templator";
import { sourceSummarySchema } from "../../schemas/sources.schema";

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
 * Uses PromptConfigFactory to separate concerns and follow the Single Responsibility Principle.
 */
@injectable()
export class FileSummarizer {
  constructor(
    @inject(TOKENS.LLMRouter)
    private readonly llmRouter: LLMRouter,
    @inject(TOKENS.PromptConfigFactory)
    private readonly promptConfigFactory: PromptConfigFactory,
  ) {}

  /**
   * Generate a strongly-typed summary for the given file content.
   * Throws an error if summarization fails.
   */
  async getFileSummaryAsJSON(
    filepath: string,
    type: string,
    content: string,
  ): Promise<SourceSummaryType> {
    try {
      if (content.trim().length === 0) throw new Error("File is empty");
      const config = this.promptConfigFactory.createConfig(filepath, type);
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
