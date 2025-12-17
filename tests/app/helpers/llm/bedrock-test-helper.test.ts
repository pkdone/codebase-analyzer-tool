import {
  createBedrockMockEnv,
  createBedrockTestData,
  AdditionalTestModel,
  BedrockTestData,
} from "../../helpers/llm/bedrock-test-helper";
import { LLMProviderManifest } from "../../../../src/common/llm/providers/llm-provider.types";
import { LLMPurpose } from "../../../../src/common/llm/types/llm.types";
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
        "amazon.titan-embed-text-v1",
        "anthropic.claude-3-5-sonnet-20240620-v1:0",
      );

      expect(result).toMatchObject({
        MONGODB_URL: "mongodb://test-url:27017",
        CODEBASE_DIR_PATH: "/test/path",
        SKIP_ALREADY_PROCESSED_FILES: false,
        LLM: "BedrockClaude",
        BEDROCK_TITAN_EMBEDDINGS_MODEL: "amazon.titan-embed-text-v1",
        BEDROCK_CLAUDE_COMPLETIONS_MODEL_PRIMARY: "anthropic.claude-3-5-sonnet-20240620-v1:0",
      });
    });

    it("should include secondary completion model when provided", () => {
      const result = createBedrockMockEnv(
        "BedrockClaude",
        "amazon.titan-embed-text-v1",
        "anthropic.claude-3-5-sonnet-20240620-v1:0",
        "anthropic.claude-3-opus-20240229-v1:0",
      );

      expect(result.BEDROCK_CLAUDE_COMPLETIONS_MODEL_SECONDARY).toBe(
        "anthropic.claude-3-opus-20240229-v1:0",
      );
    });

    it("should not include secondary completion model when not provided", () => {
      const result = createBedrockMockEnv(
        "BedrockClaude",
        "amazon.titan-embed-text-v1",
        "anthropic.claude-3-5-sonnet-20240620-v1:0",
      );

      expect(result.BEDROCK_CLAUDE_COMPLETIONS_MODEL_SECONDARY).toBeUndefined();
    });

    it("should correctly generate provider-specific env keys", () => {
      const llamaResult = createBedrockMockEnv(
        "BedrockLlama",
        "amazon.titan-embed-text-v1",
        "meta.llama3-1-405b-instruct-v1:0",
      );

      expect(llamaResult.BEDROCK_LLAMA_COMPLETIONS_MODEL_PRIMARY).toBe(
        "meta.llama3-1-405b-instruct-v1:0",
      );
    });
  });

  describe("createBedrockTestData", () => {
    const mockManifest: LLMProviderManifest = {
      providerName: "BedrockClaude",
      modelFamily: "BedrockClaude",
      envSchema: {} as any,
      models: {
        embeddings: {
          modelKey: "AWS_EMBEDDINGS_TITAN",
          urnEnvKey: "BEDROCK_TITAN_EMBEDDINGS_MODEL",
          purpose: LLMPurpose.EMBEDDINGS,
          dimensions: 1536,
          maxTotalTokens: 8192,
        },
        primaryCompletion: {
          modelKey: "AWS_COMPLETIONS_CLAUDE_V35",
          urnEnvKey: "BEDROCK_CLAUDE_COMPLETIONS_MODEL_PRIMARY",
          purpose: LLMPurpose.COMPLETIONS,
          maxCompletionTokens: 4096,
          maxTotalTokens: 200000,
        },
        secondaryCompletion: {
          modelKey: "AWS_COMPLETIONS_CLAUDE_V40",
          urnEnvKey: "BEDROCK_CLAUDE_COMPLETIONS_MODEL_SECONDARY",
          purpose: LLMPurpose.COMPLETIONS,
          maxCompletionTokens: 8192,
          maxTotalTokens: 200000,
        },
      },
      errorPatterns: [],
      providerSpecificConfig: {} as any,
      implementation: jest.fn() as any,
    };

    const mockEnv = {
      BEDROCK_TITAN_EMBEDDINGS_MODEL: "amazon.titan-embed-text-v1",
      BEDROCK_CLAUDE_COMPLETIONS_MODEL_PRIMARY: "anthropic.claude-3-5-sonnet-20240620-v1:0",
      BEDROCK_CLAUDE_COMPLETIONS_MODEL_SECONDARY: "anthropic.claude-3-opus-20240229-v1:0",
    };

    it("should create model keys set from manifest", () => {
      const result = createBedrockTestData(mockManifest, mockEnv);

      expect(result.modelKeysSet).toEqual({
        embeddingsModelKey: "AWS_EMBEDDINGS_TITAN",
        primaryCompletionModelKey: "AWS_COMPLETIONS_CLAUDE_V35",
        secondaryCompletionModelKey: "AWS_COMPLETIONS_CLAUDE_V40",
      });
    });

    it("should create embeddings model metadata", () => {
      const result = createBedrockTestData(mockManifest, mockEnv);

      expect(result.modelsMetadata.AWS_EMBEDDINGS_TITAN).toEqual({
        modelKey: "AWS_EMBEDDINGS_TITAN",
        urn: "amazon.titan-embed-text-v1",
        purpose: LLMPurpose.EMBEDDINGS,
        dimensions: 1536,
        maxTotalTokens: 8192,
      });
    });

    it("should create primary completion model metadata", () => {
      const result = createBedrockTestData(mockManifest, mockEnv);

      expect(result.modelsMetadata.AWS_COMPLETIONS_CLAUDE_V35).toEqual({
        modelKey: "AWS_COMPLETIONS_CLAUDE_V35",
        urn: "anthropic.claude-3-5-sonnet-20240620-v1:0",
        purpose: LLMPurpose.COMPLETIONS,
        maxCompletionTokens: 4096,
        maxTotalTokens: 200000,
      });
    });

    it("should create secondary completion model metadata", () => {
      const result = createBedrockTestData(mockManifest, mockEnv);

      expect(result.modelsMetadata.AWS_COMPLETIONS_CLAUDE_V40).toEqual({
        modelKey: "AWS_COMPLETIONS_CLAUDE_V40",
        urn: "anthropic.claude-3-opus-20240229-v1:0",
        purpose: LLMPurpose.COMPLETIONS,
        maxCompletionTokens: 8192,
        maxTotalTokens: 200000,
      });
    });

    it("should handle manifest without secondary completion model", () => {
      const manifestWithoutSecondary: LLMProviderManifest = {
        ...mockManifest,
        models: {
          embeddings: mockManifest.models.embeddings,
          primaryCompletion: mockManifest.models.primaryCompletion,
        },
      };

      const result = createBedrockTestData(manifestWithoutSecondary, mockEnv);

      expect(result.modelKeysSet.secondaryCompletionModelKey).toBeUndefined();
      expect(result.modelsMetadata.AWS_COMPLETIONS_CLAUDE_V40).toBeUndefined();
    });

    it("should include additional test models when provided", () => {
      const additionalModels: AdditionalTestModel[] = [
        {
          modelKey: "AWS_COMPLETIONS_CUSTOM_MODEL",
          urn: "custom.model-v1:0",
          maxCompletionTokens: 2048,
          maxTotalTokens: 100000,
        },
      ];

      const result = createBedrockTestData(mockManifest, mockEnv, additionalModels);

      expect(result.modelsMetadata.AWS_COMPLETIONS_CUSTOM_MODEL).toEqual({
        modelKey: "AWS_COMPLETIONS_CUSTOM_MODEL",
        urn: "custom.model-v1:0",
        purpose: LLMPurpose.COMPLETIONS,
        maxCompletionTokens: 2048,
        maxTotalTokens: 100000,
      });
    });

    it("should return complete BedrockTestData structure", () => {
      const result: BedrockTestData = createBedrockTestData(mockManifest, mockEnv);

      expect(result).toHaveProperty("mockEnv");
      expect(result).toHaveProperty("modelKeysSet");
      expect(result).toHaveProperty("modelsMetadata");
      expect(typeof result.mockEnv).toBe("object");
      expect(typeof result.modelKeysSet).toBe("object");
      expect(typeof result.modelsMetadata).toBe("object");
    });

    it("should use default maxCompletionTokens for secondary model when not specified", () => {
      const manifestWithoutSecondaryMaxTokens: LLMProviderManifest = {
        ...mockManifest,
        models: {
          ...mockManifest.models,
          secondaryCompletion: {
            modelKey: "AWS_COMPLETIONS_CLAUDE_V40",
            urnEnvKey: "BEDROCK_CLAUDE_COMPLETIONS_MODEL_SECONDARY",
            purpose: LLMPurpose.COMPLETIONS,
            maxTotalTokens: 200000,
            // maxCompletionTokens is intentionally omitted
          },
        },
      };

      const result = createBedrockTestData(manifestWithoutSecondaryMaxTokens, mockEnv);

      expect(result.modelsMetadata.AWS_COMPLETIONS_CLAUDE_V40.maxCompletionTokens).toBe(4096);
    });
  });
});
