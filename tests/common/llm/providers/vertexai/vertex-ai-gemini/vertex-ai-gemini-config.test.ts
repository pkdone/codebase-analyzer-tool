import {
  isVertexAIGeminiConfig,
  type VertexAIGeminiConfig,
} from "../../../../../../src/common/llm/providers/vertexai/gemini/vertex-ai-gemini.types";
import { vertexAIGeminiProviderManifest } from "../../../../../../src/common/llm/providers/vertexai/gemini/vertex-ai-gemini.manifest";

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

  describe("isVertexAIGeminiConfig type guard", () => {
    it("should return true for valid config objects", () => {
      const validConfig = {
        projectId: "my-project",
        embeddingsLocation: "us-east1",
        completionsLocation: "us-central1",
      };

      expect(isVertexAIGeminiConfig(validConfig)).toBe(true);
    });

    it("should return false for null", () => {
      expect(isVertexAIGeminiConfig(null)).toBe(false);
    });

    it("should return false for undefined", () => {
      expect(isVertexAIGeminiConfig(undefined)).toBe(false);
    });

    it("should return false for non-object types", () => {
      expect(isVertexAIGeminiConfig("string")).toBe(false);
      expect(isVertexAIGeminiConfig(123)).toBe(false);
      expect(isVertexAIGeminiConfig([])).toBe(false);
    });

    it("should return false for objects missing projectId", () => {
      const missingProjectId = {
        embeddingsLocation: "us-central1",
        completionsLocation: "global",
      };

      expect(isVertexAIGeminiConfig(missingProjectId)).toBe(false);
    });

    it("should return false for objects missing embeddingsLocation", () => {
      const missingEmbeddingsLocation = {
        projectId: "my-project",
        completionsLocation: "global",
      };

      expect(isVertexAIGeminiConfig(missingEmbeddingsLocation)).toBe(false);
    });

    it("should return false for objects missing completionsLocation", () => {
      const missingCompletionsLocation = {
        projectId: "my-project",
        embeddingsLocation: "us-central1",
      };

      expect(isVertexAIGeminiConfig(missingCompletionsLocation)).toBe(false);
    });

    it("should return false when fields are non-string types", () => {
      const invalidTypes = {
        projectId: 123,
        embeddingsLocation: "us-central1",
        completionsLocation: "global",
      };

      expect(isVertexAIGeminiConfig(invalidTypes)).toBe(false);
    });

    it("should allow extra fields", () => {
      const extraFields = {
        projectId: "my-project",
        embeddingsLocation: "us-central1",
        completionsLocation: "global",
        extraField: "extra-value",
      };

      expect(isVertexAIGeminiConfig(extraFields)).toBe(true);
    });
  });

  describe("vertexAIGeminiProviderManifest.extractConfig", () => {
    it("should extract config from provider params", () => {
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

    it("should return extracted config that passes type guard", () => {
      const providerParams = {
        VERTEXAI_PROJECTID: "test-project",
        VERTEXAI_EMBEDDINGS_LOCATION: "us-central1",
        VERTEXAI_COMPLETIONS_LOCATION: "global",
      };

      const config = vertexAIGeminiProviderManifest.extractConfig(providerParams);

      expect(isVertexAIGeminiConfig(config)).toBe(true);
    });

    it("should handle missing env vars gracefully (undefined values)", () => {
      const providerParams = {
        VERTEXAI_PROJECTID: "test-project",
        // Missing VERTEXAI_EMBEDDINGS_LOCATION and VERTEXAI_COMPLETIONS_LOCATION
      };

      const config = vertexAIGeminiProviderManifest.extractConfig(providerParams);

      // The extractor should still return an object, but with undefined values
      // Type guard should fail for incomplete config
      expect(isVertexAIGeminiConfig(config)).toBe(false);
    });
  });
});
