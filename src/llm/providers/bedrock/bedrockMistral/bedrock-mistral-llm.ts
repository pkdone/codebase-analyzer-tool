import { llmConfig } from "../../../llm.config";
import BaseBedrockLLM from "../common/base-bedrock-llm";
import { BEDROCK_MISTRAL } from "./bedrock-mistral.manifest";
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
 *
 */
export default class BedrockMistralLLM extends BaseBedrockLLM {
  /**
   * Get the model family this LLM implementation belongs to.
   */
  getModelFamily(): string {
    return BEDROCK_MISTRAL;
  }

  /**
   * Assemble the Bedrock parameters for Mistral completions only.
   */
  protected buildCompletionModelSpecificParameters(modelKey: string, prompt: string) {
    // Bedrock providers don't support JSON mode options
    return JSON.stringify({
      messages: [
        {
          role: llmConfig.LLM_ROLE_USER,
          content: prompt,
        },
      ],
      temperature: llmConfig.DEFAULT_ZERO_TEMP,
      top_p: llmConfig.DEFAULT_TOP_P_LOWEST,
      max_tokens: this.llmModelsMetadata[modelKey].maxCompletionTokens,
    });
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
