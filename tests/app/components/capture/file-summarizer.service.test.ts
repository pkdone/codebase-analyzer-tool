/**
 * Tests for FileSummarizerService.
 */

import "reflect-metadata";
import {
  FileSummarizerService,
  type PartialSourceSummaryType,
} from "../../../../src/app/components/capture/file-summarizer.service";
import type LLMRouter from "../../../../src/common/llm/llm-router";
import type { FileTypePromptRegistry } from "../../../../src/app/prompts/sources/sources.definitions";
import { z } from "zod";
import { LLMExecutionError } from "../../../../src/common/llm/types/llm-execution-error.types";
import {
  llmOk,
  llmErr,
  createExecutionMetadata,
} from "../../../../src/common/llm/types/llm-result.types";
import { isOk, isErr } from "../../../../src/common/types/result.types";

// Mock dependencies
jest.mock("../../../../src/common/utils/logging", () => ({
  logErr: jest.fn(),
  logWarn: jest.fn(),
}));

jest.mock("../../../../src/app/llm", () => ({
  getLlmArtifactCorrections: jest.fn().mockReturnValue({}),
}));

describe("FileSummarizerService", () => {
  let service: FileSummarizerService;
  let mockLLMRouter: jest.Mocked<LLMRouter>;
  let mockFileTypePromptRegistry: FileTypePromptRegistry;

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
      getProvidersRequiringProcessExit: jest.fn(),
      getProviderFamily: jest.fn(),
      getModelsUsedDescription: jest.fn(),
      getEmbeddingModelDimensions: jest.fn(),
      getLLMManifest: jest.fn(),
    } as unknown as jest.Mocked<LLMRouter>;

    // Create mock source config map with all required fields for Prompt
    mockFileTypePromptRegistry = {
      javascript: {
        contentDesc: "the JavaScript/TypeScript code",
        responseSchema: mockSchema,
        instructions: ["test instruction"],
        dataBlockHeader: "CODE",
        wrapInCodeBlock: true,
      },
      java: {
        contentDesc: "the Java code",
        responseSchema: mockSchema,
        instructions: ["test instruction"],
        dataBlockHeader: "CODE",
        wrapInCodeBlock: true,
      },
    } as unknown as FileTypePromptRegistry;

    // Create service instance (now only needs LLMRouter and FileTypePromptRegistry)
    service = new FileSummarizerService(mockLLMRouter, mockFileTypePromptRegistry);
  });

  describe("summarize", () => {
    const mockMeta = createExecutionMetadata("gpt-4", "openai");

    it("should return ok result with summary when LLM returns valid response", async () => {
      const mockResponse = { name: "TestClass", purpose: "Test purpose" };
      (mockLLMRouter.executeCompletion as jest.Mock).mockResolvedValue(
        llmOk(mockResponse, mockMeta),
      );

      // Now passing canonicalFileType directly instead of raw file extension
      const result = await service.summarize("test.js", "javascript", "const x = 1;");

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.summary).toEqual(mockResponse);
        expect(result.value.modelKey).toBe("gpt-4");
      }
      expect(mockLLMRouter.executeCompletion).toHaveBeenCalledWith(
        "test.js",
        expect.any(String),
        expect.objectContaining({
          outputFormat: "json",
          jsonSchema: expect.any(Object),
        }),
      );
    });

    it("should return err result when file content is empty", async () => {
      const result = await service.summarize("test.js", "javascript", "   ");

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain("empty");
      }
    });

    it("should return err result when LLM returns err", async () => {
      (mockLLMRouter.executeCompletion as jest.Mock).mockResolvedValue(
        llmErr(new LLMExecutionError("No response", "test.js")),
      );

      const result = await service.summarize("test.js", "javascript", "const x = 1;");

      expect(isErr(result)).toBe(true);
    });

    it("should return err result when LLM router throws error", async () => {
      const error = new Error("LLM failed");
      (mockLLMRouter.executeCompletion as jest.Mock).mockRejectedValue(error);

      const result = await service.summarize("test.js", "javascript", "const x = 1;");

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain("LLM failed");
      }
    });

    it("should use correct schema from source config map", async () => {
      (mockLLMRouter.executeCompletion as jest.Mock).mockResolvedValue(
        llmOk(
          {
            name: "Test",
            purpose: "Test",
          },
          mockMeta,
        ),
      );

      await service.summarize("test.js", "javascript", "const x = 1;");

      expect(mockLLMRouter.executeCompletion).toHaveBeenCalledWith(
        "test.js",
        expect.any(String),
        expect.objectContaining({
          jsonSchema: mockSchema,
        }),
      );
    });

    it("should return result compatible with PartialSourceSummaryType for partial responses", async () => {
      // Mock a partial response that only includes some fields from SourceSummaryType
      // This simulates what happens when different file types return different field subsets
      const partialResponse = {
        purpose: "Handles user authentication and session management",
        implementation: "Uses JWT tokens for stateless authentication",
        // Note: not all fields included - testing partial compatibility
      };
      (mockLLMRouter.executeCompletion as jest.Mock).mockResolvedValue(
        llmOk(partialResponse, mockMeta),
      );

      const result = await service.summarize("auth.js", "javascript", "function authenticate() {}");

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        // Verify the result is assignable to PartialSourceSummaryType
        const summary: PartialSourceSummaryType = result.value.summary;
        expect(summary.purpose).toBe("Handles user authentication and session management");
        expect(summary.implementation).toBe("Uses JWT tokens for stateless authentication");
        // Verify optional fields are undefined (not present in partial response)
        expect(summary.name).toBeUndefined();
        expect(summary.namespace).toBeUndefined();
        // Verify modelKey is captured
        expect(result.value.modelKey).toBe("gpt-4");
      }
    });

    it("should return result compatible with PartialSourceSummaryType for full responses", async () => {
      // Mock a more complete response with additional optional fields
      const fullResponse = {
        name: "AuthService",
        namespace: "com.app.security",
        kind: "CLASS",
        purpose: "Handles user authentication",
        implementation: "Uses JWT tokens",
        internalReferences: ["UserRepository", "TokenService"],
        externalReferences: ["jsonwebtoken"],
      };
      (mockLLMRouter.executeCompletion as jest.Mock).mockResolvedValue(
        llmOk(fullResponse, mockMeta),
      );

      // Using "java" canonical file type for Java file
      const result = await service.summarize("AuthService.java", "java", "class AuthService {}");

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        // Verify the result is assignable to PartialSourceSummaryType
        const summary: PartialSourceSummaryType = result.value.summary;
        expect(summary.name).toBe("AuthService");
        expect(summary.namespace).toBe("com.app.security");
        expect(summary.kind).toBe("CLASS");
        expect(summary.internalReferences).toEqual(["UserRepository", "TokenService"]);
        expect(summary.externalReferences).toEqual(["jsonwebtoken"]);
      }
    });
  });
});
