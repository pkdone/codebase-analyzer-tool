/**
 * Tests for FileSummarizerService.
 */

import "reflect-metadata";
import { FileSummarizerService } from "../../../../src/app/components/capture/file-summarizer.service";
import type LLMRouter from "../../../../src/common/llm/llm-router";
import type { PromptManager } from "../../../../src/app/prompts/prompt-registry";
import type { SourceConfigMap } from "../../../../src/app/prompts/definitions/sources/sources.definitions";
import { z } from "zod";
import { LLMError, LLMErrorCode } from "../../../../src/common/llm/types/llm-errors.types";
import { ok, err, isOk, isErr } from "../../../../src/common/types/result.types";

// Mock dependencies
jest.mock("../../../../src/common/utils/logging", () => ({
  logOneLineError: jest.fn(),
  logOneLineWarning: jest.fn(),
}));

jest.mock("../../../../src/app/config/file-handling", () => ({
  getCanonicalFileType: jest.fn().mockReturnValue("javascript"),
}));

jest.mock("../../../../src/app/prompts/prompt-renderer", () => ({
  renderPrompt: jest.fn().mockReturnValue("rendered prompt"),
}));

jest.mock("../../../../src/app/config/llm-artifact-corrections", () => ({
  getLlmArtifactCorrections: jest.fn().mockReturnValue({}),
}));

describe("FileSummarizerService", () => {
  let service: FileSummarizerService;
  let mockLLMRouter: jest.Mocked<LLMRouter>;
  let mockPromptManager: PromptManager;
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
    mockPromptManager = {
      sources: {
        javascript: {
          label: "JavaScript",
          hasComplexSchema: true,
          template: "test template",
        },
      },
      appSummaries: {},
      codebaseQuery: {},
    } as unknown as PromptManager;

    // Create mock source config map
    mockSourceConfigMap = {
      javascript: {
        contentDesc: "JavaScript code",
        responseSchema: mockSchema,
        instructions: [],
      },
    } as unknown as SourceConfigMap;

    // Create service instance
    service = new FileSummarizerService(mockLLMRouter, mockPromptManager, mockSourceConfigMap);
  });

  describe("summarize", () => {
    it("should return ok result with summary when LLM returns valid response", async () => {
      const mockResponse = { name: "TestClass", purpose: "Test purpose" };
      (mockLLMRouter.executeCompletion as jest.Mock).mockResolvedValue(ok(mockResponse));

      const result = await service.summarize("test.js", "js", "const x = 1;");

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toEqual(mockResponse);
      }
      expect(mockLLMRouter.executeCompletion).toHaveBeenCalledWith(
        "test.js",
        "rendered prompt",
        expect.objectContaining({
          outputFormat: "json",
          jsonSchema: expect.any(Object),
        }),
      );
    });

    it("should return err result when file content is empty", async () => {
      const result = await service.summarize("test.js", "js", "   ");

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain("empty");
      }
    });

    it("should return err result when LLM returns err", async () => {
      (mockLLMRouter.executeCompletion as jest.Mock).mockResolvedValue(
        err(new LLMError(LLMErrorCode.BAD_RESPONSE_CONTENT, "No response")),
      );

      const result = await service.summarize("test.js", "js", "const x = 1;");

      expect(isErr(result)).toBe(true);
    });

    it("should return err result when LLM router throws error", async () => {
      const error = new Error("LLM failed");
      (mockLLMRouter.executeCompletion as jest.Mock).mockRejectedValue(error);

      const result = await service.summarize("test.js", "js", "const x = 1;");

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain("LLM failed");
      }
    });

    it("should use correct schema from source config map", async () => {
      (mockLLMRouter.executeCompletion as jest.Mock).mockResolvedValue(
        ok({
          name: "Test",
          purpose: "Test",
        }),
      );

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
