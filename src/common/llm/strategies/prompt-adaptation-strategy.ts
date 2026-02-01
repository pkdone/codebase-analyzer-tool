import { llmConfig } from "../config/llm.config";
import { LLMFunctionResponse } from "../types/llm-response.types";
import { ResolvedLLMModelMetadata } from "../types/llm-model.types";
import { LLMError, LLMErrorCode } from "../types/llm-errors.types";

/**
 * Adapts a prompt based on LLM response feedback (typically when token limits are exceeded).
 * This is a pure function that reduces prompt size based on token limit calculations.
 *
 * @param prompt The original prompt that needs to be adapted
 * @param llmResponse The LLM response containing token usage information
 * @param modelsMetadata Metadata about available LLM models
 * @returns The adapted (shortened) prompt
 * @throws {BadResponseMetadataLLMError} If token usage information is missing from the response
 */
export function adaptPromptFromResponse(
  prompt: string,
  llmResponse: LLMFunctionResponse,
  modelsMetadata: Record<string, ResolvedLLMModelMetadata>,
): string {
  if (!llmResponse.tokensUsage) {
    throw new LLMError(
      LLMErrorCode.BAD_RESPONSE_METADATA,
      "LLM response indicated token limit exceeded but `tokensUsage` is not present",
      llmResponse,
    );
  }

  if (prompt.trim() === "") return prompt;
  const { promptTokens = 0, completionTokens = 0, maxTotalTokens = 0 } = llmResponse.tokensUsage;
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
  if (reductionRatio >= 1 && maxTotalTokens > 0) {
    reductionRatio = Math.min(
      maxTotalTokens / (promptTokens + completionTokens + 1),
      llmConfig.MAX_PROMPT_REDUCTION_RATIO,
    );
  }

  const newPromptSize = Math.floor(prompt.length * reductionRatio);
  return prompt.substring(0, newPromptSize);
}
