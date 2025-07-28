import { llmConfig } from "../../../llm.config";
import BaseBedrockLLM from "../base-bedrock-llm";
import { BEDROCK_NOVA } from "./bedrock-nova.manifest";
import { LLMCompletionOptions } from "../../../types/llm.types";
import { z } from "zod";
import { BadResponseContentLLMError } from "../../../types/llm-errors.types";

/**
 * Zod schema for Nova completion response validation
 */
const NovaCompletionResponseSchema = z.object({
  output: z.object({
    message: z.object({
      content: z.array(z.object({
        text: z.string(),
      })),
    }).optional(),
  }),
  stopReason: z.string().optional(),
  usage: z.object({
    inputTokens: z.number().optional(),
    outputTokens: z.number().optional(),
  }).optional(),
});

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
  protected extractCompletionModelSpecificResponse(llmResponse: unknown) {
    const validation = NovaCompletionResponseSchema.safeParse(llmResponse);
    if (!validation.success) {
      throw new BadResponseContentLLMError("Invalid Nova response structure", llmResponse);
    }
    const response = validation.data;
    
    const responseContent = response.output.message?.content[0].text ?? null;
    const finishReason = response.stopReason ?? "";
    const finishReasonLowercase = finishReason.toLowerCase();
    const isIncompleteResponse = finishReasonLowercase === "max_tokens" || !responseContent;
    const promptTokens = response.usage?.inputTokens ?? -1;
    const completionTokens = response.usage?.outputTokens ?? -1;
    const maxTotalTokens = -1; // Not using "total_tokens" as that is total of prompt + completion tokens tokens and not the max limit
    const tokenUsage = { promptTokens, completionTokens, maxTotalTokens };
    return { isIncompleteResponse, responseContent, tokenUsage };
  }
}


