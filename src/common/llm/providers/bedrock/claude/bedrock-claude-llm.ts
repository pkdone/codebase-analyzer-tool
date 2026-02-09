import { llmConfig } from "../../../config/llm.config";
import BaseBedrockLLM from "../common/base-bedrock-llm";
import { z } from "zod";
import {
  isBedrockClaudeProviderConfig,
  type BedrockClaudeProviderConfig,
} from "./bedrock-claude.types";
import { LLMError, LLMErrorCode } from "../../../types/llm-errors.types";
import type { JsonObject } from "../../../types/json-value.types";

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
   * Build the request body object for Claude completions.
   */
  protected override buildCompletionRequestBody(modelKey: string, prompt: string): JsonObject {
    // Bedrock providers don't support JSON mode options
    // Use type guard to validate configuration at runtime
    if (!isBedrockClaudeProviderConfig(this.providerSpecificConfig)) {
      throw new LLMError(
        LLMErrorCode.BAD_CONFIGURATION,
        "Invalid Bedrock Claude provider configuration - missing required apiVersion",
      );
    }

    const config: BedrockClaudeProviderConfig = this.providerSpecificConfig;
    const maxCompletionTokens = this.ensureMaxCompletionTokens(modelKey);

    const baseParams = {
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
      top_k: config.topK ?? llmConfig.DEFAULT_TOP_K_LOWEST,
      max_tokens: maxCompletionTokens,
    };

    // Add anthropic_beta flags for Claude models (1M-token context beta) if configured
    if (
      ["bedrock-claude-opus-4.6", "bedrock-claude-opus-4.5", "bedrock-claude-sonnet-4.5"].includes(
        modelKey,
      ) &&
      config.anthropicBetaFlags
    ) {
      return {
        ...baseParams,
        anthropic_beta: config.anthropicBetaFlags,
      };
    }

    return baseParams;
  }

  /**
   * Get the provider-specific response extraction configuration.
   */
  protected override getResponseExtractionConfig() {
    return {
      schema: ClaudeCompletionResponseSchema,
      pathConfig: {
        contentPath: "content[0].text",
        promptTokensPath: "usage.input_tokens",
        completionTokensPath: "usage.output_tokens",
        stopReasonPath: "stop_reason",
        // Claude uses "max_tokens" but we also support "length" for compatibility
        stopReasonValueForLength: ["max_tokens", "length"],
      },
      providerName: "Claude",
    };
  }
}
