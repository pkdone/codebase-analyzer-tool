import "reflect-metadata";
import BedrockClaudeLLM from "../../../../../../src/common/llm/providers/bedrock/claude/bedrock-claude-llm";
import { LLMPurpose } from "../../../../../../src/common/llm/types/llm-request.types";
import { ResolvedLLMModelMetadata } from "../../../../../../src/common/llm/types/llm-model.types";
import {
  LLMProviderSpecificConfig,
  LLMProviderManifest,
  ProviderInit,
} from "../../../../../../src/common/llm/providers/llm-provider.types";
import { llmConfig } from "../../../../../../src/common/llm/config/llm.config";
import { bedrockClaudeProviderManifest } from "../../../../../../src/common/llm/providers/bedrock/claude/bedrock-claude.manifest";
import { createMockErrorLoggingConfig } from "../../../../helpers/llm/mock-error-logger";

// Define model keys used in tests (matching the manifest model keys)
const AWS_COMPLETIONS_CLAUDE_V37 = "AWS_COMPLETIONS_CLAUDE_V37";
const BEDROCK_CLAUDE_OPUS_V45 = "bedrock-claude-opus-4.5";
const BEDROCK_CLAUDE_SONNET_V45 = "bedrock-claude-sonnet-4.5";

describe("BedrockClaudeLLM - Request Body Building", () => {
  const mockModelsMetadata: Record<string, ResolvedLLMModelMetadata> = {
    EMBEDDINGS: {
      modelKey: "EMBEDDINGS",
      urnEnvKey: "EMBEDDINGS_URN",
      urn: "amazon.titan-embed-text-v2:0",
      purpose: LLMPurpose.EMBEDDINGS,
      dimensions: 1024,
      maxTotalTokens: 8192,
    },
    [AWS_COMPLETIONS_CLAUDE_V37]: {
      modelKey: AWS_COMPLETIONS_CLAUDE_V37,
      urnEnvKey: "CLAUDE_V37_URN",
      urn: "us.anthropic.claude-3-5-sonnet-20241022-v2:0",
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 8192,
      maxTotalTokens: 200000,
    },
    [BEDROCK_CLAUDE_OPUS_V45]: {
      modelKey: BEDROCK_CLAUDE_OPUS_V45,
      urnEnvKey: "CLAUDE_OPUS_V45_URN",
      urn: "global.anthropic.claude-opus-4-5-20251101-v1:0",
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 64000,
      maxTotalTokens: 1000000,
    },
    [BEDROCK_CLAUDE_SONNET_V45]: {
      modelKey: BEDROCK_CLAUDE_SONNET_V45,
      urnEnvKey: "CLAUDE_SONNET_V45_URN",
      urn: "us.anthropic.claude-sonnet-4-5-20250929-v1:0",
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 64000,
      maxTotalTokens: 1000000,
    },
  };

  const mockConfig: LLMProviderSpecificConfig = {
    requestTimeoutMillis: 60000,
    maxRetryAttempts: 3,
    minRetryDelayMillis: 1000,
    maxRetryDelayMillis: 10000,
    temperature: 0.0,
    topK: 40,
    apiVersion: "bedrock-2023-05-31",
    anthropicBetaFlags: ["context-1m-2025-08-07"],
  };

  // Helper function to create ProviderInit for tests with Claude 3.7 as primary
  function createTestProviderInit(): ProviderInit {
    const manifest: LLMProviderManifest = {
      ...bedrockClaudeProviderManifest,
      providerSpecificConfig: mockConfig,
      models: {
        embeddings: [],
        completions: [
          {
            modelKey: AWS_COMPLETIONS_CLAUDE_V37,
            urnEnvKey: "CLAUDE_V37_URN",
            purpose: LLMPurpose.COMPLETIONS,
            maxCompletionTokens: mockModelsMetadata[AWS_COMPLETIONS_CLAUDE_V37].maxCompletionTokens,
            maxTotalTokens: mockModelsMetadata[AWS_COMPLETIONS_CLAUDE_V37].maxTotalTokens,
          },
          {
            modelKey: BEDROCK_CLAUDE_SONNET_V45,
            urnEnvKey: "TEST_SONNET_V45_MODEL",
            purpose: LLMPurpose.COMPLETIONS,
            maxCompletionTokens: mockModelsMetadata[BEDROCK_CLAUDE_SONNET_V45].maxCompletionTokens,
            maxTotalTokens: mockModelsMetadata[BEDROCK_CLAUDE_SONNET_V45].maxTotalTokens,
          },
        ],
      },
    };

    return {
      manifest,
      providerParams: {},
      resolvedModelChain: {
        embeddings: [
          {
            providerFamily: "BedrockClaude",
            modelKey: "EMBEDDINGS",
            modelUrn: mockModelsMetadata.EMBEDDINGS.urn,
          },
        ],
        completions: [
          {
            providerFamily: "BedrockClaude",
            modelKey: AWS_COMPLETIONS_CLAUDE_V37,
            modelUrn: mockModelsMetadata[AWS_COMPLETIONS_CLAUDE_V37].urn,
          },
          {
            providerFamily: "BedrockClaude",
            modelKey: BEDROCK_CLAUDE_SONNET_V45,
            modelUrn: mockModelsMetadata[BEDROCK_CLAUDE_SONNET_V45].urn,
          },
        ],
      },
      errorLogging: createMockErrorLoggingConfig(),
    };
  }

  // Helper function to create ProviderInit for tests with Opus 4.5 as primary
  function createTestProviderInitWithOpus45(): ProviderInit {
    const manifest: LLMProviderManifest = {
      ...bedrockClaudeProviderManifest,
      providerSpecificConfig: mockConfig,
      models: {
        embeddings: [],
        completions: [
          {
            modelKey: BEDROCK_CLAUDE_OPUS_V45,
            urnEnvKey: "CLAUDE_OPUS_V45_URN",
            purpose: LLMPurpose.COMPLETIONS,
            maxCompletionTokens: mockModelsMetadata[BEDROCK_CLAUDE_OPUS_V45].maxCompletionTokens,
            maxTotalTokens: mockModelsMetadata[BEDROCK_CLAUDE_OPUS_V45].maxTotalTokens,
          },
          {
            modelKey: BEDROCK_CLAUDE_SONNET_V45,
            urnEnvKey: "TEST_SONNET_V45_MODEL",
            purpose: LLMPurpose.COMPLETIONS,
            maxCompletionTokens: mockModelsMetadata[BEDROCK_CLAUDE_SONNET_V45].maxCompletionTokens,
            maxTotalTokens: mockModelsMetadata[BEDROCK_CLAUDE_SONNET_V45].maxTotalTokens,
          },
        ],
      },
    };

    return {
      manifest,
      providerParams: {},
      resolvedModelChain: {
        embeddings: [
          {
            providerFamily: "BedrockClaude",
            modelKey: "EMBEDDINGS",
            modelUrn: mockModelsMetadata.EMBEDDINGS.urn,
          },
        ],
        completions: [
          {
            providerFamily: "BedrockClaude",
            modelKey: BEDROCK_CLAUDE_OPUS_V45,
            modelUrn: mockModelsMetadata[BEDROCK_CLAUDE_OPUS_V45].urn,
          },
          {
            providerFamily: "BedrockClaude",
            modelKey: BEDROCK_CLAUDE_SONNET_V45,
            modelUrn: mockModelsMetadata[BEDROCK_CLAUDE_SONNET_V45].urn,
          },
        ],
      },
      errorLogging: createMockErrorLoggingConfig(),
    };
  }

  describe("buildCompletionRequestBody", () => {
    it("should build correct request body for Claude 3.7", () => {
      const llm = new BedrockClaudeLLM(createTestProviderInit());

      const testPrompt = "Analyze this code";
      // Access private method for testing
      // eslint-disable-next-line @typescript-eslint/dot-notation
      const requestBody = llm["buildCompletionRequestBody"](AWS_COMPLETIONS_CLAUDE_V37, testPrompt);

      // Verify structure
      expect(requestBody).toHaveProperty("anthropic_version", "bedrock-2023-05-31");
      expect(requestBody).toHaveProperty("messages");
      expect(requestBody).toHaveProperty("temperature", 0.0);
      expect(requestBody).toHaveProperty("top_k", 40);
      expect(requestBody).toHaveProperty("max_tokens", 8192);

      // Verify messages structure
      const body = requestBody as any;
      expect(body.messages).toHaveLength(1);
      expect(body.messages[0]).toEqual({
        role: llmConfig.LLM_ROLE_USER,
        content: [
          {
            type: "text",
            text: testPrompt,
          },
        ],
      });

      // Verify NO anthropic_beta for Claude 3.7
      expect(requestBody).not.toHaveProperty("anthropic_beta");
    });

    it("should include anthropic_beta for Claude Opus 4.5 model", () => {
      const llm = new BedrockClaudeLLM(createTestProviderInitWithOpus45());

      const testPrompt = "Analyze large codebase";
      // eslint-disable-next-line @typescript-eslint/dot-notation
      const requestBody = llm["buildCompletionRequestBody"](BEDROCK_CLAUDE_OPUS_V45, testPrompt);

      // Verify structure includes beta header for 1M context
      expect(requestBody).toHaveProperty("anthropic_beta");
      const body = requestBody as any;
      expect(body.anthropic_beta).toEqual(["context-1m-2025-08-07"]);

      // Verify other standard fields are still present
      expect(requestBody).toHaveProperty("anthropic_version", "bedrock-2023-05-31");
      expect(requestBody).toHaveProperty("messages");
      expect(requestBody).toHaveProperty("max_tokens", 64000);
    });

    it("should include anthropic_beta for Claude Sonnet 4.5 model", () => {
      const llm = new BedrockClaudeLLM(createTestProviderInit());

      const testPrompt = "Analyze large codebase";
      // eslint-disable-next-line @typescript-eslint/dot-notation
      const requestBody = llm["buildCompletionRequestBody"](BEDROCK_CLAUDE_SONNET_V45, testPrompt);

      // Verify structure includes beta header for 1M context
      expect(requestBody).toHaveProperty("anthropic_beta");
      const body = requestBody as any;
      expect(body.anthropic_beta).toEqual(["context-1m-2025-08-07"]);

      // Verify other standard fields are still present
      expect(requestBody).toHaveProperty("anthropic_version", "bedrock-2023-05-31");
      expect(requestBody).toHaveProperty("messages");
      expect(requestBody).toHaveProperty("max_tokens", 64000);
    });

    it("should use default values when config values are missing", () => {
      const minimalConfig: LLMProviderSpecificConfig = {
        requestTimeoutMillis: 60000,
        maxRetryAttempts: 3,
        minRetryDelayMillis: 1000,
        maxRetryDelayMillis: 10000,
        apiVersion: "bedrock-2023-05-31",
        // temperature, topK intentionally omitted
      };

      const minimalManifest: LLMProviderManifest = {
        ...bedrockClaudeProviderManifest,
        providerSpecificConfig: minimalConfig,
        models: {
          embeddings: [],
          completions: [
            {
              modelKey: AWS_COMPLETIONS_CLAUDE_V37,
              urnEnvKey: "CLAUDE_V37_URN",
              purpose: LLMPurpose.COMPLETIONS,
              maxCompletionTokens:
                mockModelsMetadata[AWS_COMPLETIONS_CLAUDE_V37].maxCompletionTokens,
              maxTotalTokens: mockModelsMetadata[AWS_COMPLETIONS_CLAUDE_V37].maxTotalTokens,
            },
          ],
        },
      };
      const minimalInit: ProviderInit = {
        manifest: minimalManifest,
        providerParams: {},
        resolvedModelChain: {
          embeddings: [
            {
              providerFamily: "BedrockClaude",
              modelKey: "EMBEDDINGS",
              modelUrn: mockModelsMetadata.EMBEDDINGS.urn,
            },
          ],
          completions: [
            {
              providerFamily: "BedrockClaude",
              modelKey: AWS_COMPLETIONS_CLAUDE_V37,
              modelUrn: mockModelsMetadata[AWS_COMPLETIONS_CLAUDE_V37].urn,
            },
          ],
        },
        errorLogging: createMockErrorLoggingConfig(),
      };

      const llm = new BedrockClaudeLLM(minimalInit);

      // eslint-disable-next-line @typescript-eslint/dot-notation
      const requestBody = llm["buildCompletionRequestBody"](AWS_COMPLETIONS_CLAUDE_V37, "test");

      const body = requestBody as any;
      expect(body.temperature).toBe(llmConfig.DEFAULT_ZERO_TEMP);
      expect(body.top_k).toBe(llmConfig.DEFAULT_TOP_K_LOWEST);
    });

    it("should properly embed prompt in messages content array", () => {
      const llm = new BedrockClaudeLLM(createTestProviderInit());

      const complexPrompt = "Line 1\nLine 2\nSpecial chars: <>&\"'";
      // eslint-disable-next-line @typescript-eslint/dot-notation
      const requestBody = llm["buildCompletionRequestBody"](
        AWS_COMPLETIONS_CLAUDE_V37,
        complexPrompt,
      );

      const body = requestBody as any;
      expect(body.messages[0].content[0].text).toBe(complexPrompt);
      expect(body.messages[0].content[0].type).toBe("text");
    });

    it("should use correct maxCompletionTokens from model metadata", () => {
      // Test with Claude 3.7 (8192 max tokens)
      const llm37 = new BedrockClaudeLLM(createTestProviderInit());
      // eslint-disable-next-line @typescript-eslint/dot-notation
      const requestBody37 = llm37["buildCompletionRequestBody"](AWS_COMPLETIONS_CLAUDE_V37, "test");
      expect((requestBody37 as any).max_tokens).toBe(8192);

      // Test with Claude Opus 4.5 (64000 max tokens)
      const llmOpus45 = new BedrockClaudeLLM(createTestProviderInitWithOpus45());
      // eslint-disable-next-line @typescript-eslint/dot-notation
      const requestBodyOpus45 = llmOpus45["buildCompletionRequestBody"](
        BEDROCK_CLAUDE_OPUS_V45,
        "test",
      );
      expect((requestBodyOpus45 as any).max_tokens).toBe(64000);
    });

    it("should return an object, not a string", () => {
      const llm = new BedrockClaudeLLM(createTestProviderInit());

      // eslint-disable-next-line @typescript-eslint/dot-notation
      const requestBody = llm["buildCompletionRequestBody"](AWS_COMPLETIONS_CLAUDE_V37, "test");

      expect(typeof requestBody).toBe("object");
      expect(requestBody).not.toBeNull();
      expect(typeof requestBody).not.toBe("string");
    });
  });

  describe("getResponseExtractionConfig", () => {
    it("should return correct extraction configuration", () => {
      const llm = new BedrockClaudeLLM(createTestProviderInit());

      // eslint-disable-next-line @typescript-eslint/dot-notation
      const config = llm["getResponseExtractionConfig"]();

      expect(config).toHaveProperty("schema");
      expect(config).toHaveProperty("pathConfig");
      expect(config).toHaveProperty("providerName", "Claude");

      // Verify path configuration
      expect(config.pathConfig).toEqual({
        contentPath: "content[0].text",
        promptTokensPath: "usage.input_tokens",
        completionTokensPath: "usage.output_tokens",
        stopReasonPath: "stop_reason",
        stopReasonValueForLength: "length",
      });
    });
  });

  describe("getModelFamily", () => {
    it("should return correct model family", () => {
      const llm = new BedrockClaudeLLM(createTestProviderInit());

      expect(llm.getModelFamily()).toBe("BedrockClaude");
    });
  });
});
