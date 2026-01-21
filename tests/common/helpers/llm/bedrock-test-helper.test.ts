import {
  createBedrockMockEnv,
  createBedrockTestData,
  createBedrockProviderInit,
  AdditionalTestModel,
  BedrockTestData,
} from "./bedrock-test-helper";
import { LLMProviderManifest } from "../../../../src/common/llm/providers/llm-provider.types";
import { LLMPurpose } from "../../../../src/common/llm/types/llm-request.types";
import { loadBaseEnvVarsOnly } from "../../../../src/app/env/env";

// Mock the environment loader
jest.mock("../../../../src/app/env/env");

describe("bedrock-test-helper", () => {
  const mockBaseEnv = {
    MONGODB_URL: "mongodb://test-url:27017",
  };

  beforeEach(() => {
    (loadBaseEnvVarsOnly as jest.Mock).mockReturnValue(mockBaseEnv);
  });

  describe("createBedrockMockEnv", () => {
    it("should create a mock environment with required base variables", () => {
      const result = createBedrockMockEnv(
        "BedrockClaude",
        ["bedrock-amazon-titan-embed-text"], // embeddings chain
        ["bedrock-claude-opus-4.5", "bedrock-claude-sonnet-4.5"], // completions chain
        {
          BEDROCK_AMAZON_TITAN_EMBED_TEXT_MODEL_URN: "amazon.titan-embed-text-v1",
          BEDROCK_CLAUDE_OPUS_45_MODEL_URN: "anthropic.claude-3-5-sonnet-20240620-v1:0",
          BEDROCK_CLAUDE_SONNET_45_MODEL_URN: "anthropic.claude-3-opus-20240229-v1:0",
        },
      );

      // Model keys are globally unique, so no provider prefix is needed
      expect(result).toMatchObject({
        MONGODB_URL: "mongodb://test-url:27017",
        CODEBASE_DIR_PATH: "/test/path",
        SKIP_ALREADY_PROCESSED_FILES: false,
        LLM_COMPLETIONS: "bedrock-claude-opus-4.5,bedrock-claude-sonnet-4.5",
        LLM_EMBEDDINGS: "bedrock-amazon-titan-embed-text",
        BEDROCK_AMAZON_TITAN_EMBED_TEXT_MODEL_URN: "amazon.titan-embed-text-v1",
        BEDROCK_CLAUDE_OPUS_45_MODEL_URN: "anthropic.claude-3-5-sonnet-20240620-v1:0",
      });
    });

    it("should handle empty embeddings chain", () => {
      const result = createBedrockMockEnv(
        "BedrockClaude",
        [], // no embeddings
        ["bedrock-claude-opus-4.5"],
        {
          BEDROCK_CLAUDE_OPUS_45_MODEL_URN: "anthropic.claude-3-5-sonnet-20240620-v1:0",
        },
      );

      expect(result.LLM_EMBEDDINGS).toBe("");
      expect(result.LLM_COMPLETIONS).toBe("bedrock-claude-opus-4.5");
    });

    it("should correctly generate chain entries with just model keys", () => {
      const llamaResult = createBedrockMockEnv(
        "BedrockLlama",
        [],
        ["bedrock-meta-llama3-3-70b-instruct"],
        {
          BEDROCK_META_LLAMA_MODEL_URN: "meta.llama3-1-405b-instruct-v1:0",
        },
      );

      // Model keys are globally unique, so no provider prefix is needed
      expect(llamaResult.LLM_COMPLETIONS).toBe("bedrock-meta-llama3-3-70b-instruct");
    });
  });

  describe("createBedrockTestData", () => {
    const mockManifest: LLMProviderManifest = {
      providerName: "BedrockClaude",
      modelFamily: "test",
      envSchema: {} as any,
      models: {
        embeddings: [
          {
            modelKey: "bedrock-amazon-titan-embed-text",
            urnEnvKey: "BEDROCK_AMAZON_TITAN_EMBED_TEXT_MODEL_URN",
            purpose: LLMPurpose.EMBEDDINGS,
            dimensions: 1536,
            maxTotalTokens: 8192,
          },
        ],
        completions: [
          {
            modelKey: "bedrock-claude-opus-4.5",
            urnEnvKey: "BEDROCK_CLAUDE_OPUS_45_MODEL_URN",
            purpose: LLMPurpose.COMPLETIONS,
            maxCompletionTokens: 4096,
            maxTotalTokens: 200000,
          },
          {
            modelKey: "bedrock-claude-sonnet-4.5",
            urnEnvKey: "BEDROCK_CLAUDE_SONNET_45_MODEL_URN",
            purpose: LLMPurpose.COMPLETIONS,
            maxCompletionTokens: 8192,
            maxTotalTokens: 200000,
          },
        ],
      },
      errorPatterns: [],
      providerSpecificConfig: {} as any,
      implementation: jest.fn() as any,
    };

    const mockEnv: Record<string, string | boolean> = {
      BEDROCK_AMAZON_TITAN_EMBED_TEXT_MODEL_URN: "amazon.titan-embed-text-v1",
      BEDROCK_CLAUDE_OPUS_45_MODEL_URN: "anthropic.claude-3-5-sonnet-20240620-v1:0",
      BEDROCK_CLAUDE_SONNET_45_MODEL_URN: "anthropic.claude-3-opus-20240229-v1:0",
    };

    it("should create embeddings model metadata", () => {
      const result = createBedrockTestData(mockManifest, mockEnv);

      expect(result.modelsMetadata["bedrock-amazon-titan-embed-text"]).toEqual({
        modelKey: "bedrock-amazon-titan-embed-text",
        urnEnvKey: "BEDROCK_AMAZON_TITAN_EMBED_TEXT_MODEL_URN",
        urn: "amazon.titan-embed-text-v1",
        purpose: LLMPurpose.EMBEDDINGS,
        dimensions: 1536,
        maxTotalTokens: 8192,
      });
    });

    it("should create completion model metadata for all models in manifest", () => {
      const result = createBedrockTestData(mockManifest, mockEnv);

      expect(result.modelsMetadata["bedrock-claude-opus-4.5"]).toEqual({
        modelKey: "bedrock-claude-opus-4.5",
        urnEnvKey: "BEDROCK_CLAUDE_OPUS_45_MODEL_URN",
        urn: "anthropic.claude-3-5-sonnet-20240620-v1:0",
        purpose: LLMPurpose.COMPLETIONS,
        maxCompletionTokens: 4096,
        maxTotalTokens: 200000,
      });

      expect(result.modelsMetadata["bedrock-claude-sonnet-4.5"]).toEqual({
        modelKey: "bedrock-claude-sonnet-4.5",
        urnEnvKey: "BEDROCK_CLAUDE_SONNET_45_MODEL_URN",
        urn: "anthropic.claude-3-opus-20240229-v1:0",
        purpose: LLMPurpose.COMPLETIONS,
        maxCompletionTokens: 8192,
        maxTotalTokens: 200000,
      });
    });

    it("should include additional test models when provided", () => {
      const additionalModels: AdditionalTestModel[] = [
        {
          modelKey: "custom-test-model",
          urn: "custom.model-v1:0",
          maxCompletionTokens: 2048,
          maxTotalTokens: 100000,
        },
      ];

      const result = createBedrockTestData(mockManifest, mockEnv, additionalModels);

      expect(result.modelsMetadata["custom-test-model"]).toBeDefined();
      expect(result.modelsMetadata["custom-test-model"].urn).toBe("custom.model-v1:0");
      expect(result.modelsMetadata["custom-test-model"].maxCompletionTokens).toBe(2048);
    });

    it("should return complete BedrockTestData structure", () => {
      const result: BedrockTestData = createBedrockTestData(mockManifest, mockEnv);

      expect(result).toHaveProperty("mockEnv");
      expect(result).toHaveProperty("modelsMetadata");
      expect(typeof result.mockEnv).toBe("object");
      expect(typeof result.modelsMetadata).toBe("object");
    });
  });

  describe("createBedrockProviderInit", () => {
    const mockManifest: LLMProviderManifest = {
      providerName: "Bedrock Claude",
      modelFamily: "BedrockClaude",
      envSchema: {} as any,
      models: {
        embeddings: [
          {
            modelKey: "bedrock-amazon-titan-embed-text",
            urnEnvKey: "BEDROCK_AMAZON_TITAN_EMBED_TEXT_MODEL_URN",
            purpose: LLMPurpose.EMBEDDINGS,
            dimensions: 1536,
            maxTotalTokens: 8192,
          },
        ],
        completions: [
          {
            modelKey: "bedrock-claude-opus-4.5",
            urnEnvKey: "BEDROCK_CLAUDE_OPUS_45_MODEL_URN",
            purpose: LLMPurpose.COMPLETIONS,
            maxCompletionTokens: 4096,
            maxTotalTokens: 200000,
          },
        ],
      },
      errorPatterns: [],
      providerSpecificConfig: {} as any,
      implementation: jest.fn() as any,
    };

    const mockEnv: Record<string, string | boolean> = {
      BEDROCK_AMAZON_TITAN_EMBED_TEXT_MODEL_URN: "amazon.titan-embed-text-v1",
      BEDROCK_CLAUDE_OPUS_45_MODEL_URN: "anthropic.claude-3-5-sonnet-20240620-v1:0",
    };

    it("should create a valid ProviderInit object", () => {
      const result = createBedrockProviderInit(mockManifest, mockEnv);

      expect(result).toHaveProperty("manifest");
      expect(result).toHaveProperty("providerParams");
      expect(result).toHaveProperty("resolvedModelChain");
      expect(result).toHaveProperty("errorLogging");
    });

    it("should include resolved model chain with correct URNs", () => {
      const result = createBedrockProviderInit(mockManifest, mockEnv);

      expect(result.resolvedModelChain.completions).toHaveLength(1);
      expect(result.resolvedModelChain.completions[0]).toEqual({
        providerFamily: "BedrockClaude",
        modelKey: "bedrock-claude-opus-4.5",
        modelUrn: "anthropic.claude-3-5-sonnet-20240620-v1:0",
      });

      expect(result.resolvedModelChain.embeddings).toHaveLength(1);
      expect(result.resolvedModelChain.embeddings[0]).toEqual({
        providerFamily: "BedrockClaude",
        modelKey: "bedrock-amazon-titan-embed-text",
        modelUrn: "amazon.titan-embed-text-v1",
      });
    });

    it("should include the manifest in the result", () => {
      const result = createBedrockProviderInit(mockManifest, mockEnv);
      expect(result.manifest).toBe(mockManifest);
    });

    it("should include mock environment as provider params", () => {
      const result = createBedrockProviderInit(mockManifest, mockEnv);
      expect(result.providerParams).toBe(mockEnv);
    });
  });
});
