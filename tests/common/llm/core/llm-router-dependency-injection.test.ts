import { describe, test, expect, jest, beforeEach, afterEach } from "@jest/globals";
import { z } from "zod";
import LLMRouter from "../../../../src/common/llm/llm-router";
import type { LLMExecutionPipeline } from "../../../../src/common/llm/llm-execution-pipeline";
import type { ProviderManager } from "../../../../src/common/llm/provider-manager";
import type LLMExecutionStats from "../../../../src/common/llm/tracking/llm-execution-stats";
import type { ResolvedModelChain } from "../../../../src/common/llm/types/llm-model.types";
import { LLMPurpose, LLMOutputFormat } from "../../../../src/common/llm/types/llm-request.types";
import {
  isLLMOk,
  isLLMErr,
  llmOk,
  llmErr,
  createExecutionMetadata,
} from "../../../../src/common/llm/types/llm-result.types";
import { LLMExecutionError } from "../../../../src/common/llm/types/llm-execution-error.types";

/**
 * Tests demonstrating improved testability through constructor injection.
 *
 * Prior to the dependency injection refactoring, testing LLMRouter required
 * complex module mocking to replace the ProviderManager and LLMExecutionPipeline.
 * With constructor injection, we can simply inject mock dependencies directly,
 * making tests simpler, faster, and more maintainable.
 */
