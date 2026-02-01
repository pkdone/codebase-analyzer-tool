import {
  assertVertexAIGeminiConfig,
  type VertexAIGeminiConfig,
} from "../../../../../../src/common/llm/providers/vertexai/gemini/vertex-ai-gemini.types";
import { vertexAIGeminiProviderManifest } from "../../../../../../src/common/llm/providers/vertexai/gemini/vertex-ai-gemini.manifest";
import { LLMError, LLMErrorCode } from "../../../../../../src/common/llm/types/llm-errors.types";

describe("VertexAI Gemini Config Types", () => {
  describe("VertexAIGeminiConfig", () => {
    it("should define a valid configuration structure", () => {
      const config: VertexAIGeminiConfig = {
        projectId: "test-project-123",
        embeddingsLocation: "us-central1",
        completionsLocation: "global",
      };

      expect(config.projectId).toBe("test-project-123");
      expect(config.embeddingsLocation).toBe("us-central1");
      expect(config.completionsLocation).toBe("global");
    });
  });

  describe("assertVertexAIGeminiConfig", () => {
    it("should return valid config for valid objects", () => {
      const validConfig = {
        projectId: "my-project",
        embeddingsLocation: "us-east1",
        completionsLocation: "us-central1",
      };

      const result = assertVertexAIGeminiConfig(validConfig);
      expect(result.projectId).toBe("my-project");
      expect(result.embeddingsLocation).toBe("us-east1");
      expect(result.completionsLocation).toBe("us-central1");
    });

    it("should throw LLMError for null", () => {
      expect(() => assertVertexAIGeminiConfig(null)).toThrow(LLMError);
    });

    it("should throw LLMError for undefined", () => {
      expect(() => assertVertexAIGeminiConfig(undefined)).toThrow(LLMError);
    });

    it("should throw LLMError for non-object types", () => {
      expect(() => assertVertexAIGeminiConfig("string")).toThrow(LLMError);
      expect(() => assertVertexAIGeminiConfig(123)).toThrow(LLMError);
    });

    it("should throw LLMError for objects missing projectId", () => {
      const missingProjectId = {
        embeddingsLocation: "us-central1",
        completionsLocation: "global",
      };

      expect(() => assertVertexAIGeminiConfig(missingProjectId)).toThrow(LLMError);
      try {
        assertVertexAIGeminiConfig(missingProjectId);
      } catch (error) {
        expect((error as LLMError).code).toBe(LLMErrorCode.BAD_CONFIGURATION);
        expect((error as LLMError).message).toContain("projectId");
      }
    });

    it("should throw LLMError for objects missing embeddingsLocation", () => {
      const missingEmbeddingsLocation = {
        projectId: "my-project",
        completionsLocation: "global",
      };

      expect(() => assertVertexAIGeminiConfig(missingEmbeddingsLocation)).toThrow(LLMError);
    });

    it("should throw LLMError for objects missing completionsLocation", () => {
      const missingCompletionsLocation = {
        projectId: "my-project",
        embeddingsLocation: "us-central1",
      };

      expect(() => assertVertexAIGeminiConfig(missingCompletionsLocation)).toThrow(LLMError);
    });

    it("should throw LLMError when fields are non-string types", () => {
      const invalidTypes = {
        projectId: 123,
        embeddingsLocation: "us-central1",
        completionsLocation: "global",
      };

      expect(() => assertVertexAIGeminiConfig(invalidTypes)).toThrow(LLMError);
    });

    it("should allow extra fields", () => {
      const extraFields = {
        projectId: "my-project",
        embeddingsLocation: "us-central1",
        completionsLocation: "global",
        extraField: "extra-value",
      };

      const result = assertVertexAIGeminiConfig(extraFields);
      expect(result.projectId).toBe("my-project");
      expect(result.extraField).toBe("extra-value");
    });
  });

  describe("vertexAIGeminiProviderManifest.extractConfig", () => {
    it("should extract and validate config from provider params", () => {
      const providerParams = {
        VERTEXAI_PROJECTID: "my-gcp-project",
        VERTEXAI_EMBEDDINGS_LOCATION: "europe-west1",
        VERTEXAI_COMPLETIONS_LOCATION: "us-central1",
      };

      const config = vertexAIGeminiProviderManifest.extractConfig(providerParams);

      expect(config).toEqual({
        projectId: "my-gcp-project",
        embeddingsLocation: "europe-west1",
        completionsLocation: "us-central1",
      });
    });

    it("should throw LLMError for missing env vars", () => {
      const providerParams = {
        VERTEXAI_PROJECTID: "test-project",
        // Missing VERTEXAI_EMBEDDINGS_LOCATION and VERTEXAI_COMPLETIONS_LOCATION
      };

      // The extractor now throws on invalid config instead of returning undefined values
      expect(() => vertexAIGeminiProviderManifest.extractConfig(providerParams)).toThrow(LLMError);
    });

    it("should throw LLMError when all env vars are missing", () => {
      const emptyParams = {};

      expect(() => vertexAIGeminiProviderManifest.extractConfig(emptyParams)).toThrow(LLMError);
    });
  });
});
