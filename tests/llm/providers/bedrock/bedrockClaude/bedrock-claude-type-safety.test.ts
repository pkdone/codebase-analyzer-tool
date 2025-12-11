import BedrockClaudeLLM from "../../../../../src/llm/providers/bedrock/bedrockClaude/bedrock-claude-llm";
import {
  bedrockClaudeProviderManifest,
  AWS_COMPLETIONS_CLAUDE_V40,
} from "../../../../../src/llm/providers/bedrock/bedrockClaude/bedrock-claude.manifest";
import {
  LLMPurpose,
  ResolvedLLMModelMetadata,
  LLMModelKeysSet,
} from "../../../../../src/llm/types/llm.types";
import { createMockErrorLogger } from "../../../test-helpers/mock-error-logger";

/**
 * Unit tests for BedrockClaudeLLM - Type Safety Improvements
 *
 * These tests verify that the provider-specific configuration is accessed
 * in a type-safe manner, particularly for the anthropicBetaFlags property.
 */
describe("BedrockClaudeLLM - Type Safety", () => {
  const mockModelsMetadata: Record<string, ResolvedLLMModelMetadata> = {
    [AWS_COMPLETIONS_CLAUDE_V40]: {
      modelKey: AWS_COMPLETIONS_CLAUDE_V40,
      urn: "anthropic.claude-3-5-sonnet-20250620-v4:0",
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 64000,
      maxTotalTokens: 1000000,
    },
    AWS_COMPLETIONS_CLAUDE_V37: {
      modelKey: "AWS_COMPLETIONS_CLAUDE_V37",
      urn: "anthropic.claude-3-7-sonnet-20250219-v1:0",
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 65536,
      maxTotalTokens: 200000,
    },
    AWS_EMBEDDINGS_TITAN_V1: {
      modelKey: "AWS_EMBEDDINGS_TITAN_V1",
      urn: "amazon.titan-embed-text-v1",
      purpose: LLMPurpose.EMBEDDINGS,
      dimensions: 1024,
      maxTotalTokens: 8192,
    },
  };

  const mockModelKeysSet: LLMModelKeysSet = {
    embeddingsModelKey: "AWS_EMBEDDINGS_TITAN_V1",
    primaryCompletionModelKey: AWS_COMPLETIONS_CLAUDE_V40,
    secondaryCompletionModelKey: "AWS_COMPLETIONS_CLAUDE_V37",
  };

  it("should safely access anthropicBetaFlags from provider config for Claude V40", () => {
    const llm = new BedrockClaudeLLM(
      {} as any,
      mockModelKeysSet,
      mockModelsMetadata,
      [],
      {
        providerSpecificConfig: {
          apiVersion: "bedrock-2023-05-31",
          temperature: 0,
          topK: 1,
          requestTimeoutMillis: 60000,
          maxRetryAttempts: 6,
          minRetryDelayMillis: 40000,
          maxRetryDelayMillis: 360000,
          anthropicBetaFlags: ["context-1m-2025-08-07"],
        },
      },
      "BedrockClaude",
      createMockErrorLogger(),
    );

    const requestBody = (llm as any).buildCompletionRequestBody(
      AWS_COMPLETIONS_CLAUDE_V40,
      "test prompt",
    );

    // Verify that anthropic_beta flags are properly included
    expect(requestBody.anthropic_beta).toEqual(["context-1m-2025-08-07"]);
    expect(requestBody.anthropic_version).toBe("bedrock-2023-05-31");
    expect(requestBody.messages).toBeDefined();
    expect(requestBody.messages[0].content[0].text).toBe("test prompt");
  });

  it("should work without anthropicBetaFlags for Claude V40", () => {
    const llm = new BedrockClaudeLLM(
      {} as any,
      mockModelKeysSet,
      mockModelsMetadata,
      [],
      {
        providerSpecificConfig: {
          apiVersion: "bedrock-2023-05-31",
          requestTimeoutMillis: 60000,
          maxRetryAttempts: 6,
          minRetryDelayMillis: 40000,
          maxRetryDelayMillis: 360000,
        },
      },
      "BedrockClaude",
      createMockErrorLogger(),
    );

    const requestBody = (llm as any).buildCompletionRequestBody(
      AWS_COMPLETIONS_CLAUDE_V40,
      "test prompt",
    );

    // anthropic_beta should not be included when not configured
    expect(requestBody.anthropic_beta).toBeUndefined();
    expect(requestBody.anthropic_version).toBe("bedrock-2023-05-31");
  });

  it("should not include anthropicBetaFlags for non-V40 Claude models", () => {
    const v37KeysSet: LLMModelKeysSet = {
      embeddingsModelKey: "AWS_EMBEDDINGS_TITAN_V1",
      primaryCompletionModelKey: "AWS_COMPLETIONS_CLAUDE_V37",
    };

    const llm = new BedrockClaudeLLM(
      {} as any,
      v37KeysSet,
      mockModelsMetadata,
      [],
      {
        providerSpecificConfig: {
          apiVersion: "bedrock-2023-05-31",
          requestTimeoutMillis: 60000,
          maxRetryAttempts: 6,
          minRetryDelayMillis: 40000,
          maxRetryDelayMillis: 360000,
          anthropicBetaFlags: ["context-1m-2025-08-07"],
        },
      },
      "BedrockClaude",
      createMockErrorLogger(),
    );

    const requestBody = (llm as any).buildCompletionRequestBody(
      "AWS_COMPLETIONS_CLAUDE_V37",
      "test prompt",
    );

    // anthropic_beta should not be included for non-V40 models
    expect(requestBody.anthropic_beta).toBeUndefined();
    expect(requestBody.anthropic_version).toBe("bedrock-2023-05-31");
  });

  it("should verify anthropicBetaFlags is in provider manifest config", () => {
    // Verify that the manifest contains the anthropicBetaFlags configuration
    expect(bedrockClaudeProviderManifest.providerSpecificConfig).toHaveProperty(
      "anthropicBetaFlags",
    );
    expect(
      Array.isArray(bedrockClaudeProviderManifest.providerSpecificConfig.anthropicBetaFlags),
    ).toBe(true);
    expect(bedrockClaudeProviderManifest.providerSpecificConfig.anthropicBetaFlags).toContain(
      "context-1m-2025-08-07",
    );
  });

  it("should properly use temperature and topK from config", () => {
    const llm = new BedrockClaudeLLM(
      {} as any,
      mockModelKeysSet,
      mockModelsMetadata,
      [],
      {
        providerSpecificConfig: {
          apiVersion: "bedrock-2023-05-31",
          temperature: 0.5,
          topK: 50,
          requestTimeoutMillis: 60000,
          maxRetryAttempts: 6,
          minRetryDelayMillis: 40000,
          maxRetryDelayMillis: 360000,
        },
      },
      "BedrockClaude",
      createMockErrorLogger(),
    );

    const requestBody = (llm as any).buildCompletionRequestBody(
      AWS_COMPLETIONS_CLAUDE_V40,
      "test prompt",
    );

    expect(requestBody.temperature).toBe(0.5);
    expect(requestBody.top_k).toBe(50);
    expect(requestBody.max_tokens).toBe(64000);
  });
});
