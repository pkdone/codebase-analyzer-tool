import BedrockClaudeLLM from "../../../../../../src/common/llm/providers/bedrock/claude/bedrock-claude-llm";
import { bedrockClaudeProviderManifest } from "../../../../../../src/common/llm/providers/bedrock/claude/bedrock-claude.manifest";
import {
  createBedrockMockEnv,
  createBedrockProviderInit,
} from "../../../../helpers/llm/bedrock-test-helper";

// Test-only constant for Claude Opus 4.5 model key
const BEDROCK_CLAUDE_OPUS_V45 = "bedrock-claude-opus-4.5";

/**
 * Unit tests for BedrockClaudeLLM - Type Safety Improvements
 *
 * These tests verify that the provider-specific configuration is accessed
 * in a type-safe manner, particularly for the anthropicBetaFlags property.
 */
describe("BedrockClaudeLLM - Type Safety", () => {
  const mockEnv = createBedrockMockEnv(
    "BedrockClaude",
    [], // No embeddings for this test
    [BEDROCK_CLAUDE_OPUS_V45, "bedrock-claude-sonnet-4.5"],
    {
      BEDROCK_CLAUDE_OPUS_45_MODEL_URN: "global.anthropic.claude-opus-4-5-20251101-v1:0",
      BEDROCK_CLAUDE_SONNET_45_MODEL_URN: "us.anthropic.claude-sonnet-4-5-20250929-v1:0",
    },
  );

  it("should safely access anthropicBetaFlags from provider config for Claude Opus 4.5", () => {
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
      BEDROCK_CLAUDE_OPUS_V45,
      "test prompt",
    );

    // Verify that anthropic_beta flags are properly included
    expect(requestBody.anthropic_beta).toEqual(["context-1m-2025-08-07"]);
    expect(requestBody.anthropic_version).toBe("bedrock-2023-05-31");
    expect(requestBody.messages).toBeDefined();
    expect(requestBody.messages[0].content[0].text).toBe("test prompt");
  });

  it("should work without anthropicBetaFlags for Claude Opus 4.5", () => {
    const { anthropicBetaFlags: _anthropicBetaFlags, ...configWithoutBeta } =
      bedrockClaudeProviderManifest.providerSpecificConfig as any;
    const manifestWithoutBeta = {
      ...bedrockClaudeProviderManifest,
      providerSpecificConfig: configWithoutBeta,
    };
    const init = createBedrockProviderInit(manifestWithoutBeta as any, mockEnv);
    const llm = new BedrockClaudeLLM(init);

    const requestBody = (llm as any).buildCompletionRequestBody(
      BEDROCK_CLAUDE_OPUS_V45,
      "test prompt",
    );

    // anthropic_beta should not be included when not configured
    expect(requestBody.anthropic_beta).toBeUndefined();
    expect(requestBody.anthropic_version).toBe("bedrock-2023-05-31");
  });

  it("should not include anthropicBetaFlags for non-supported Claude models", () => {
    const customManifest = {
      ...bedrockClaudeProviderManifest,
      models: {
        ...bedrockClaudeProviderManifest.models,
        completions: [
          {
            ...bedrockClaudeProviderManifest.models.completions[0],
            modelKey: "AWS_COMPLETIONS_CLAUDE_V37",
            urnEnvKey: "BEDROCK_CLAUDE_V37_MODEL_URN",
          },
        ],
      },
      providerSpecificConfig: {
        ...bedrockClaudeProviderManifest.providerSpecificConfig,
        anthropicBetaFlags: ["context-1m-2025-08-07"],
      },
    };
    const customEnv = createBedrockMockEnv("BedrockClaude", [], ["AWS_COMPLETIONS_CLAUDE_V37"], {
      BEDROCK_CLAUDE_V37_MODEL_URN: "anthropic.claude-3-7-sonnet-20250219-v1:0",
    });
    const init = createBedrockProviderInit(customManifest as any, customEnv);
    const llm = new BedrockClaudeLLM(init);

    const requestBody = (llm as any).buildCompletionRequestBody(
      "AWS_COMPLETIONS_CLAUDE_V37",
      "test prompt",
    );

    // anthropic_beta should not be included for non-supported models
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
      BEDROCK_CLAUDE_OPUS_V45,
      "test prompt",
    );

    expect(requestBody.temperature).toBe(0.5);
    expect(requestBody.top_k).toBe(50);
    expect(requestBody.max_tokens).toBe(64000);
  });
});
