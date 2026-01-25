import {
  buildModelRegistry,
  getProviderFamilyForModelKey,
  getAllModelKeys,
  isValidModelKey,
} from "../../../../src/common/llm/utils/model-registry";
import { LLMError, LLMErrorCode } from "../../../../src/common/llm/types/llm-errors.types";
import { APP_PROVIDER_REGISTRY } from "../../../../src/app/llm/provider-registry";

describe("model-registry", () => {
  // Build the model registry once for all tests
  const modelRegistry = buildModelRegistry(APP_PROVIDER_REGISTRY);

  describe("getProviderFamilyForModelKey", () => {
    it("should return correct provider family for VertexAI Gemini model", () => {
      const provider = getProviderFamilyForModelKey("vertexai-gemini-3-pro", modelRegistry);
      expect(provider).toBe("VertexAIGemini");
    });

    it("should return correct provider family for Bedrock Claude model", () => {
      const provider = getProviderFamilyForModelKey("bedrock-claude-opus-4.5", modelRegistry);
      expect(provider).toBe("BedrockClaude");
    });

    it("should return correct provider family for OpenAI model", () => {
      const provider = getProviderFamilyForModelKey("openai-gpt-5", modelRegistry);
      expect(provider).toBe("OpenAI");
    });

    it("should return correct provider family for Azure OpenAI model", () => {
      const provider = getProviderFamilyForModelKey("azure-gpt-4o", modelRegistry);
      expect(provider).toBe("AzureOpenAI");
    });

    it("should return correct provider family for Bedrock Nova embeddings model", () => {
      const provider = getProviderFamilyForModelKey(
        "bedrock-amazon-titan-embed-text",
        modelRegistry,
      );
      expect(provider).toBe("BedrockNova");
    });

    it("should throw LLMError for unknown model key", () => {
      expect(() => getProviderFamilyForModelKey("unknown-model", modelRegistry)).toThrow(LLMError);
      try {
        getProviderFamilyForModelKey("unknown-model", modelRegistry);
      } catch (error) {
        expect(error).toBeInstanceOf(LLMError);
        expect((error as LLMError).code).toBe(LLMErrorCode.BAD_CONFIGURATION);
        expect((error as LLMError).message).toContain('Unknown model key "unknown-model"');
      }
    });
  });

  describe("getAllModelKeys", () => {
    it("should return an array of all model keys", () => {
      const allKeys = getAllModelKeys(modelRegistry);
      expect(Array.isArray(allKeys)).toBe(true);
      expect(allKeys.length).toBeGreaterThan(0);
    });

    it("should return sorted array", () => {
      const allKeys = getAllModelKeys(modelRegistry);
      const sortedKeys = [...allKeys].sort();
      expect(allKeys).toEqual(sortedKeys);
    });

    it("should include models from multiple providers", () => {
      const allKeys = getAllModelKeys(modelRegistry);
      // Check for models from different providers
      expect(allKeys).toContain("vertexai-gemini-3-pro"); // VertexAI
      expect(allKeys).toContain("bedrock-claude-opus-4.5"); // Bedrock Claude
      expect(allKeys).toContain("openai-gpt-5"); // OpenAI
      expect(allKeys).toContain("azure-gpt-4o"); // Azure OpenAI
    });

    it("should include both completions and embeddings models", () => {
      const allKeys = getAllModelKeys(modelRegistry);
      // Completions models
      expect(allKeys).toContain("vertexai-gemini-3-pro");
      // Embeddings models
      expect(allKeys).toContain("vertexai-gemini-embedding-001");
      expect(allKeys).toContain("openai-text-embedding-3-small");
    });
  });

  describe("isValidModelKey", () => {
    it("should return true for valid model keys", () => {
      expect(isValidModelKey("vertexai-gemini-3-pro", modelRegistry)).toBe(true);
      expect(isValidModelKey("bedrock-claude-opus-4.5", modelRegistry)).toBe(true);
      expect(isValidModelKey("openai-gpt-5", modelRegistry)).toBe(true);
    });

    it("should return false for invalid model keys", () => {
      expect(isValidModelKey("unknown-model", modelRegistry)).toBe(false);
      expect(isValidModelKey("", modelRegistry)).toBe(false);
      expect(isValidModelKey("gpt-4o", modelRegistry)).toBe(false); // Old format without prefix
    });
  });

  describe("duplicate detection", () => {
    // The current implementation validates at registry build time.
    // Since our manifests now have unique model keys, this should pass.
    it("should successfully build registry when all model keys are unique", () => {
      // This should not throw - registry builds successfully
      expect(() => buildModelRegistry(APP_PROVIDER_REGISTRY)).not.toThrow();
    });
  });

  describe("registry building", () => {
    it("should return same results from same registry", () => {
      const firstRegistry = buildModelRegistry(APP_PROVIDER_REGISTRY);
      const secondRegistry = buildModelRegistry(APP_PROVIDER_REGISTRY);
      expect(getAllModelKeys(firstRegistry)).toEqual(getAllModelKeys(secondRegistry));
    });

    it("should return same provider for same model key", () => {
      const firstCall = getProviderFamilyForModelKey("vertexai-gemini-3-pro", modelRegistry);
      const secondCall = getProviderFamilyForModelKey("vertexai-gemini-3-pro", modelRegistry);
      expect(firstCall).toBe(secondCall);
    });
  });
});
