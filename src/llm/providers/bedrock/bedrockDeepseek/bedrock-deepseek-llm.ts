import { llmConfig } from "../../../llm.config";
import BaseBedrockLLM from "../base-bedrock-llm";
import { BEDROCK_DEEPSEEK } from "./bedrock-deepseek.manifest";
import { LLMCompletionOptions } from "../../../llm.types";

/**
 * Class for the AWS Bedrock [Anthropic] Claude LLMs.
 */
export default class BedrockDeepseekLLM extends BaseBedrockLLM {
  /**
   * Get the model family this LLM implementation belongs to.
   */
  getModelFamily(): string {
    return BEDROCK_DEEPSEEK;
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
    return JSON.stringify({
      messages: [
        {
          role: llmConfig.LLM_ROLE_USER,
          content: prompt,
        },
      ],
      max_tokens: this.llmModelsMetadata[modelKey].maxCompletionTokens,
      temperature: llmConfig.DEFAULT_ZERO_TEMP,
      top_p: llmConfig.DEFAULT_TOP_P_LOWEST,
    });
  }

  /**
   * Extract the relevant information from the completion LLM specific response.
   */
  protected extractCompletionModelSpecificResponse(
    llmResponse: DeepseekCompletionLLMSpecificResponse,
  ) {
    const responseMsg = llmResponse.choices?.[0]?.message;
    const responseContent = responseMsg?.content ?? responseMsg?.reasoning_content ?? null;
    const finishReason = llmResponse.choices?.[0]?.stop_reason ?? "";
    const finishReasonLowercase = finishReason.toLowerCase();
    const isIncompleteResponse = finishReasonLowercase === "length" || !responseContent;
    const promptTokens = llmResponse.usage?.inputTokens ?? -1;
    const completionTokens = llmResponse.usage?.outputTokens ?? -1;
    const maxTotalTokens = -1;
    const tokenUsage = { promptTokens, completionTokens, maxTotalTokens };
    return { isIncompleteResponse, responseContent, tokenUsage };
  }
}

/**
 * Type definitions for the Deepseek specific completions LLM response usage.
 */
interface DeepseekCompletionLLMSpecificResponse {
  choices?: [
    {
      message?: {
        content?: string;
        reasoning_content?: string;
      };
      stop_reason?: string;
    },
  ];
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
  };
}
