import {
  llmOk,
  llmErr,
  isLLMOk,
  isLLMErr,
  createExecutionMetadata,
  type LLMResult,
} from "../../../../src/common/llm/types/llm-result.types";
import { LLMExecutionError } from "../../../../src/common/llm/types/llm-execution-error.types";

describe("LLMResult Types", () => {
  describe("createExecutionMetadata", () => {
    it("should create metadata with correct modelId format", () => {
      const meta = createExecutionMetadata("claude-opus-4.5", "BedrockClaude");

      expect(meta.modelId).toBe("BedrockClaude/claude-opus-4.5");
      expect(meta.modelKey).toBe("claude-opus-4.5");
      expect(meta.providerFamily).toBe("BedrockClaude");
    });

    it("should handle different provider families", () => {
      const openaiMeta = createExecutionMetadata("gpt-4", "OpenAI");
      const vertexMeta = createExecutionMetadata("gemini-pro", "VertexAI");

      expect(openaiMeta.modelId).toBe("OpenAI/gpt-4");
      expect(vertexMeta.modelId).toBe("VertexAI/gemini-pro");
    });
  });

  describe("llmOk", () => {
    it("should create a successful result with value and metadata", () => {
      const meta = createExecutionMetadata("test-model", "TestProvider");
      const result = llmOk({ answer: "test" }, meta);

      expect(result.ok).toBe(true);
      expect(result.value).toEqual({ answer: "test" });
      expect(result.meta).toBe(meta);
    });

    it("should work with string values", () => {
      const meta = createExecutionMetadata("text-model", "Provider");
      const result = llmOk("Hello, world!", meta);

      expect(result.ok).toBe(true);
      expect(result.value).toBe("Hello, world!");
    });

    it("should work with array values (embeddings)", () => {
      const meta = createExecutionMetadata("embed-model", "Provider");
      const embeddings = [0.1, 0.2, 0.3];
      const result = llmOk(embeddings, meta);

      expect(result.ok).toBe(true);
      expect(result.value).toEqual(embeddings);
    });
  });

  describe("llmErr", () => {
    it("should create a failed result with error", () => {
      const error = new LLMExecutionError("Test error", "test-resource");
      const result = llmErr(error);

      expect(result.ok).toBe(false);
      expect(result.error).toBe(error);
    });

    it("should preserve error details", () => {
      const context = { resource: "test", purpose: "completions" as const };
      const error = new LLMExecutionError("Detailed error", "resource-name", context);
      const result = llmErr(error);

      expect(result.error.message).toBe("Detailed error");
      expect(result.error.resourceName).toBe("resource-name");
      expect(result.error.context).toBe(context);
    });
  });

  describe("isLLMOk", () => {
    it("should return true for successful results", () => {
      const meta = createExecutionMetadata("model", "Provider");
      const result: LLMResult<string> = llmOk("success", meta);

      expect(isLLMOk(result)).toBe(true);
    });

    it("should return false for failed results", () => {
      const error = new LLMExecutionError("Test error", "resource");
      const result: LLMResult<string> = llmErr(error);

      expect(isLLMOk(result)).toBe(false);
    });

    it("should narrow type to LLMOkResult", () => {
      const meta = createExecutionMetadata("model", "Provider");
      const result: LLMResult<string> = llmOk("test", meta);

      if (isLLMOk(result)) {
        // TypeScript should allow access to value and meta
        expect(result.value).toBe("test");
        expect(result.meta.modelId).toBe("Provider/model");
      }
    });
  });

  describe("isLLMErr", () => {
    it("should return true for failed results", () => {
      const error = new LLMExecutionError("Test error", "resource");
      const result: LLMResult<string> = llmErr(error);

      expect(isLLMErr(result)).toBe(true);
    });

    it("should return false for successful results", () => {
      const meta = createExecutionMetadata("model", "Provider");
      const result: LLMResult<string> = llmOk("success", meta);

      expect(isLLMErr(result)).toBe(false);
    });

    it("should narrow type to LLMErrResult", () => {
      const error = new LLMExecutionError("Test error", "resource");
      const result: LLMResult<string> = llmErr(error);

      if (isLLMErr(result)) {
        // TypeScript should allow access to error
        expect(result.error.message).toBe("Test error");
        expect(result.error.resourceName).toBe("resource");
      }
    });
  });

  describe("Type narrowing with both guards", () => {
    it("should correctly narrow types in if-else branches", () => {
      const meta = createExecutionMetadata("model", "Provider");
      const successResult: LLMResult<{ data: number }> = llmOk({ data: 42 }, meta);
      const errorResult: LLMResult<{ data: number }> = llmErr(
        new LLMExecutionError("Failed", "resource"),
      );

      // Success case
      if (isLLMOk(successResult)) {
        expect(successResult.value.data).toBe(42);
        expect(successResult.meta.modelId).toBe("Provider/model");
      } else {
        fail("Should have been successful");
      }

      // Error case
      if (isLLMErr(errorResult)) {
        expect(errorResult.error.message).toBe("Failed");
      } else {
        fail("Should have been an error");
      }
    });

    it("should work with generic types", () => {
      interface CustomResponse {
        summary: string;
        confidence: number;
      }

      const meta = createExecutionMetadata("custom-model", "CustomProvider");
      const result: LLMResult<CustomResponse> = llmOk(
        { summary: "Test summary", confidence: 0.95 },
        meta,
      );

      if (isLLMOk(result)) {
        expect(result.value.summary).toBe("Test summary");
        expect(result.value.confidence).toBe(0.95);
      }
    });
  });
});
