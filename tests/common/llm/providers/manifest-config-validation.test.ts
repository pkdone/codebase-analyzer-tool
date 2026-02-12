import "reflect-metadata";
import { describe, test, expect } from "@jest/globals";
import { assertOpenAIConfig } from "../../../../src/common/llm/providers/openai/openai/openai.types";
import { assertVertexAIGeminiConfig } from "../../../../src/common/llm/providers/vertexai/gemini/vertex-ai-gemini.types";
import { LLMError, LLMErrorCode } from "../../../../src/common/llm/types/llm-errors.types";

describe("Provider Config Validation", () => {
  describe("assertOpenAIConfig", () => {
    test("should return valid config when apiKey is provided", () => {
      const config = { apiKey: "sk-test-key-12345" };
      const result = assertOpenAIConfig(config);

      expect(result).toEqual(config);
      expect(result.apiKey).toBe("sk-test-key-12345");
    });

    test("should throw LLMError when config is null", () => {
      expect(() => assertOpenAIConfig(null)).toThrow(LLMError);
      try {
        assertOpenAIConfig(null);
      } catch (error) {
        expect(error).toBeInstanceOf(LLMError);
        expect((error as LLMError).code).toBe(LLMErrorCode.BAD_CONFIGURATION);
        expect((error as LLMError).message).toContain("expected an object");
      }
    });

    test("should throw LLMError when config is not an object", () => {
      expect(() => assertOpenAIConfig("string")).toThrow(LLMError);
      expect(() => assertOpenAIConfig(123)).toThrow(LLMError);
      expect(() => assertOpenAIConfig(undefined)).toThrow(LLMError);
    });

    test("should throw LLMError when apiKey is missing", () => {
      expect(() => assertOpenAIConfig({})).toThrow(LLMError);
      try {
        assertOpenAIConfig({});
      } catch (error) {
        expect(error).toBeInstanceOf(LLMError);
        expect((error as LLMError).message).toContain("apiKey");
      }
    });

    test("should throw LLMError when apiKey is not a string", () => {
      expect(() => assertOpenAIConfig({ apiKey: 12345 })).toThrow(LLMError);
      expect(() => assertOpenAIConfig({ apiKey: null })).toThrow(LLMError);
    });

    test("should throw LLMError when apiKey is empty string", () => {
      expect(() => assertOpenAIConfig({ apiKey: "" })).toThrow(LLMError);
      try {
        assertOpenAIConfig({ apiKey: "" });
      } catch (error) {
        expect(error).toBeInstanceOf(LLMError);
        // Zod min(1) validation message
        expect((error as LLMError).message).toContain("apiKey");
      }
    });

    test("should not preserve additional properties not in schema", () => {
      const config = { apiKey: "sk-test", extraProperty: "value" };
      const result = assertOpenAIConfig(config);

      expect(result.apiKey).toBe("sk-test");
      expect(Object.hasOwn(result as Record<string, unknown>, "extraProperty")).toBe(false);
    });
  });

  describe("assertVertexAIGeminiConfig", () => {
    const validConfig = {
      projectId: "my-gcp-project",
      embeddingsLocation: "us-central1",
      completionsLocation: "global",
    };

    test("should return valid config when all required fields are provided", () => {
      const result = assertVertexAIGeminiConfig(validConfig);

      expect(result).toEqual(validConfig);
      expect(result.projectId).toBe("my-gcp-project");
      expect(result.embeddingsLocation).toBe("us-central1");
      expect(result.completionsLocation).toBe("global");
    });

    test("should throw LLMError when config is null", () => {
      expect(() => assertVertexAIGeminiConfig(null)).toThrow(LLMError);
      try {
        assertVertexAIGeminiConfig(null);
      } catch (error) {
        expect(error).toBeInstanceOf(LLMError);
        expect((error as LLMError).code).toBe(LLMErrorCode.BAD_CONFIGURATION);
      }
    });

    test("should throw LLMError when config is not an object", () => {
      expect(() => assertVertexAIGeminiConfig("string")).toThrow(LLMError);
      expect(() => assertVertexAIGeminiConfig(123)).toThrow(LLMError);
      expect(() => assertVertexAIGeminiConfig(undefined)).toThrow(LLMError);
    });

    test("should throw LLMError when projectId is missing", () => {
      const config = { embeddingsLocation: "us-central1", completionsLocation: "global" };
      expect(() => assertVertexAIGeminiConfig(config)).toThrow(LLMError);
      try {
        assertVertexAIGeminiConfig(config);
      } catch (error) {
        expect((error as LLMError).message).toContain("projectId");
      }
    });

    test("should throw LLMError when embeddingsLocation is missing", () => {
      const config = { projectId: "my-project", completionsLocation: "global" };
      expect(() => assertVertexAIGeminiConfig(config)).toThrow(LLMError);
      try {
        assertVertexAIGeminiConfig(config);
      } catch (error) {
        expect((error as LLMError).message).toContain("embeddingsLocation");
      }
    });

    test("should throw LLMError when completionsLocation is missing", () => {
      const config = { projectId: "my-project", embeddingsLocation: "us-central1" };
      expect(() => assertVertexAIGeminiConfig(config)).toThrow(LLMError);
      try {
        assertVertexAIGeminiConfig(config);
      } catch (error) {
        expect((error as LLMError).message).toContain("completionsLocation");
      }
    });

    test("should throw LLMError listing all missing fields", () => {
      expect(() => assertVertexAIGeminiConfig({})).toThrow(LLMError);
      try {
        assertVertexAIGeminiConfig({});
      } catch (error) {
        const message = (error as LLMError).message;
        expect(message).toContain("projectId");
        expect(message).toContain("embeddingsLocation");
        expect(message).toContain("completionsLocation");
      }
    });

    test("should throw LLMError when fields are empty strings", () => {
      const config = {
        projectId: "",
        embeddingsLocation: "us-central1",
        completionsLocation: "global",
      };
      expect(() => assertVertexAIGeminiConfig(config)).toThrow(LLMError);
    });

    test("should throw LLMError when fields are not strings", () => {
      const config1 = {
        projectId: 123,
        embeddingsLocation: "us-central1",
        completionsLocation: "global",
      };
      expect(() => assertVertexAIGeminiConfig(config1)).toThrow(LLMError);

      const config2 = {
        projectId: "project",
        embeddingsLocation: null,
        completionsLocation: "global",
      };
      expect(() => assertVertexAIGeminiConfig(config2)).toThrow(LLMError);
    });

    test("should not preserve additional properties not in schema", () => {
      const config = { ...validConfig, extraProperty: "value" };
      const result = assertVertexAIGeminiConfig(config);

      expect(result.projectId).toBe("my-gcp-project");
      expect(result.embeddingsLocation).toBe("us-central1");
      expect(result.completionsLocation).toBe("global");
      expect(Object.hasOwn(result as Record<string, unknown>, "extraProperty")).toBe(false);
    });
  });
});
