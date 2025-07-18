import { llmConfig } from "../../../llm.config";
import BaseBedrockLLM from "../base-bedrock-llm";
import { BEDROCK_CLAUDE } from "./bedrock-claude.manifest";
import { LLMCompletionOptions } from "../../../llm.types";

/**
 * Class for the AWS Bedrock [Anthropic] Claude LLMs.
 */
export default class BedrockClaudeLLM extends BaseBedrockLLM {
  /**
   * Get the model family this LLM implementation belongs to.
   */
  getModelFamily(): string {
    return BEDROCK_CLAUDE;
  }

  /**
   * Assemble the Bedrock parameters for Claude completions only.
   */
  protected buildCompletionModelSpecificParameters(
    modelKey: string,
    prompt: string,
    options?: LLMCompletionOptions,
  ) {
    void options; // Bedrock providers don't support JSON mode options
    const config = this.providerSpecificConfig;
    return JSON.stringify({
      anthropic_version: config.apiVersion,
      messages: [
        {
          role: llmConfig.LLM_ROLE_USER,
          content: [
            {
              type: "text",
              text: prompt,
            },
          ],
        },
      ],
      temperature: config.temperature ?? llmConfig.DEFAULT_ZERO_TEMP,
      top_p: config.topP ?? llmConfig.DEFAULT_TOP_P_LOWEST,
      top_k: config.topK ?? llmConfig.DEFAULT_TOP_K_LOWEST,
      max_tokens: this.llmModelsMetadata[modelKey].maxCompletionTokens,
    });
  }

  /**
   * Extract the relevant information from the completion LLM specific response.
   */
  protected extractCompletionModelSpecificResponse(
    llmResponse: ClaudeCompletionLLMSpecificResponse,
  ) {
    const responseContent = llmResponse.content?.[0]?.text ?? "";
    const finishReason = llmResponse.stop_reason ?? "";
    const finishReasonLowercase = finishReason.toLowerCase();
    const isIncompleteResponse = finishReasonLowercase === "length" || !responseContent; // No content - assume prompt maxed out total tokens available
    const promptTokens = llmResponse.usage?.input_tokens ?? -1;
    const completionTokens = llmResponse.usage?.output_tokens ?? -1;
    const maxTotalTokens = -1; // Not using "total_tokens" as that is total of prompt + completion tokens tokens and not the max limit
    const tokenUsage = { promptTokens, completionTokens, maxTotalTokens };
    return { isIncompleteResponse, responseContent, tokenUsage };
  }
}

/**
 * Type definitions for the Claude specific completions LLM response usage.
 */
interface ClaudeCompletionLLMSpecificResponse {
  content?: { text: string }[];
  stop_reason?: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
}
