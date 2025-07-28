import { llmConfig } from "../../../llm.config";
import BaseBedrockLLM from "../base-bedrock-llm";
import { BEDROCK_CLAUDE } from "./bedrock-claude.manifest";
import { LLMCompletionOptions } from "../../../types/llm.types";
import { z } from "zod";
import { BadResponseContentLLMError } from "../../../types/llm-errors.types";

/**
 * Zod schema for Claude completion response validation
 */
const ClaudeCompletionResponseSchema = z.object({
  content: z.array(z.object({ text: z.string() })).optional(),
  stop_reason: z.string().optional(),
  usage: z.object({
    input_tokens: z.number().optional(),
    output_tokens: z.number().optional(),
  }).optional(),
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
   * Extract the relevant information from the completion LLM specific response.
   */
  protected extractCompletionModelSpecificResponse(
    llmResponse: unknown,
  ) {
    const validation = ClaudeCompletionResponseSchema.safeParse(llmResponse);
    if (!validation.success) {
      throw new BadResponseContentLLMError("Invalid Claude response structure", llmResponse);
    }
    const response = validation.data;
    
    const responseContent = response.content?.[0]?.text ?? "";
    const finishReason = response.stop_reason ?? "";
    const finishReasonLowercase = finishReason.toLowerCase();
    const isIncompleteResponse = finishReasonLowercase === "length" || !responseContent; // No content - assume prompt maxed out total tokens available
    const promptTokens = response.usage?.input_tokens ?? -1;
    const completionTokens = response.usage?.output_tokens ?? -1;
    const maxTotalTokens = -1; // Not using "total_tokens" as that is total of prompt + completion tokens tokens and not the max limit
    const tokenUsage = { promptTokens, completionTokens, maxTotalTokens };
    return { isIncompleteResponse, responseContent, tokenUsage };
  }
}


