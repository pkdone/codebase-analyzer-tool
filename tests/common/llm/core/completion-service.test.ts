import {
  CompletionService,
  type CompletionServiceDependencies,
} from "../../../../src/common/llm/completion-service";
import type { LLMExecutionPipeline } from "../../../../src/common/llm/llm-execution-pipeline";
import type { ProviderManager } from "../../../../src/common/llm/provider-manager";
import type {
  ResolvedModelChain,
  ResolvedLLMModelMetadata,
} from "../../../../src/common/llm/types/llm-model.types";
import type { LLMCandidateFunction } from "../../../../src/common/llm/types/llm-function.types";
import { LLMExecutionError } from "../../../../src/common/llm/types/llm-execution-result.types";
import { LLMOutputFormat, LLMPurpose } from "../../../../src/common/llm/types/llm-request.types";
import { isOk, isErr } from "../../../../src/common/types/result.types";
import { z } from "zod";

// Mock logging to avoid noise
jest.mock("../../../../src/common/utils/logging", () => ({
  logWarn: jest.fn(),
  logError: jest.fn(),
}));

describe("CompletionService", () => {
  let mockExecutionPipeline: jest.Mocked<LLMExecutionPipeline>;
  let mockProviderManager: jest.Mocked<ProviderManager>;
  let completionCandidates: LLMCandidateFunction[];
  let modelChain: ResolvedModelChain;

  const mockModelMetadata: ResolvedLLMModelMetadata = {
    modelKey: "gpt-4",
    urnEnvKey: "OPENAI_GPT4_URN",
    urn: "gpt-4",
    purpose: LLMPurpose.COMPLETIONS,
    maxCompletionTokens: 4096,
    maxTotalTokens: 8192,
  };

  beforeEach(() => {
    mockProviderManager = {
      getModelMetadata: jest.fn().mockReturnValue(mockModelMetadata),
    } as unknown as jest.Mocked<ProviderManager>;

    mockExecutionPipeline = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<LLMExecutionPipeline>;

    modelChain = {
      completions: [
        { providerFamily: "OpenAI", modelKey: "gpt-4", modelUrn: "gpt-4" },
        { providerFamily: "OpenAI", modelKey: "gpt-3.5-turbo", modelUrn: "gpt-3.5-turbo" },
      ],
      embeddings: [
        {
          providerFamily: "OpenAI",
          modelKey: "text-embedding-ada-002",
          modelUrn: "text-embedding-ada-002",
        },
      ],
    };

    completionCandidates = [
      {
        func: jest.fn(),
        providerFamily: "OpenAI",
        modelKey: "gpt-4",
        description: "OpenAI/gpt-4",
        priority: 0,
      },
      {
        func: jest.fn(),
        providerFamily: "OpenAI",
        modelKey: "gpt-3.5-turbo",
        description: "OpenAI/gpt-3.5-turbo",
        priority: 1,
      },
    ];
  });

  const createService = (overrides?: Partial<CompletionServiceDependencies>) => {
    return new CompletionService({
      completionCandidates,
      modelChain,
      providerManager: mockProviderManager,
      executionPipeline: mockExecutionPipeline,
      ...overrides,
    });
  };

  describe("constructor", () => {
    it("should create an instance with valid dependencies", () => {
      const service = createService();
      expect(service).toBeInstanceOf(CompletionService);
    });
  });

  describe("executeCompletion", () => {
    it("should return successful result for TEXT format", async () => {
      const expectedResponse = "This is a test completion";
      mockExecutionPipeline.execute.mockResolvedValue({
        success: true,
        data: expectedResponse,
      });

      const service = createService();
      const result = await service.executeCompletion("test-resource", "test prompt", {
        outputFormat: LLMOutputFormat.TEXT,
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(expectedResponse);
      }
      expect(mockExecutionPipeline.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          resourceName: "test-resource",
          content: "test prompt",
          retryOnInvalid: true,
          trackJsonMutations: true,
        }),
      );
    });

    it("should return successful result for JSON format with schema", async () => {
      const schema = z.object({ name: z.string(), count: z.number() });
      const expectedResponse = { name: "Test", count: 42 };
      mockExecutionPipeline.execute.mockResolvedValue({
        success: true,
        data: expectedResponse,
      });

      const service = createService();
      const result = await service.executeCompletion("test-resource", "test prompt", {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toEqual(expectedResponse);
      }
    });

    it("should return error result when execution pipeline fails", async () => {
      mockExecutionPipeline.execute.mockResolvedValue({
        success: false,
        error: new LLMExecutionError("Failed to complete", "test-resource"),
      });

      const service = createService();
      const result = await service.executeCompletion("test-resource", "test prompt", {
        outputFormat: LLMOutputFormat.TEXT,
      });

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain("Failed to complete");
      }
    });

    it("should pass modelIndexOverride to candidate builder", async () => {
      mockExecutionPipeline.execute.mockResolvedValue({
        success: true,
        data: "response",
      });

      const service = createService();
      await service.executeCompletion(
        "test-resource",
        "test prompt",
        { outputFormat: LLMOutputFormat.TEXT },
        1, // Start from second model
      );

      expect(mockExecutionPipeline.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          candidates: expect.arrayContaining([
            expect.objectContaining({
              modelKey: "gpt-3.5-turbo",
            }),
          ]),
        }),
      );
    });

    it("should set correct context with purpose and outputFormat", async () => {
      mockExecutionPipeline.execute.mockResolvedValue({
        success: true,
        data: "response",
      });

      const service = createService();
      await service.executeCompletion("test-resource", "test prompt", {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: z.object({}),
      });

      expect(mockExecutionPipeline.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            resource: "test-resource",
            purpose: LLMPurpose.COMPLETIONS,
            outputFormat: LLMOutputFormat.JSON,
          }),
        }),
      );
    });

    it("should handle complex nested schema types", async () => {
      const nestedSchema = z.object({
        user: z.object({
          name: z.string(),
          age: z.number(),
        }),
        tags: z.array(z.string()),
      });

      const expectedResponse = {
        user: { name: "John", age: 30 },
        tags: ["dev", "ts"],
      };

      mockExecutionPipeline.execute.mockResolvedValue({
        success: true,
        data: expectedResponse,
      });

      const service = createService();
      const result = await service.executeCompletion("test-resource", "test prompt", {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: nestedSchema,
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.user.name).toBe("John");
        expect(result.value.tags).toContain("dev");
      }
    });

    it("should use first candidate modelKey in context", async () => {
      mockExecutionPipeline.execute.mockResolvedValue({
        success: true,
        data: "response",
      });

      const service = createService();
      await service.executeCompletion("test-resource", "test prompt", {
        outputFormat: LLMOutputFormat.TEXT,
      });

      expect(mockExecutionPipeline.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            modelKey: "gpt-4",
          }),
        }),
      );
    });
  });

  describe("getCompletionChain", () => {
    it("should return the completion chain from model chain", () => {
      const service = createService();
      const result = service.getCompletionChain();
      expect(result).toEqual(modelChain.completions);
    });
  });

  describe("getFirstCompletionModelMaxTokens", () => {
    it("should return max tokens from provider metadata", () => {
      const service = createService();
      const result = service.getFirstCompletionModelMaxTokens();

      expect(result).toBe(8192);
      expect(mockProviderManager.getModelMetadata).toHaveBeenCalledWith("OpenAI", "gpt-4");
    });

    it("should return default when no candidates available", () => {
      const service = createService({ completionCandidates: [] });
      const result = service.getFirstCompletionModelMaxTokens();

      expect(result).toBe(128000);
    });

    it("should return default when metadata is undefined", () => {
      mockProviderManager.getModelMetadata.mockReturnValue(undefined);
      const service = createService();
      const result = service.getFirstCompletionModelMaxTokens();

      expect(result).toBe(128000);
    });

    it("should return default when maxTotalTokens is missing from metadata", () => {
      mockProviderManager.getModelMetadata.mockReturnValue({
        modelKey: "gpt-4",
        urnEnvKey: "OPENAI_GPT4_URN",
        urn: "gpt-4",
        purpose: LLMPurpose.COMPLETIONS,
      } as ResolvedLLMModelMetadata);
      const service = createService();
      const result = service.getFirstCompletionModelMaxTokens();

      expect(result).toBe(128000);
    });
  });

  describe("hasCompletionCandidates", () => {
    it("should return true when candidates are available", () => {
      const service = createService();
      expect(service.hasCompletionCandidates()).toBe(true);
    });

    it("should return false when no candidates are available", () => {
      const service = createService({ completionCandidates: [] });
      expect(service.hasCompletionCandidates()).toBe(false);
    });
  });
});
