import { llmConfig } from "../../../llm.config";
import BaseBedrockLLM from "../base-bedrock-llm";
import { BEDROCK_NOVA } from "./bedrock-nova.manifest";
import { LLMCompletionOptions } from "../../../llm.types";

/**
 * Class for the AWS Bedrock Nova LLMs.
 */
export default class BedrockNovaLLM extends BaseBedrockLLM {
  /**
   * Get the model family this LLM implementation belongs to.
   */
  getModelFamily(): string {
    return BEDROCK_NOVA;
  }

  /**
   * Assemble the Bedrock parameters for Nova completions only.
   */
  protected buildCompletionModelSpecificParameters(
    modelKey: string,
    prompt: string,
    options?: LLMCompletionOptions,
  ) {
    void options; // Bedrock providers don't support JSON mode options
    return JSON.stringify({
      inferenceConfig: {
        max_new_tokens: this.llmModelsMetadata[modelKey].maxCompletionTokens,
        temperature: llmConfig.DEFAULT_ZERO_TEMP,
        top_p: llmConfig.DEFAULT_TOP_P_LOWEST,
        top_k: llmConfig.DEFAULT_TOP_K_LOWEST,
      },
      messages: [
        {
          role: llmConfig.LLM_ROLE_USER,
          content: [
            {
              text: prompt,
            },
          ],
        },
      ],
    });
  }

  /**
   * Extract the relevant information from the completion LLM specific response.
   */
  protected extractCompletionModelSpecificResponse(llmResponse: NovaCompletionLLMSpecificResponse) {
    const responseContent = llmResponse.output.message?.content?.[0]?.text ?? null;
    const finishReason = llmResponse.stopReason ?? "";
    const finishReasonLowercase = finishReason.toLowerCase();
    const isIncompleteResponse = finishReasonLowercase === "max_tokens" || !responseContent;
    const promptTokens = llmResponse.usage?.inputTokens ?? -1;
    const completionTokens = llmResponse.usage?.outputTokens ?? -1;
    const maxTotalTokens = -1; // Not using "total_tokens" as that is total of prompt + completion tokens tokens and not the max limit
    const tokenUsage = { promptTokens, completionTokens, maxTotalTokens };
    return { isIncompleteResponse, responseContent, tokenUsage };
  }
}

/**
 * Type definitions for the Nova specific completions LLM response usage.
 */
interface NovaCompletionLLMSpecificResponse {
  output: {
    message?: {
      content?: [
        {
          text: string;
        },
      ];
    };
  };
  stopReason?: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
  };
}
