import { llmConfig } from "../../../config/llm.config";
import BaseBedrockLLM from "../common/base-bedrock-llm";
import { z } from "zod";
import { isBedrockLlamaProviderConfig } from "./bedrock-llama.types";
import {
  LLAMA_BEGIN_TOKEN,
  LLAMA_HEADER_START_TOKEN,
  LLAMA_HEADER_END_TOKEN,
  LLAMA_EOT_TOKEN,
  LLAMA_SYSTEM_MESSAGE,
} from "./bedrock-llama.constants";

/**
 * Zod schema for Llama completion response validation
 */
const LlamaCompletionResponseSchema = z.object({
  generation: z.string().optional(),
  stop_reason: z.string().optional(),
  prompt_token_count: z.number().optional(),
  generation_token_count: z.number().optional(),
});

/**
 * Class for the AWS Bedrock Llama LLMs.
 *
 */
export default class BedrockLlamaLLM extends BaseBedrockLLM {
  /**
   * Build the request body object for Llama completions.
   */
  protected override buildCompletionRequestBody(modelKey: string, prompt: string) {
    // Bedrock providers don't support JSON mode options
    const formattedPrompt = `${LLAMA_BEGIN_TOKEN}${LLAMA_HEADER_START_TOKEN}${llmConfig.LLM_ROLE_SYSTEM}${LLAMA_HEADER_END_TOKEN}
${LLAMA_SYSTEM_MESSAGE}${LLAMA_EOT_TOKEN}
${LLAMA_HEADER_START_TOKEN}${llmConfig.LLM_ROLE_USER}${LLAMA_HEADER_END_TOKEN}${prompt}${LLAMA_EOT_TOKEN}${LLAMA_HEADER_START_TOKEN}${llmConfig.LLM_ROLE_ASSISTANT}${LLAMA_HEADER_END_TOKEN}`;

    const bodyObj: { prompt: string; temperature: number; top_p: number; max_gen_len?: number } = {
      prompt: formattedPrompt,
      temperature: llmConfig.DEFAULT_ZERO_TEMP,
      top_p: llmConfig.DEFAULT_TOP_P_LOWEST,
    };

    // Use type guard for type-safe access to maxGenLenCap
    if (isBedrockLlamaProviderConfig(this.providerSpecificConfig)) {
      const maxCompletionTokens =
        this.llmModelsMetadata[modelKey].maxCompletionTokens ??
        this.providerSpecificConfig.maxGenLenCap;
      bodyObj.max_gen_len = Math.min(maxCompletionTokens, this.providerSpecificConfig.maxGenLenCap);
    }

    return bodyObj;
  }

  /**
   * Get the provider-specific response extraction configuration.
   */
  protected getResponseExtractionConfig() {
    return {
      schema: LlamaCompletionResponseSchema,
      pathConfig: {
        contentPath: "generation",
        promptTokensPath: "prompt_token_count",
        completionTokensPath: "generation_token_count",
        stopReasonPath: "stop_reason",
        stopReasonValueForLength: "length",
      },
      providerName: "Llama",
    };
  }
}
