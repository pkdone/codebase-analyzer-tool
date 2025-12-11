import { injectable } from "tsyringe";
import { llmConfig } from "../llm.config";
import { LLMFunctionResponse, ResolvedLLMModelMetadata } from "../types/llm.types";
import { BadResponseMetadataLLMError } from "../types/llm-errors.types";

/**
 * Strategy class responsible for handling prompt adaptation.
 * Reduces prompt size based on token limit calculations when token limits are exceeded.
 */
@injectable()
export class PromptAdaptationStrategy {
  /**
   * Adapts a prompt based on LLM response feedback (typically when token limits are exceeded).
   * Reduces prompt size based on token limit calculations.
   * Accepts a generic LLMFunctionResponse to maintain type safety through the call chain.
   *
   * @param prompt The original prompt that needs to be adapted
   * @param llmResponse The LLM response containing token usage information
   * @param modelsMetadata Metadata about available LLM models
   * @returns The adapted prompt
   */
  adaptPromptFromResponse<T = unknown>(
    prompt: string,
    llmResponse: LLMFunctionResponse<T>,
    modelsMetadata: Record<string, ResolvedLLMModelMetadata>,
  ): string {
    if (!llmResponse.tokensUsage) {
      throw new BadResponseMetadataLLMError(
        "LLM response indicated token limit exceeded but `tokensUsage` is not present",
        llmResponse,
      );
    }

    if (prompt.trim() === "") return prompt;
    const { promptTokens, completionTokens, maxTotalTokens } = llmResponse.tokensUsage;
    const maxCompletionTokensLimit = modelsMetadata[llmResponse.modelKey].maxCompletionTokens;
    let reductionRatio = 1;

    // If all the LLM's available completion tokens have been consumed then will need to reduce prompt size to try influence any subsequent generated completion to be smaller
    if (
      maxCompletionTokensLimit &&
      completionTokens >= maxCompletionTokensLimit - llmConfig.COMPLETION_MAX_TOKENS_LIMIT_BUFFER
    ) {
      reductionRatio = Math.min(
        maxCompletionTokensLimit / (completionTokens + 1),
        llmConfig.MAX_COMPLETION_REDUCTION_RATIO,
      );
    }

    // If the total tokens used is more than the total tokens available then reduce the prompt size proportionally
    if (reductionRatio >= 1) {
      reductionRatio = Math.min(
        maxTotalTokens / (promptTokens + completionTokens + 1),
        llmConfig.MAX_PROMPT_REDUCTION_RATIO,
      );
    }

    const newPromptSize = Math.floor(prompt.length * reductionRatio);
    return prompt.substring(0, newPromptSize);
  }
}
