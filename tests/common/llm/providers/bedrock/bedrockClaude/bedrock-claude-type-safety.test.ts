import BedrockClaudeLLM from "../../../../../../src/common/llm/providers/bedrock/bedrockClaude/bedrock-claude-llm";
import {
  bedrockClaudeProviderManifest,
  AWS_COMPLETIONS_CLAUDE_SONNET_V40,
} from "../../../../../../src/common/llm/providers/bedrock/bedrockClaude/bedrock-claude.manifest";
import {
  createBedrockMockEnv,
  createBedrockProviderInit,
} from "../../../../helpers/llm/bedrock-test-helper";

/**
 * Unit tests for BedrockClaudeLLM - Type Safety Improvements
 *
 * These tests verify that the provider-specific configuration is accessed
 * in a type-safe manner, particularly for the anthropicBetaFlags property.
 */
describe("BedrockClaudeLLM - Type Safety", () => {
  const mockEnv = createBedrockMockEnv(
    "BedrockClaude",
    "amazon.titan-embed-text-v1",
    "anthropic.claude-3-5-sonnet-20250620-v4:0",
    "anthropic.claude-3-7-sonnet-20250219-v1:0",
  );

  it("should safely access anthropicBetaFlags from provider config for Claude V40", () => {
    const customManifest = {
      ...bedrockClaudeProviderManifest,
      providerSpecificConfig: {
        ...bedrockClaudeProviderManifest.providerSpecificConfig,
        anthropicBetaFlags: ["context-1m-2025-08-07"],
      },
    };
    const init = createBedrockProviderInit(customManifest as any, mockEnv);
    const llm = new BedrockClaudeLLM(init);

    const requestBody = (llm as any).buildCompletionRequestBody(
      AWS_COMPLETIONS_CLAUDE_SONNET_V40,
      "test prompt",
    );

    // Verify that anthropic_beta flags are properly included
    expect(requestBody.anthropic_beta).toEqual(["context-1m-2025-08-07"]);
    expect(requestBody.anthropic_version).toBe("bedrock-2023-05-31");
    expect(requestBody.messages).toBeDefined();
    expect(requestBody.messages[0].content[0].text).toBe("test prompt");
  });

  it("should work without anthropicBetaFlags for Claude V40", () => {
    const { anthropicBetaFlags: _anthropicBetaFlags, ...configWithoutBeta } =
      bedrockClaudeProviderManifest.providerSpecificConfig as any;
    const manifestWithoutBeta = {
      ...bedrockClaudeProviderManifest,
      providerSpecificConfig: configWithoutBeta,
    };
    const init = createBedrockProviderInit(manifestWithoutBeta as any, mockEnv);
    const llm = new BedrockClaudeLLM(init);

    const requestBody = (llm as any).buildCompletionRequestBody(
      AWS_COMPLETIONS_CLAUDE_SONNET_V40,
      "test prompt",
    );

    // anthropic_beta should not be included when not configured
    expect(requestBody.anthropic_beta).toBeUndefined();
    expect(requestBody.anthropic_version).toBe("bedrock-2023-05-31");
  });

  it("should not include anthropicBetaFlags for non-V40 Claude models", () => {
    const customManifest = {
      ...bedrockClaudeProviderManifest,
      models: {
        ...bedrockClaudeProviderManifest.models,
        primaryCompletion: {
          ...bedrockClaudeProviderManifest.models.primaryCompletion,
          modelKey: "AWS_COMPLETIONS_CLAUDE_V37",
        },
      },
      providerSpecificConfig: {
        ...bedrockClaudeProviderManifest.providerSpecificConfig,
        anthropicBetaFlags: ["context-1m-2025-08-07"],
      },
    };
    const customEnv = {
      ...mockEnv,
      BEDROCK_CLAUDE_COMPLETIONS_MODEL_PRIMARY: "anthropic.claude-3-7-sonnet-20250219-v1:0",
    };
    const init = createBedrockProviderInit(customManifest as any, customEnv);
    const llm = new BedrockClaudeLLM(init);

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
    const customManifest = {
      ...bedrockClaudeProviderManifest,
      providerSpecificConfig: {
        ...bedrockClaudeProviderManifest.providerSpecificConfig,
        temperature: 0.5,
        topK: 50,
      },
    };
    const init = createBedrockProviderInit(customManifest as any, mockEnv);
    const llm = new BedrockClaudeLLM(init);

    const requestBody = (llm as any).buildCompletionRequestBody(
      AWS_COMPLETIONS_CLAUDE_SONNET_V40,
      "test prompt",
    );

    expect(requestBody.temperature).toBe(0.5);
    expect(requestBody.top_k).toBe(50);
    expect(requestBody.max_tokens).toBe(64000);
  });
});
