import { llmConfig } from "../../../llm.config";
import BaseBedrockLLM from "../common/base-bedrock-llm";
import { BEDROCK_LLAMA } from "./bedrock-llama.manifest";
import { bedrockLlamaConfig } from "./bedrock-llama.config";
import { z } from "zod";
import type { LLMProviderSpecificConfig } from "../../llm-provider.types";

/**
 * Type-safe configuration interface for Llama provider
 */
interface LlamaProviderConfig extends LLMProviderSpecificConfig {
  maxGenLenCap: number;
}

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
   * Get the model family this LLM implementation belongs to.
   */
  getModelFamily(): string {
    return BEDROCK_LLAMA;
  }

  /**
   * Build the request body object for Llama completions.
   */
  protected buildCompletionRequestBody(modelKey: string, prompt: string) {
    // Bedrock providers don't support JSON mode options
    const formattedPrompt = `${bedrockLlamaConfig.LLAMA_BEGIN_TOKEN}${bedrockLlamaConfig.LLAMA_HEADER_START_TOKEN}${llmConfig.LLM_ROLE_SYSTEM}${bedrockLlamaConfig.LLAMA_HEADER_END_TOKEN}
${bedrockLlamaConfig.LLAMA_SYSTEM_MESSAGE}${bedrockLlamaConfig.LLAMA_EOT_TOKEN}
${bedrockLlamaConfig.LLAMA_HEADER_START_TOKEN}${llmConfig.LLM_ROLE_USER}${bedrockLlamaConfig.LLAMA_HEADER_END_TOKEN}${prompt}${bedrockLlamaConfig.LLAMA_EOT_TOKEN}${bedrockLlamaConfig.LLAMA_HEADER_START_TOKEN}${llmConfig.LLM_ROLE_ASSISTANT}${bedrockLlamaConfig.LLAMA_HEADER_END_TOKEN}`;

    const bodyObj: { prompt: string; temperature: number; top_p: number; max_gen_len?: number } = {
      prompt: formattedPrompt,
      temperature: llmConfig.DEFAULT_ZERO_TEMP,
      top_p: llmConfig.DEFAULT_TOP_P_LOWEST,
    };

    // Currently for v3 and lower Llama LLMs, getting this error even though left to their own devices they seem to happily default to max completions of 8192: Malformed input request: #/max_gen_len: 8192 is not less or equal to 2048, please reformat your input and try again. ValidationException: Malformed input request: #/max_gen_len: 8192 is not less or equal to 2048, please reformat your input and try again.
    // The check is broadened to include any model key containing "LLAMA" as the issue affects multiple Llama versions on Bedrock.
    if (modelKey.includes("LLAMA")) {
      // Cap the max_gen_len to respect the Bedrock API limit for these models.
      const config = this.providerSpecificConfig as LlamaProviderConfig;
      const maxGenLenCap = config.maxGenLenCap;
      const maxCompletionTokens =
        this.llmModelsMetadata[modelKey].maxCompletionTokens ?? maxGenLenCap;
      bodyObj.max_gen_len = Math.min(maxCompletionTokens, maxGenLenCap);
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
