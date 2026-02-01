import { llmConfig } from "../../../config/llm.config";
import type { JsonObject } from "../../../types/json-value.types";

/**
 * Builds a standard messages array for Bedrock completion requests.
 * Used by providers that follow the standard messages + temperature + top_p + max_tokens pattern.
 *
 * This helper reduces duplication in BedrockDeepseekLLM and BedrockMistralLLM implementations.
 *
 * @param prompt The prompt text to include in the messages array
 * @param maxCompletionTokens The validated max completion tokens value
 * @returns A request body object with messages, max_tokens, temperature, and top_p
 */
export function buildStandardMessagesArray(
  prompt: string,
  maxCompletionTokens: number,
): JsonObject {
  return {
    messages: [
      {
        role: llmConfig.LLM_ROLE_USER,
        content: prompt,
      },
    ],
    max_tokens: maxCompletionTokens,
    temperature: llmConfig.DEFAULT_ZERO_TEMP,
    top_p: llmConfig.DEFAULT_TOP_P_LOWEST,
  };
}
