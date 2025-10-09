import { llmConfig } from "../../../llm.config";
import BaseBedrockLLM from "../common/base-bedrock-llm";
import { BEDROCK_NOVA } from "./bedrock-nova.manifest";
import { z } from "zod";

/**
 * Zod schema for Nova completion response validation
 */
const NovaCompletionResponseSchema = z.object({
  output: z.object({
    message: z
      .object({
        content: z.array(
          z.object({
            text: z.string(),
          }),
        ),
      })
      .optional(),
  }),
  stopReason: z.string().optional(),
  usage: z
    .object({
      inputTokens: z.number().optional(),
      outputTokens: z.number().optional(),
    })
    .optional(),
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
   * Build the request body object for Nova completions.
   */
  protected buildCompletionRequestBody(modelKey: string, prompt: string) {
    // Bedrock providers don't support JSON mode options
    return {
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
    };
  }

  /**
   * Get the provider-specific response extraction configuration.
   */
  protected getResponseExtractionConfig() {
    return {
      schema: NovaCompletionResponseSchema,
      pathConfig: {
        contentPath: "output.message.content[0].text",
        promptTokensPath: "usage.inputTokens",
        completionTokensPath: "usage.outputTokens",
        stopReasonPath: "stopReason",
        stopReasonValueForLength: "max_tokens",
      },
      providerName: "Nova",
    };
  }
}
