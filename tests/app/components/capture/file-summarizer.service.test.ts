/**
 * Tests for FileSummarizerService.
 */

import "reflect-metadata";
import { FileSummarizerService } from "../../../../src/app/components/capture/file-summarizer.service";
import type LLMRouter from "../../../../src/common/llm/llm-router";
import type { PromptRegistry } from "../../../../src/app/prompts/prompt-registry";
import type { SourceConfigMap } from "../../../../src/app/prompts/definitions/sources/sources.config";
import { z } from "zod";
import { LLMError } from "../../../../src/common/llm/types/llm-errors.types";

// Mock dependencies
jest.mock("../../../../src/common/utils/logging", () => ({
  logOneLineError: jest.fn(),
  logOneLineWarning: jest.fn(),
}));

jest.mock("../../../../src/app/components/capture/config/file-types.config", () => ({
  getCanonicalFileType: jest.fn().mockReturnValue("javascript"),
}));

jest.mock("../../../../src/app/prompts/prompt-renderer", () => ({
  renderPrompt: jest.fn().mockReturnValue("rendered prompt"),
}));

jest.mock("../../../../src/app/components/insights/config/sanitizer.config", () => ({
  getSchemaSpecificSanitizerConfig: jest.fn().mockReturnValue({}),
}));

describe("FileSummarizerService", () => {
  let service: FileSummarizerService;
  let mockLLMRouter: jest.Mocked<LLMRouter>;
  let mockPromptRegistry: PromptRegistry;
  let mockSourceConfigMap: SourceConfigMap;

  const mockSchema = z.object({
    name: z.string(),
    purpose: z.string(),
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock LLM router
    mockLLMRouter = {
      executeCompletion: jest.fn(),
      generateEmbeddings: jest.fn(),
      shutdown: jest.fn(),
      getProviderShutdownBehavior: jest.fn(),
      getModelFamily: jest.fn(),
      getModelsUsedDescription: jest.fn(),
      getEmbeddingModelDimensions: jest.fn(),
      getLLMManifest: jest.fn(),
    } as unknown as jest.Mocked<LLMRouter>;

    // Create mock prompt registry
    mockPromptRegistry = {
      sources: {
        javascript: {
          label: "JavaScript",
          hasComplexSchema: true,
          template: "test template",
        },
      },
      appSummaries: {},
      codebaseQuery: {},
    } as unknown as PromptRegistry;

    // Create mock source config map
    mockSourceConfigMap = {
      javascript: {
        contentDesc: "JavaScript code",
        responseSchema: mockSchema,
        instructions: [],
      },
    } as unknown as SourceConfigMap;

    // Create service instance
    service = new FileSummarizerService(mockLLMRouter, mockPromptRegistry, mockSourceConfigMap);
  });

  describe("summarize", () => {
    it("should return summary when LLM returns valid response", async () => {
      const mockResponse = { name: "TestClass", purpose: "Test purpose" };
      (mockLLMRouter.executeCompletion as jest.Mock).mockResolvedValue(mockResponse);

      const result = await service.summarize("test.js", "js", "const x = 1;");

      expect(result).toEqual(mockResponse);
      expect(mockLLMRouter.executeCompletion).toHaveBeenCalledWith(
        "test.js",
        "rendered prompt",
        expect.objectContaining({
          outputFormat: "json",
          jsonSchema: expect.any(Object),
        }),
      );
    });

    it("should throw error when file content is empty", async () => {
      await expect(service.summarize("test.js", "js", "   ")).rejects.toThrow("File is empty");
    });

    it("should throw LLMError when LLM returns null", async () => {
      (mockLLMRouter.executeCompletion as jest.Mock).mockResolvedValue(null);

      await expect(service.summarize("test.js", "js", "const x = 1;")).rejects.toThrow(LLMError);
    });

    it("should propagate errors from LLM router", async () => {
      const error = new Error("LLM failed");
      (mockLLMRouter.executeCompletion as jest.Mock).mockRejectedValue(error);

      await expect(service.summarize("test.js", "js", "const x = 1;")).rejects.toThrow("LLM failed");
    });

    it("should use correct schema from source config map", async () => {
      (mockLLMRouter.executeCompletion as jest.Mock).mockResolvedValue({ name: "Test", purpose: "Test" });

      await service.summarize("test.js", "js", "const x = 1;");

      expect(mockLLMRouter.executeCompletion).toHaveBeenCalledWith(
        "test.js",
        expect.any(String),
        expect.objectContaining({
          jsonSchema: mockSchema,
        }),
      );
    });
  });
});
