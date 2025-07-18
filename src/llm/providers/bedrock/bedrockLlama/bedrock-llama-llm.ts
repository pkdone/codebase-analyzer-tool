import { llmConfig } from "../../../llm.config";
import BaseBedrockLLM from "../base-bedrock-llm";
import { BEDROCK_LLAMA, AWS_COMPLETIONS_LLAMA_V31_405B_INSTRUCT } from "./bedrock-llama.manifest";
import { LLMCompletionOptions } from "../../../llm.types";

/**
 * Class for the AWS Bedrock Llama LLMs.
 *
 */
export default class BedrockLlamaLLM extends BaseBedrockLLM {
  /**
   * Get the model family this LLM implementation belongs to.
   */
  getModelFamily(): string {
    return BEDROCK_LLAMA;
  }

  /**
   * Assemble the Bedrock parameters for Llama completions only.
   */
  protected buildCompletionModelSpecificParameters(
    modelKey: string,
    prompt: string,
    options?: LLMCompletionOptions,
  ) {
    void options; // Bedrock providers don't support JSON mode options
    const bodyObj: { prompt: string; temperature: number; top_p: number; max_gen_len?: number } = {
      prompt: `<|begin_of_text|><|start_header_id|>${llmConfig.LLM_ROLE_SYSTEM}<|end_header_id|>
You are a helpful software engineering and programming assistant, and you need to answer the question given without attempting to fill in any blanks in the question<|eot_id|>
<|start_header_id|>${llmConfig.LLM_ROLE_USER}<|end_header_id|>${prompt}<|eot_id|><|start_header_id|>${llmConfig.LLM_ROLE_ASSISTANT}<|end_header_id|>`,
      temperature: llmConfig.DEFAULT_ZERO_TEMP,
      top_p: llmConfig.DEFAULT_TOP_P_LOWEST,
    };

    // Currently for v3 and lower Llama LLMs, getting this error even though left to their own devices they seem to happily default to max completions of 8192: Malformed input request: #/max_gen_len: 8192 is not less or equal to 2048, please reformat your input and try again. ValidationException: Malformed input request: #/max_gen_len: 8192 is not less or equal to 2048, please reformat your input and try again.
    if (modelKey === AWS_COMPLETIONS_LLAMA_V31_405B_INSTRUCT) {
      bodyObj.max_gen_len = this.llmModelsMetadata[modelKey].maxCompletionTokens;
    }

    return JSON.stringify(bodyObj);
  }

  /**
   * Extract the relevant information from the completion LLM specific response.
   */
  protected extractCompletionModelSpecificResponse(
    llmResponse: LlamaCompletionLLMSpecificResponse,
  ) {
    const responseContent = llmResponse.generation ?? "";
    const finishReason = llmResponse.stop_reason ?? "";
    const finishReasonLowercase = finishReason.toLowerCase();
    const isIncompleteResponse = finishReasonLowercase === "length" || !responseContent; // No content - assume prompt maxed out total tokens available
    const promptTokens = llmResponse.prompt_token_count ?? -1;
    const completionTokens = llmResponse.generation_token_count ?? -1;
    const maxTotalTokens = -1;
    const tokenUsage = { promptTokens, completionTokens, maxTotalTokens };
    return { isIncompleteResponse, responseContent, tokenUsage };
  }
}

/**
 * Type definitions for the Llama specific completions LLM response usage.
 */
interface LlamaCompletionLLMSpecificResponse {
  generation?: string;
  stop_reason?: string;
  prompt_token_count?: number;
  generation_token_count?: number;
}