describe("LLMRouter Dependency Injection Tests", () => {
  let mockConsoleLog: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    mockConsoleLog = jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    mockConsoleLog.mockRestore();
    jest.clearAllMocks();
  });

  /**
   * Create mock dependencies for the LLMRouter.
   * These mocks can be easily customized for each test case.
   */
  function createMockDependencies() {
    const mockModelChain: ResolvedModelChain = {
      completions: [
        { providerFamily: "test", modelKey: "test-completion", modelUrn: "test-model" },
      ],
      embeddings: [
        { providerFamily: "test", modelKey: "test-embedding", modelUrn: "test-embedding-model" },
      ],
    };

    const mockProvider = {
      executeCompletion: jest.fn(),
      generateEmbeddings: jest.fn(),
      getModelsMetadata: jest.fn().mockReturnValue({
        "test-completion": {
          modelKey: "test-completion",
          urn: "test-model",
          purpose: LLMPurpose.COMPLETIONS,
          maxTotalTokens: 4096,
          maxCompletionTokens: 2048,
        },
        "test-embedding": {
          modelKey: "test-embedding",
          urn: "test-embedding-model",
          purpose: LLMPurpose.EMBEDDINGS,
          maxTotalTokens: 8191,
          dimensions: 1536,
        },
      }),
      getEmbeddingModelDimensions: jest.fn().mockReturnValue(1536),
      close: jest.fn(),
      getShutdownBehavior: jest.fn().mockReturnValue("graceful"),
    };

    const mockProviderManager = {
      getProvider: jest.fn().mockReturnValue(mockProvider),
      getManifest: jest.fn(),
      getAllModelsMetadata: jest.fn().mockReturnValue(mockProvider.getModelsMetadata()),
      getModelMetadata: jest.fn().mockReturnValue({
        modelKey: "test-completion",
        urn: "test-model",
        purpose: LLMPurpose.COMPLETIONS,
        maxTotalTokens: 4096,
        maxCompletionTokens: 2048,
      }),
      shutdown: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      getProvidersRequiringProcessExit: jest.fn().mockReturnValue([]),
      validateAllCredentials: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ProviderManager>;

    const mockExecutionPipeline: jest.Mocked<LLMExecutionPipeline> = {
      executeCompletion: jest.fn(),
      executeEmbedding: jest.fn(),
      execute: jest.fn(),
    } as unknown as jest.Mocked<LLMExecutionPipeline>;

    const mockStats: jest.Mocked<LLMExecutionStats> = {
      recordSuccess: jest.fn(),
      recordFailure: jest.fn(),
      recordSwitch: jest.fn(),
      recordRetry: jest.fn(),
      recordCrop: jest.fn(),
      recordJsonMutated: jest.fn(),
      getStatusTypesStatistics: jest.fn().mockReturnValue([]),
      displayLLMStatusDetails: jest.fn(),
    } as unknown as jest.Mocked<LLMExecutionStats>;

    return {
      mockModelChain,
      mockProviderManager,
      mockExecutionPipeline,
      mockStats,
      mockProvider,
    };
  }

  describe("Constructor Injection Benefits", () => {
    test("should create router with injected dependencies", () => {
      const { mockModelChain, mockProviderManager, mockExecutionPipeline, mockStats } =
        createMockDependencies();

      const router = new LLMRouter(
        mockModelChain,
        mockProviderManager,
        mockExecutionPipeline,
        mockStats,
      );

      expect(router).toBeInstanceOf(LLMRouter);
      expect(router.stats).toBe(mockStats);
    });

    test("should delegate executeCompletion to injected pipeline", async () => {
      const { mockModelChain, mockProviderManager, mockExecutionPipeline, mockStats } =
        createMockDependencies();

      const expectedResult = { message: "test response" };
      const mockMeta = createExecutionMetadata("test-completion", "test");
      mockExecutionPipeline.executeCompletion.mockResolvedValue(llmOk(expectedResult, mockMeta));

      const router = new LLMRouter(
        mockModelChain,
        mockProviderManager,
        mockExecutionPipeline,
        mockStats,
      );

      const schema = z.object({ message: z.string() });
      const result = await router.executeCompletion("test-resource", "test prompt", {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      });

      expect(mockExecutionPipeline.executeCompletion).toHaveBeenCalled();
      expect(isLLMOk(result)).toBe(true);
      if (isLLMOk(result)) {
        expect(result.value).toEqual(expectedResult);
      }
    });

    test("should delegate generateEmbeddings to injected pipeline", async () => {
      const { mockModelChain, mockProviderManager, mockExecutionPipeline, mockStats } =
        createMockDependencies();

      const expectedEmbeddings = [0.1, 0.2, 0.3];
      const mockMeta = createExecutionMetadata("test-embedding", "test");
      mockExecutionPipeline.executeEmbedding.mockResolvedValue(llmOk(expectedEmbeddings, mockMeta));

      const router = new LLMRouter(
        mockModelChain,
        mockProviderManager,
        mockExecutionPipeline,
        mockStats,
      );

      const result = await router.generateEmbeddings("test-resource", "test content");

      expect(mockExecutionPipeline.executeEmbedding).toHaveBeenCalled();
      expect(result?.embeddings).toEqual(expectedEmbeddings);
      expect(result?.meta.modelId).toBe("test/test-embedding");
    });

    test("should delegate shutdown to injected provider manager", async () => {
      const { mockModelChain, mockProviderManager, mockExecutionPipeline, mockStats } =
        createMockDependencies();

      const router = new LLMRouter(
        mockModelChain,
        mockProviderManager,
        mockExecutionPipeline,
        mockStats,
      );

      await router.shutdown();

      expect(mockProviderManager.shutdown).toHaveBeenCalled();
    });
  });

  describe("Error Handling with Injected Dependencies", () => {
    test("should return error result when pipeline returns error", async () => {
      const { mockModelChain, mockProviderManager, mockExecutionPipeline, mockStats } =
        createMockDependencies();

      const pipelineError = new LLMExecutionError("Pipeline error", "test-resource", {
        resource: "test",
        purpose: LLMPurpose.COMPLETIONS,
      });
      mockExecutionPipeline.executeCompletion.mockResolvedValue(llmErr(pipelineError));

      const router = new LLMRouter(
        mockModelChain,
        mockProviderManager,
        mockExecutionPipeline,
        mockStats,
      );

      const result = await router.executeCompletion("test-resource", "test prompt", {
        outputFormat: LLMOutputFormat.TEXT,
      });

      expect(isLLMErr(result)).toBe(true);
      if (isLLMErr(result)) {
        expect(result.error).toBeInstanceOf(LLMExecutionError);
        expect(result.error.message).toBe("Pipeline error");
      }
    });

    test("should return null when embedding pipeline returns error", async () => {
      const { mockModelChain, mockProviderManager, mockExecutionPipeline, mockStats } =
        createMockDependencies();

      const pipelineError = new LLMExecutionError("Embedding error", "test-resource", {
        resource: "test",
        purpose: LLMPurpose.EMBEDDINGS,
      });
      mockExecutionPipeline.executeEmbedding.mockResolvedValue(llmErr(pipelineError));

      const router = new LLMRouter(
        mockModelChain,
        mockProviderManager,
        mockExecutionPipeline,
        mockStats,
      );

      const result = await router.generateEmbeddings("test-resource", "test content");

      expect(result).toBeNull();
    });
  });

  describe("Stats Tracking with Injected Stats", () => {
    test("should expose injected stats for external monitoring", () => {
      const { mockModelChain, mockProviderManager, mockExecutionPipeline, mockStats } =
        createMockDependencies();

      const router = new LLMRouter(
        mockModelChain,
        mockProviderManager,
        mockExecutionPipeline,
        mockStats,
      );

      // Stats can be accessed for monitoring/reporting
      expect(router.stats).toBe(mockStats);

      // Stats methods can be called (e.g., for displaying status)
      router.stats.displayLLMStatusDetails();
      expect(mockStats.displayLLMStatusDetails).toHaveBeenCalled();
    });
  });

  describe("Provider Manager Delegation", () => {
    test("should delegate getProvidersRequiringProcessExit to provider manager", () => {
      const { mockModelChain, mockProviderManager, mockExecutionPipeline, mockStats } =
        createMockDependencies();

      mockProviderManager.getProvidersRequiringProcessExit.mockReturnValue(["test-provider"]);

      const router = new LLMRouter(
        mockModelChain,
        mockProviderManager,
        mockExecutionPipeline,
        mockStats,
      );

      const result = router.getProvidersRequiringProcessExit();

      expect(mockProviderManager.getProvidersRequiringProcessExit).toHaveBeenCalled();
      expect(result).toEqual(["test-provider"]);
    });

    test("should delegate validateCredentials to provider manager", async () => {
      const { mockModelChain, mockProviderManager, mockExecutionPipeline, mockStats } =
        createMockDependencies();

      const router = new LLMRouter(
        mockModelChain,
        mockProviderManager,
        mockExecutionPipeline,
        mockStats,
      );

      await router.validateCredentials();

      expect(mockProviderManager.validateAllCredentials).toHaveBeenCalled();
    });
  });

  describe("Model Chain Configuration", () => {
    test("should return correct completion chain from configuration", () => {
      const { mockModelChain, mockProviderManager, mockExecutionPipeline, mockStats } =
        createMockDependencies();

      const router = new LLMRouter(
        mockModelChain,
        mockProviderManager,
        mockExecutionPipeline,
        mockStats,
      );

      const completionChain = router.getCompletionChain();

      expect(completionChain).toEqual(mockModelChain.completions);
      expect(completionChain[0].modelKey).toBe("test-completion");
    });

    test("should return correct embedding chain from configuration", () => {
      const { mockModelChain, mockProviderManager, mockExecutionPipeline, mockStats } =
        createMockDependencies();

      const router = new LLMRouter(
        mockModelChain,
        mockProviderManager,
        mockExecutionPipeline,
        mockStats,
      );

      const embeddingChain = router.getEmbeddingChain();

      expect(embeddingChain).toEqual(mockModelChain.embeddings);
      expect(embeddingChain[0].modelKey).toBe("test-embedding");
    });
  });
});
