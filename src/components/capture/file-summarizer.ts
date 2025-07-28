import { injectable, inject } from "tsyringe";
import { logErrorMsgAndDetail } from "../../common/utils/error-utils";
import type LLMRouter from "../../llm/core/llm-router";
import { TOKENS } from "../../di/tokens";
import { LLMOutputFormat } from "../../llm/types/llm.types";
import { BadResponseContentLLMError } from "../../llm/types/llm-errors.types";
import { FileHandlerFactory } from "./file-handler-factory";
import { SourceSummaryType } from "./file-handler";

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
   * Throws an error if summarization fails.
   */
  async getFileSummaryAsJSON(
    filepath: string,
    type: string,
    content: string,
  ): Promise<SourceSummaryType> {
    try {
      if (content.trim().length === 0) throw new Error("File is empty");
      const handler = this.fileHandlerFactory.createHandler(filepath, type);
      const prompt = handler.createPrompt(content);
      const llmResponse = await this.llmRouter.executeCompletion<SourceSummaryType>(
        filepath,
        prompt,
        {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: handler.schema,
          hasComplexSchema: handler.hasComplexSchema,
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
