import { injectable, inject } from "tsyringe";
import { getErrorText, logErrorMsgAndDetail } from "../../common/utils/error-utils";
import type LLMRouter from "../../llm/core/llm-router";
import { TOKENS } from "../../di/tokens";
import { SourceSummaryType } from "../../schemas/source-summaries.schema";
import { LLMOutputFormat } from "../../llm/llm.types";
import { FileHandlerFactory } from "./file-handler-factory";

// Result type for better error handling
export type SummaryResult<T = SourceSummaryType> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Responsible for LLM-based file summarization with strong typing and robust error handling.
 * Uses FileHandlerFactory to separate concerns and follow the Single Responsibility Principle.
 */
@injectable()
export class FileSummarizer {
  constructor(
    @inject(TOKENS.LLMRouter)
    private readonly llmRouter: LLMRouter,
    @inject(TOKENS.FileHandlerFactory)
    private readonly fileHandlerFactory: FileHandlerFactory,
  ) {}

  /**
   * Generate a strongly-typed summary for the given file content.
   */
  async getFileSummaryAsJSON(
    filepath: string,
    type: string,
    content: string,
  ): Promise<SummaryResult> {
    try {
      if (content.trim().length === 0) return { success: false, error: "File is empty" };

      // Use the factory to get the appropriate handler
      const handler = this.fileHandlerFactory.createHandler(filepath, type);
      const prompt = handler.createPrompt(content);

      const llmResponse = await this.llmRouter.executeCompletion<SourceSummaryType>(
        filepath,
        prompt,
        {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: handler.schema,
          trickySchema: handler.trickySchema,
        },
      );

      if (llmResponse === null) {
        return { success: false, error: "LLM returned null response" };
      }

      return { success: true, data: llmResponse };
    } catch (error) {
      const errorMsg = `Failed to generate summary for '${filepath}'`;
      logErrorMsgAndDetail(errorMsg, error);
      return { success: false, error: `${errorMsg}: ${getErrorText(error)}` };
    }
  }
}
