import { llmConfig } from "../../../llm.config";
import type { ResolvedLLMModelMetadata } from "../../../types/llm.types";

/**
 * Builds a standard messages array for Bedrock completion requests.
 * Used by providers that follow the standard messages + temperature + top_p + max_tokens pattern.
 *
 * This helper reduces duplication in BedrockDeepseekLLM and BedrockMistralLLM implementations.
 *
 * @param prompt The prompt text to include in the messages array
 * @param modelKey The model key to look up metadata
 * @param modelsMetadata The models metadata dictionary
 * @returns A request body object with messages, max_tokens, temperature, and top_p
 */
export function buildStandardMessagesArray(
  prompt: string,
  modelKey: string,
  modelsMetadata: Record<string, ResolvedLLMModelMetadata>,
): {
  messages: { role: string; content: string }[];
  max_tokens: number;
  temperature: number;
  top_p: number;
} {
  const maxCompletionTokens = modelsMetadata[modelKey].maxCompletionTokens;
  if (maxCompletionTokens === undefined) {
    throw new Error(`maxCompletionTokens is undefined for model key: ${modelKey}`);
  }

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
