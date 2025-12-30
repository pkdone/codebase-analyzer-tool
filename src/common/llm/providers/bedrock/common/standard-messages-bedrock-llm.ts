import BaseBedrockLLM from "./base-bedrock-llm";
import { buildStandardMessagesArray } from "../utils/bedrock-request-builders";

/**
 * Base class for Bedrock LLM providers that use the standard messages array format.
 *
 * This class extends BaseBedrockLLM and provides a common implementation of
 * `buildCompletionRequestBody` that uses the standard messages format with:
 * - messages: [{ role: "user", content: prompt }]
 * - max_tokens, temperature, top_p
 *
 * Providers like Deepseek and Mistral that follow this pattern should extend
 * this class instead of BaseBedrockLLM directly. They only need to implement
 * `getResponseExtractionConfig()` with their specific response schema and paths.
 */
export default abstract class StandardMessagesBedrockLLM extends BaseBedrockLLM {
  /**
   * Build the request body object using standard messages format.
   * This is shared by providers that use the OpenAI-style messages array.
   */
  protected override buildCompletionRequestBody(modelKey: string, prompt: string) {
    return buildStandardMessagesArray(prompt, modelKey, this.llmModelsMetadata);
  }
}
