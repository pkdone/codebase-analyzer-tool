import { AnthropicVertex } from "@anthropic-ai/vertex-sdk";
import { z } from "zod";
import BaseLLMProvider from "../../base-llm-provider";
import { llmConfig } from "../../../config/llm.config";
import type { LLMCompletionOptions } from "../../../types/llm-request.types";
import type { LLMImplSpecificResponseSummary, ProviderInit } from "../../llm-provider.types";
import { LLMError, LLMErrorCode } from "../../../types/llm-errors.types";
import { formatError } from "../../../../utils/error-formatters";
import {
  assertVertexAIClaudeConfig,
  isVertexAIClaudeProviderConfig,
  type VertexAIClaudeConfig,
  type VertexAIClaudeProviderConfig,
} from "./vertex-ai-claude.types";

/**
 * Zod schema for Claude completion response validation.
 */
const ClaudeCompletionResponseSchema = z.object({
  content: z.array(z.object({ type: z.string(), text: z.string() })).optional(),
  stop_reason: z.string().nullable().optional(),
  usage: z
    .object({
      input_tokens: z.number().optional(),
      output_tokens: z.number().optional(),
    })
    .optional(),
});

/**
 * Class for the Vertex AI hosted Anthropic Claude LLMs.
 * Uses the @anthropic-ai/vertex-sdk for API access.
 */
export default class VertexAIClaudeLLM extends BaseLLMProvider {
  private readonly client: AnthropicVertex;
  private readonly extractedConfig: VertexAIClaudeConfig;
  private readonly typedProviderConfig: VertexAIClaudeProviderConfig;

  /**
   * Constructor accepting a ProviderInit configuration object.
   */
  constructor(init: ProviderInit) {
    super(init);

    // Validate and extract typed configuration
    this.extractedConfig = assertVertexAIClaudeConfig(init.extractedConfig);

    // Validate provider-specific config for type safety
    if (!isVertexAIClaudeProviderConfig(this.providerSpecificConfig)) {
      throw new LLMError(
        LLMErrorCode.BAD_CONFIGURATION,
        "Invalid VertexAI Claude provider-specific configuration",
      );
    }
    this.typedProviderConfig = this.providerSpecificConfig;

    // Initialize the AnthropicVertex client with timeout from provider config
    // Must be under 10 minutes for non-streaming requests (SDK limitation)
    this.client = new AnthropicVertex({
      projectId: this.extractedConfig.projectId,
      region: this.extractedConfig.location,
      timeout: this.providerSpecificConfig.requestTimeoutMillis,
    });
  }

  /**
   * Invoke the embedding provider - not supported for Claude models.
   * @throws LLMError indicating embeddings are not supported
   */
  protected override async invokeEmbeddingProvider(): Promise<LLMImplSpecificResponseSummary> {
    return await Promise.reject(
      new LLMError(
        LLMErrorCode.BAD_CONFIGURATION,
        "VertexAI Claude provider does not support embeddings. Use a dedicated embedding provider.",
      ),
    );
  }

  /**
   * Invoke the completion provider using the Claude Messages API.
   * Uses the beta API endpoint when anthropicBetaFlags is configured (for 1M context).
   */
  protected override async invokeCompletionProvider(
    modelKey: string,
    prompt: string,
    _options?: LLMCompletionOptions,
  ): Promise<LLMImplSpecificResponseSummary> {
    const maxCompletionTokens = this.ensureMaxCompletionTokens(modelKey);
    const temperature = this.providerSpecificConfig.temperature ?? llmConfig.DEFAULT_ZERO_TEMP;
    const betaFlags = this.typedProviderConfig.anthropicBetaFlags;

    // Build request parameters
    const requestParams = {
      model: this.llmModelsMetadata[modelKey].urn,
      max_tokens: maxCompletionTokens,
      messages: [
        {
          role: "user" as const,
          content: prompt,
        },
      ],
      temperature,
    };

    // Use beta API when anthropicBetaFlags is configured (for 1M context), otherwise use standard API
    const response =
      betaFlags && betaFlags.length > 0
        ? await this.client.beta.messages.create({
            ...requestParams,
            betas: [...betaFlags],
          })
        : await this.client.messages.create(requestParams);

    // Parse and validate response
    const parseResult = ClaudeCompletionResponseSchema.safeParse(response);
    if (!parseResult.success) {
      throw new LLMError(
        LLMErrorCode.BAD_RESPONSE_CONTENT,
        `Failed to parse Claude response: ${parseResult.error.message}`,
      );
    }

    const parsedResponse = parseResult.data;

    // Extract and join all text content blocks from the response
    // Claude can return multiple text blocks that need to be combined
    const responseText =
      parsedResponse.content
        ?.filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("") ?? "";

    // Check if response was truncated due to max tokens
    const isIncompleteResponse = parsedResponse.stop_reason === "max_tokens";

    return {
      isIncompleteResponse,
      responseContent: responseText,
      tokenUsage: {
        promptTokens: parsedResponse.usage?.input_tokens,
        completionTokens: parsedResponse.usage?.output_tokens,
      },
    };
  }

  /**
   * Check if the LLM is overloaded based on the error.
   * Detects rate limit (429) and server errors (5xx).
   */
  protected override isLLMOverloaded(error: unknown): boolean {
    const errorMessage = formatError(error);
    const errorLower = errorMessage.toLowerCase();

    // Check for rate limiting
    if (
      errorLower.includes("429") ||
      errorLower.includes("rate limit") ||
      errorLower.includes("too many requests") ||
      errorLower.includes("overloaded")
    ) {
      return true;
    }

    // Check for server errors (5xx)
    if (
      errorLower.includes("500") ||
      errorLower.includes("502") ||
      errorLower.includes("503") ||
      errorLower.includes("504") ||
      errorLower.includes("internal server error") ||
      errorLower.includes("service unavailable")
    ) {
      return true;
    }

    return false;
  }

  /**
   * Check if the error indicates the token limit was exceeded.
   */
  protected override isTokenLimitExceeded(error: unknown): boolean {
    const errorMessage = formatError(error);
    const errorLower = errorMessage.toLowerCase();

    return (
      errorLower.includes("prompt is too long") ||
      errorLower.includes("exceeds maximum context") ||
      errorLower.includes("exceeds the maximum") ||
      errorLower.includes("token limit exceeded") ||
      errorLower.includes("context length exceeded") ||
      errorLower.includes("request too large")
    );
  }

  /**
   * Ensure maxCompletionTokens is configured for the specified model.
   */
  private ensureMaxCompletionTokens(modelKey: string): number {
    const modelMetadata = this.llmModelsMetadata[modelKey];
    if (!modelMetadata.maxCompletionTokens) {
      throw new LLMError(
        LLMErrorCode.BAD_CONFIGURATION,
        `Model ${modelKey} does not have maxCompletionTokens configured`,
      );
    }
    return modelMetadata.maxCompletionTokens;
  }
}
