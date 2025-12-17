import { llmConfig } from "../../../config/llm.config";
import BaseBedrockLLM from "../common/base-bedrock-llm";
import { z } from "zod";
import { BedrockLlamaProviderConfigSchema } from "./bedrock-llama.types";

/**
 * Configuration constants for AWS Bedrock Llama models.
 * Contains chat template tokens and formatting constants specific to Llama.
 */
const LLAMA_BEGIN_TOKEN = "<|begin_of_text|>";
const LLAMA_HEADER_START_TOKEN = "<|start_header_id|>";
const LLAMA_HEADER_END_TOKEN = "<|end_header_id|>";
const LLAMA_EOT_TOKEN = "<|eot_id|>";
const LLAMA_SYSTEM_MESSAGE =
  "You are a helpful software engineering and programming assistant, and you need to answer the question given without attempting to fill in any blanks in the question";

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
  protected buildCompletionRequestBody(modelKey: string, prompt: string) {
    // Bedrock providers don't support JSON mode options
    const formattedPrompt = `${LLAMA_BEGIN_TOKEN}${LLAMA_HEADER_START_TOKEN}${llmConfig.LLM_ROLE_SYSTEM}${LLAMA_HEADER_END_TOKEN}
${LLAMA_SYSTEM_MESSAGE}${LLAMA_EOT_TOKEN}
${LLAMA_HEADER_START_TOKEN}${llmConfig.LLM_ROLE_USER}${LLAMA_HEADER_END_TOKEN}${prompt}${LLAMA_EOT_TOKEN}${LLAMA_HEADER_START_TOKEN}${llmConfig.LLM_ROLE_ASSISTANT}${LLAMA_HEADER_END_TOKEN}`;

    const bodyObj: { prompt: string; temperature: number; top_p: number; max_gen_len?: number } = {
      prompt: formattedPrompt,
      temperature: llmConfig.DEFAULT_ZERO_TEMP,
      top_p: llmConfig.DEFAULT_TOP_P_LOWEST,
    };

    // Declarative cap based on manifest feature flag rather than brittle string checks.
    const hasCapFeature = this.llmFeatures?.includes("CAP_MAX_GEN_LEN") ?? false;
    if (hasCapFeature) {
      // Validate and parse provider-specific config with Zod schema for type safety
      const config = BedrockLlamaProviderConfigSchema.parse(this.providerSpecificConfig);
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
