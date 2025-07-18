import { llmConfig } from "../../../llm.config";
import BaseBedrockLLM from "../base-bedrock-llm";
import { BEDROCK_MISTRAL } from "./bedrock-mistral.manifest";
import { LLMCompletionOptions } from "../../../llm.types";

/**
 * Class for the AWS Bedrock Mistral LLMs.
 *
 */
export default class BedrockMistralLLM extends BaseBedrockLLM {
  /**
   * Get the model family this LLM implementation belongs to.
   */
  getModelFamily(): string {
    return BEDROCK_MISTRAL;
  }

  /**
   * Assemble the Bedrock parameters for Mistral completions only.
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
      temperature: llmConfig.DEFAULT_ZERO_TEMP,
      top_p: llmConfig.DEFAULT_TOP_P_LOWEST,
      max_tokens: this.llmModelsMetadata[modelKey].maxCompletionTokens,
    });
  }

  /**
   * Extract the relevant information from the completion LLM specific response.
   */
  protected extractCompletionModelSpecificResponse(
    llmResponse: MistralCompletionLLMSpecificResponse,
  ) {
    const firstResponse = llmResponse.choices[0];
    const responseContent = firstResponse.message?.content ?? null;
    const finishReason = firstResponse.stop_reason ?? firstResponse.finish_reason ?? "";
    const finishReasonLowercase = finishReason.toLowerCase();
    const isIncompleteResponse = finishReasonLowercase === "length" || !responseContent;
    const promptTokens = llmResponse.usage?.prompt_tokens ?? -1;
    const completionTokens = llmResponse.usage?.completion_tokens ?? -1;
    const maxTotalTokens = -1; // Not using "total_tokens" as that is total of prompt + completion tokens tokens and not the max limit
    const tokenUsage = { promptTokens, completionTokens, maxTotalTokens };
    return { isIncompleteResponse, responseContent, tokenUsage };
  }
}

/**
 * Type definitions for the Mistral specific completions LLM response usage.
 */
interface MistralCompletionLLMSpecificResponse {
  choices: [
    {
      message?: {
        content: string;
      };
      stop_reason?: string;
      finish_reason?: string;
    },
  ];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
}
