import {
  isVertexAIClaudeConfig,
  assertVertexAIClaudeConfig,
  type VertexAIClaudeConfig,
} from "../../../../../../src/common/llm/providers/vertexai/claude/vertex-ai-claude.types";
import { vertexAIClaudeProviderManifest } from "../../../../../../src/common/llm/providers/vertexai/claude/vertex-ai-claude.manifest";
import { LLMError, LLMErrorCode } from "../../../../../../src/common/llm/types/llm-errors.types";

describe("VertexAI Claude Config Types", () => {
  describe("VertexAIClaudeConfig", () => {
    it("should define a valid configuration structure", () => {
      const config: VertexAIClaudeConfig = {
        projectId: "test-project-123",
        location: "us-east5",
      };

      expect(config.projectId).toBe("test-project-123");
      expect(config.location).toBe("us-east5");
    });
  });

  describe("isVertexAIClaudeConfig", () => {
    it("should return true for valid config", () => {
      const validConfig = {
        projectId: "my-project",
        location: "us-east5",
      };

      expect(isVertexAIClaudeConfig(validConfig)).toBe(true);
    });

    it("should return false for null", () => {
      expect(isVertexAIClaudeConfig(null)).toBe(false);
    });

    it("should return false for undefined", () => {
      expect(isVertexAIClaudeConfig(undefined)).toBe(false);
    });

    it("should return false for non-object types", () => {
      expect(isVertexAIClaudeConfig("string")).toBe(false);
      expect(isVertexAIClaudeConfig(123)).toBe(false);
      expect(isVertexAIClaudeConfig(true)).toBe(false);
    });

    it("should return false for objects missing projectId", () => {
      const missingProjectId = {
        location: "us-east5",
      };

      expect(isVertexAIClaudeConfig(missingProjectId)).toBe(false);
    });

    it("should return false for objects missing location", () => {
      const missingLocation = {
        projectId: "my-project",
      };

      expect(isVertexAIClaudeConfig(missingLocation)).toBe(false);
    });

    it("should return false when fields are non-string types", () => {
      const invalidTypes = {
        projectId: 123,
        location: "us-east5",
      };

      expect(isVertexAIClaudeConfig(invalidTypes)).toBe(false);
    });

    it("should return false for empty string values", () => {
      const emptyStrings = {
        projectId: "",
        location: "us-east5",
      };

      expect(isVertexAIClaudeConfig(emptyStrings)).toBe(false);
    });

    it("should return true for config with extra fields", () => {
      const extraFields = {
        projectId: "my-project",
        location: "us-east5",
        extraField: "extra-value",
      };

      expect(isVertexAIClaudeConfig(extraFields)).toBe(true);
    });
  });

  describe("assertVertexAIClaudeConfig", () => {
    it("should return valid config for valid objects", () => {
      const validConfig = {
        projectId: "my-project",
        location: "us-east5",
      };

      const result = assertVertexAIClaudeConfig(validConfig);
      expect(result.projectId).toBe("my-project");
      expect(result.location).toBe("us-east5");
    });

    it("should throw LLMError for null", () => {
      expect(() => assertVertexAIClaudeConfig(null)).toThrow(LLMError);
    });

    it("should throw LLMError for undefined", () => {
      expect(() => assertVertexAIClaudeConfig(undefined)).toThrow(LLMError);
    });

    it("should throw LLMError for non-object types", () => {
      expect(() => assertVertexAIClaudeConfig("string")).toThrow(LLMError);
      expect(() => assertVertexAIClaudeConfig(123)).toThrow(LLMError);
    });

    it("should throw LLMError for objects missing projectId", () => {
      const missingProjectId = {
        location: "us-east5",
      };

      expect(() => assertVertexAIClaudeConfig(missingProjectId)).toThrow(LLMError);
      try {
        assertVertexAIClaudeConfig(missingProjectId);
      } catch (error) {
        expect((error as LLMError).code).toBe(LLMErrorCode.BAD_CONFIGURATION);
        expect((error as LLMError).message).toContain("projectId");
      }
    });

    it("should throw LLMError for objects missing location", () => {
      const missingLocation = {
        projectId: "my-project",
      };

      expect(() => assertVertexAIClaudeConfig(missingLocation)).toThrow(LLMError);
      try {
        assertVertexAIClaudeConfig(missingLocation);
      } catch (error) {
        expect((error as LLMError).code).toBe(LLMErrorCode.BAD_CONFIGURATION);
        expect((error as LLMError).message).toContain("location");
      }
    });

    it("should throw LLMError when fields are non-string types", () => {
      const invalidTypes = {
        projectId: 123,
        location: "us-east5",
      };

      expect(() => assertVertexAIClaudeConfig(invalidTypes)).toThrow(LLMError);
    });

    it("should strip extra fields not in schema", () => {
      const extraFields = {
        projectId: "my-project",
        location: "us-east5",
        extraField: "extra-value",
      };

      const result = assertVertexAIClaudeConfig(extraFields);
      expect(result.projectId).toBe("my-project");
      expect(result.location).toBe("us-east5");
      expect(Object.hasOwn(result as Record<string, unknown>, "extraField")).toBe(false);
    });
  });

  describe("vertexAIClaudeProviderManifest.extractConfig", () => {
    it("should extract and validate config from common VertexAI params", () => {
      const providerParams = {
        VERTEXAI_PROJECTID: "my-gcp-project",
        VERTEXAI_COMPLETIONS_LOCATION: "global",
      };

      const config = vertexAIClaudeProviderManifest.extractConfig(providerParams);

      expect(config).toEqual({
        projectId: "my-gcp-project",
        location: "global",
      });
    });

    it("should throw LLMError for missing projectId", () => {
      const providerParams = {
        VERTEXAI_COMPLETIONS_LOCATION: "global",
      };

      expect(() => vertexAIClaudeProviderManifest.extractConfig(providerParams)).toThrow(LLMError);
    });

    it("should throw LLMError for missing location", () => {
      const providerParams = {
        VERTEXAI_PROJECTID: "my-gcp-project",
      };

      expect(() => vertexAIClaudeProviderManifest.extractConfig(providerParams)).toThrow(LLMError);
    });

    it("should throw LLMError when all params are missing", () => {
      const emptyParams = {};

      expect(() => vertexAIClaudeProviderManifest.extractConfig(emptyParams)).toThrow(LLMError);
    });
  });

  describe("vertexAIClaudeProviderManifest", () => {
    it("should have correct provider family", () => {
      expect(vertexAIClaudeProviderManifest.providerFamily).toBe("VertexAIClaude");
    });

    it("should have empty embeddings array", () => {
      expect(vertexAIClaudeProviderManifest.models.embeddings).toEqual([]);
    });

    it("should have three completion models", () => {
      expect(vertexAIClaudeProviderManifest.models.completions).toHaveLength(3);
    });

    it("should have opus-4.6 completion model with 1M context", () => {
      const opusModel = vertexAIClaudeProviderManifest.models.completions.find(
        (m) => m.modelKey === "vertexai-claude-opus-4.6",
      );
      expect(opusModel).toBeDefined();
      expect(opusModel?.maxCompletionTokens).toBe(128000);
      expect(opusModel?.maxTotalTokens).toBe(1000000);
    });

    it("should have opus-4.5 completion model", () => {
      const opusModel = vertexAIClaudeProviderManifest.models.completions.find(
        (m) => m.modelKey === "vertexai-claude-opus-4.5",
      );
      expect(opusModel).toBeDefined();
      expect(opusModel?.maxCompletionTokens).toBe(64000);
      expect(opusModel?.maxTotalTokens).toBe(200000);
    });

    it("should have sonnet-4.5 completion model", () => {
      const sonnetModel = vertexAIClaudeProviderManifest.models.completions.find(
        (m) => m.modelKey === "vertexai-claude-sonnet-4.5",
      );
      expect(sonnetModel).toBeDefined();
      expect(sonnetModel?.maxCompletionTokens).toBe(64000);
      expect(sonnetModel?.maxTotalTokens).toBe(200000);
    });

    it("should have error patterns defined", () => {
      expect(vertexAIClaudeProviderManifest.errorPatterns.length).toBeGreaterThan(0);
    });

    it("should have appropriate timeout under SDK streaming limit", () => {
      // 9.5 minutes - must be under 10 minutes (SDK limit for non-streaming)
      expect(vertexAIClaudeProviderManifest.providerSpecificConfig.requestTimeoutMillis).toBe(
        9.5 * 60 * 1000,
      );
    });

    it("should have anthropicBetaFlags for 1M context", () => {
      expect(vertexAIClaudeProviderManifest.providerSpecificConfig.anthropicBetaFlags).toContain(
        "context-1m-2025-08-07",
      );
    });
  });
});
