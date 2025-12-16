import BaseBedrockLLM from "../common/base-bedrock-llm";
import { buildStandardMessagesArray } from "../utils/bedrock-request-builders";
import { z } from "zod";

/**
 * Zod schema for Mistral completion response validation
 */
const MistralCompletionResponseSchema = z.object({
  choices: z.array(
    z.object({
      message: z
        .object({
          content: z.string(),
        })
        .optional(),
      stop_reason: z.string().optional(),
      finish_reason: z.string().optional(),
    }),
  ),
  usage: z
    .object({
      prompt_tokens: z.number().optional(),
      completion_tokens: z.number().optional(),
    })
    .optional(),
});

/**
 * Class for the AWS Bedrock Mistral LLMs.
 */
export default class BedrockMistralLLM extends BaseBedrockLLM {
  /**
   * Build the request body object for completions using the standard messages array format.
   */
  protected buildCompletionRequestBody(modelKey: string, prompt: string) {
    // Bedrock providers don't support JSON mode options
    return buildStandardMessagesArray(prompt, modelKey, this.llmModelsMetadata);
  }

  /**
   * Get the provider-specific response extraction configuration.
   */
  protected getResponseExtractionConfig() {
    return {
      schema: MistralCompletionResponseSchema,
      pathConfig: {
        contentPath: "choices[0].message.content",
        promptTokensPath: "usage.prompt_tokens",
        completionTokensPath: "usage.completion_tokens",
        stopReasonPath: "choices[0].stop_reason",
        alternativeStopReasonPath: "choices[0].finish_reason",
        stopReasonValueForLength: "length",
      },
      providerName: "Mistral",
    };
  }
}
