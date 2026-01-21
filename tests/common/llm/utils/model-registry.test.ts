import {
  getProviderFamilyForModelKey,
  getAllModelKeys,
  isValidModelKey,
  resetModelRegistryCache,
} from "../../../../src/common/llm/utils/model-registry";
import { LLMError, LLMErrorCode } from "../../../../src/common/llm/types/llm-errors.types";

describe("model-registry", () => {
  beforeEach(() => {
    // Reset registry cache before each test to ensure clean state
    resetModelRegistryCache();
  });

  describe("getProviderFamilyForModelKey", () => {
    it("should return correct provider family for VertexAI Gemini model", () => {
      const provider = getProviderFamilyForModelKey("vertexai-gemini-3-pro");
      expect(provider).toBe("VertexAIGemini");
    });

    it("should return correct provider family for Bedrock Claude model", () => {
      const provider = getProviderFamilyForModelKey("bedrock-claude-opus-4.5");
      expect(provider).toBe("BedrockClaude");
    });

    it("should return correct provider family for OpenAI model", () => {
      const provider = getProviderFamilyForModelKey("openai-gpt-5");
      expect(provider).toBe("OpenAI");
    });

    it("should return correct provider family for Azure OpenAI model", () => {
      const provider = getProviderFamilyForModelKey("azure-gpt-4o");
      expect(provider).toBe("AzureOpenAI");
    });

    it("should return correct provider family for Bedrock Nova embeddings model", () => {
      const provider = getProviderFamilyForModelKey("bedrock-amazon-titan-embed-text");
      expect(provider).toBe("BedrockNova");
    });

    it("should throw LLMError for unknown model key", () => {
      expect(() => getProviderFamilyForModelKey("unknown-model")).toThrow(LLMError);
      try {
        getProviderFamilyForModelKey("unknown-model");
      } catch (error) {
        expect(error).toBeInstanceOf(LLMError);
        expect((error as LLMError).code).toBe(LLMErrorCode.BAD_CONFIGURATION);
        expect((error as LLMError).message).toContain('Unknown model key "unknown-model"');
      }
    });
  });

  describe("getAllModelKeys", () => {
    it("should return an array of all model keys", () => {
      const allKeys = getAllModelKeys();
      expect(Array.isArray(allKeys)).toBe(true);
      expect(allKeys.length).toBeGreaterThan(0);
    });

    it("should return sorted array", () => {
      const allKeys = getAllModelKeys();
      const sortedKeys = [...allKeys].sort();
      expect(allKeys).toEqual(sortedKeys);
    });

    it("should include models from multiple providers", () => {
      const allKeys = getAllModelKeys();
      // Check for models from different providers
      expect(allKeys).toContain("vertexai-gemini-3-pro"); // VertexAI
      expect(allKeys).toContain("bedrock-claude-opus-4.5"); // Bedrock Claude
      expect(allKeys).toContain("openai-gpt-5"); // OpenAI
      expect(allKeys).toContain("azure-gpt-4o"); // Azure OpenAI
    });

    it("should include both completions and embeddings models", () => {
      const allKeys = getAllModelKeys();
      // Completions models
      expect(allKeys).toContain("vertexai-gemini-3-pro");
      // Embeddings models
      expect(allKeys).toContain("vertexai-gemini-embedding-001");
      expect(allKeys).toContain("openai-text-embedding-3-small");
    });
  });

  describe("isValidModelKey", () => {
    it("should return true for valid model keys", () => {
      expect(isValidModelKey("vertexai-gemini-3-pro")).toBe(true);
      expect(isValidModelKey("bedrock-claude-opus-4.5")).toBe(true);
      expect(isValidModelKey("openai-gpt-5")).toBe(true);
    });

    it("should return false for invalid model keys", () => {
      expect(isValidModelKey("unknown-model")).toBe(false);
      expect(isValidModelKey("")).toBe(false);
      expect(isValidModelKey("gpt-4o")).toBe(false); // Old format without prefix
    });
  });

  describe("duplicate detection", () => {
    // The current implementation validates at registry build time.
    // Since our manifests now have unique model keys, this should pass.
    it("should successfully build registry when all model keys are unique", () => {
      // This should not throw - registry builds successfully
      expect(() => getAllModelKeys()).not.toThrow();
    });
  });

  describe("registry caching", () => {
    it("should return same results on multiple calls (caching works)", () => {
      const firstCall = getAllModelKeys();
      const secondCall = getAllModelKeys();
      expect(firstCall).toEqual(secondCall);
    });

    it("should return same provider for same model key on multiple calls", () => {
      const firstCall = getProviderFamilyForModelKey("vertexai-gemini-3-pro");
      const secondCall = getProviderFamilyForModelKey("vertexai-gemini-3-pro");
      expect(firstCall).toBe(secondCall);
    });
  });
});
