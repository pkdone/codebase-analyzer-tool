import BaseBedrockLLM from "../common/base-bedrock-llm";
import { buildStandardMessagesArray } from "../utils/bedrock-request-builders";
import { z } from "zod";

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
 * Class for the AWS Bedrock Deepseek LLMs.
 */
export default class BedrockDeepseekLLM extends BaseBedrockLLM {
  /**
   * Build the request body object for Deepseek completions using standard messages format.
   */
  protected override buildCompletionRequestBody(modelKey: string, prompt: string) {
    return buildStandardMessagesArray(prompt, modelKey, this.llmModelsMetadata);
  }

  /**
   * Get the provider-specific response extraction configuration.
   */
  protected getResponseExtractionConfig() {
    return {
      schema: DeepseekCompletionResponseSchema,
      pathConfig: {
        contentPath: "choices[0].message.content",
        alternativeContentPath: "choices[0].message.reasoning_content",
        promptTokensPath: "usage.inputTokens",
        completionTokensPath: "usage.outputTokens",
        stopReasonPath: "choices[0].stop_reason",
        stopReasonValueForLength: "length",
      },
      providerName: "Deepseek",
    };
  }
}
