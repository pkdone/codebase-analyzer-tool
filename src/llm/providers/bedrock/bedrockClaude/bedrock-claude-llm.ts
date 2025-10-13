import { llmConfig } from "../../../llm.config";
import BaseBedrockLLM from "../common/base-bedrock-llm";
import { BEDROCK_CLAUDE_FAMILY } from "../common/bedrock-models.constants";
import { AWS_COMPLETIONS_CLAUDE_V40, AWS_COMPLETIONS_CLAUDE_V45 } from "./bedrock-claude.manifest";
import { z } from "zod";
import type { LLMProviderSpecificConfig } from "../../llm-provider.types";

/**
 * Type-safe configuration interface for Claude provider
 */
interface ClaudeProviderConfig extends LLMProviderSpecificConfig {
  apiVersion: string;
  temperature?: number;
  topK?: number;
  anthropicBetaFlags?: string[];
}

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
    return BEDROCK_CLAUDE_FAMILY;
  }

  /**
   * Build the request body object for Claude completions.
   */
  protected buildCompletionRequestBody(modelKey: string, prompt: string) {
    // Bedrock providers don't support JSON mode options
    const config = this.providerSpecificConfig as ClaudeProviderConfig;

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
      max_tokens: this.llmModelsMetadata[modelKey].maxCompletionTokens,
    };

    // Add anthropic_beta flags for Claude V40 model (1M-token context beta) if configured
    if (
      [AWS_COMPLETIONS_CLAUDE_V40, AWS_COMPLETIONS_CLAUDE_V45].includes(modelKey) &&
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
