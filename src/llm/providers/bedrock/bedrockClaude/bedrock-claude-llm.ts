import { llmConfig } from "../../../llm.config";
import BaseBedrockLLM from "../base-bedrock-llm";
import { BEDROCK_CLAUDE } from "./bedrock-claude.manifest";
import { LLMCompletionOptions } from "../../../types/llm.types";
import { z } from "zod";

/**
 * Zod schema for Claude completion response validation
 */
const ClaudeCompletionResponseSchema = z.object({
  content: z.array(z.object({ text: z.string() })).optional(),
  stop_reason: z.string().optional(),
  usage: z
    .object({
      input_tokens: z.number().optional(),
      output_tokens: z.number().optional(),
    })
    .optional(),
});

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
   * Get the provider-specific response extraction configuration.
   */
  protected getResponseExtractionConfig() {
    return {
      schema: ClaudeCompletionResponseSchema,
      pathConfig: {
        contentPath: "content[0].text",
        promptTokensPath: "usage.input_tokens",
        completionTokensPath: "usage.output_tokens",
        stopReasonPath: "stop_reason",
        stopReasonValueForLength: "length",
      },
      providerName: "Claude",
    };
  }
}
