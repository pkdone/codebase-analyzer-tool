import { llmConfig } from "../../../llm.config";
import BaseBedrockLLM from "../base-bedrock-llm";
import { BEDROCK_DEEPSEEK } from "./bedrock-deepseek.manifest";
import { LLMCompletionOptions } from "../../../types/llm.types";
import { z } from "zod";
import { BadResponseContentLLMError } from "../../../types/llm-errors.types";

/**
 * Zod schema for Deepseek completion response validation
 */
const DeepseekCompletionResponseSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z
          .object({
            content: z.string().optional(),
            reasoning_content: z.string().optional(),
          })
          .optional(),
        stop_reason: z.string().optional(),
      }),
    )
    .optional(),
  usage: z
    .object({
      inputTokens: z.number().optional(),
      outputTokens: z.number().optional(),
    })
    .optional(),
});

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
  protected extractCompletionModelSpecificResponse(llmResponse: unknown) {
    const validation = DeepseekCompletionResponseSchema.safeParse(llmResponse);
    if (!validation.success) {
      throw new BadResponseContentLLMError("Invalid Deepseek response structure", llmResponse);
    }
    const response = validation.data;

    const responseMsg = response.choices?.[0]?.message;
    const responseContent = responseMsg?.content ?? responseMsg?.reasoning_content ?? null;
    const finishReason = response.choices?.[0]?.stop_reason ?? "";
    const finishReasonLowercase = finishReason.toLowerCase();
    const isIncompleteResponse = finishReasonLowercase === "length" || !responseContent;
    const promptTokens = response.usage?.inputTokens ?? -1;
    const completionTokens = response.usage?.outputTokens ?? -1;
    const maxTotalTokens = -1;
    const tokenUsage = { promptTokens, completionTokens, maxTotalTokens };
    return { isIncompleteResponse, responseContent, tokenUsage };
  }
}
