import BaseBedrockLLM from "./base-bedrock-llm";
import { buildStandardMessagesArray } from "../utils/bedrock-request-builders";

/**
 * Base class for Bedrock LLM providers that use the standard messages array format.
 * This class provides a concrete implementation of `buildCompletionRequestBody` that
 * delegates to `buildStandardMessagesArray`, eliminating code duplication in providers
 * like BedrockDeepseekLLM and BedrockMistralLLM.
 */
export default abstract class StandardMessagesBedrockLLM extends BaseBedrockLLM {
  /**
   * Build the request body object for completions using the standard messages array format.
   * This implementation delegates to `buildStandardMessagesArray` which is shared
   * across multiple Bedrock providers.
   */
  protected buildCompletionRequestBody(modelKey: string, prompt: string) {
    // Bedrock providers don't support JSON mode options
    return buildStandardMessagesArray(prompt, modelKey, this.llmModelsMetadata);
  }
}
