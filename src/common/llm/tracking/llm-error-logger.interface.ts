import type { LLMContext, LLMGeneratedContent } from "../types/llm.types";

/**
 * Interface for error logging services.
 * Decouples the LLM provider abstraction from the concrete error logger implementation,
 * enabling better testability and flexibility.
 */
export interface IErrorLogger {
  /**
   * Records a JSON processing error to a file for debugging purposes.
   *
   * @param error - The error that occurred during JSON processing
   * @param responseContent - The LLM response content that failed to parse
   * @param context - The LLM context containing resource information
   */
  recordJsonProcessingError(
    error: unknown,
    responseContent: LLMGeneratedContent,
    context: LLMContext,
  ): Promise<void>;
}
