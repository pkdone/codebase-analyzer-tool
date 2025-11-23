import StandardMessagesBedrockLLM from "../common/standard-messages-bedrock-llm";
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
export default class BedrockDeepseekLLM extends StandardMessagesBedrockLLM {
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
