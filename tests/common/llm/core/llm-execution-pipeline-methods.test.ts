import "reflect-metadata";
import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import {
  LLMExecutionPipeline,
  type LLMPipelineConfig,
} from "../../../../src/common/llm/llm-execution-pipeline";
import type { RetryStrategy } from "../../../../src/common/llm/strategies/retry-strategy";
import type LLMExecutionStats from "../../../../src/common/llm/tracking/llm-execution-stats";
import type {
  ExecutableCandidate,
  BoundLLMFunction,
} from "../../../../src/common/llm/types/llm-function.types";
import { LLMPurpose } from "../../../../src/common/llm/types/llm-request.types";
import {
  LLMResponseStatus,
  type LLMFunctionResponse,
  type LLMResponsePayload,
} from "../../../../src/common/llm/types/llm-response.types";
import type { LLMContext } from "../../../../src/common/llm/types/llm-request.types";
import type { LLMRetryConfig } from "../../../../src/common/llm/providers/llm-provider.types";
import type { ResolvedLLMModelMetadata } from "../../../../src/common/llm/types/llm-model.types";
import { isOk } from "../../../../src/common/types/result.types";

// Mock logging
jest.mock("../../../../src/common/utils/logging", () => ({
  logWarn: jest.fn(),
  logError: jest.fn(),
}));

describe("LLMExecutionPipeline convenience methods", () => {
  let mockRetryStrategy: jest.Mocked<RetryStrategy>;
  let mockStats: jest.Mocked<LLMExecutionStats>;
  let pipelineConfig: LLMPipelineConfig;
  let pipeline: LLMExecutionPipeline;

  const createMockCandidate = <T extends LLMResponsePayload>(data: T): ExecutableCandidate<T> => {
    const mockExecute = jest.fn<BoundLLMFunction<T>>().mockResolvedValue({
      status: LLMResponseStatus.COMPLETED,
      generated: data,
      request: "test",
      modelKey: "test-model",
      context: { resource: "test", purpose: LLMPurpose.COMPLETIONS },
    });

    return {
      execute: mockExecute,
      providerFamily: "TestProvider",
      modelKey: "test-model",
      description: "Test/test-model",
    };
  };

  beforeEach(() => {
    mockRetryStrategy = {
      executeWithRetries: jest.fn(),
    } as unknown as jest.Mocked<RetryStrategy>;

    mockStats = {
      recordSuccess: jest.fn(),
      recordFailure: jest.fn(),
      recordSwitch: jest.fn(),
      recordCrop: jest.fn(),
      recordJsonMutated: jest.fn(),
    } as unknown as jest.Mocked<LLMExecutionStats>;

    pipelineConfig = {
      retryConfig: {
        requestTimeoutMillis: 30000,
        maxRetryAttempts: 3,
        minRetryDelayMillis: 1000,
        maxRetryDelayMillis: 10000,
      },
      getModelsMetadata: jest
        .fn<() => Record<string, ResolvedLLMModelMetadata>>()
        .mockReturnValue({}),
    };

    pipeline = new LLMExecutionPipeline(mockRetryStrategy, mockStats, pipelineConfig);
  });

  describe("executeCompletion", () => {
    test("should call execute with retryOnInvalid=true and trackJsonMutations=true", async () => {
      const expectedData = { result: "test" };
      const mockCandidate = createMockCandidate(expectedData);

      mockRetryStrategy.executeWithRetries.mockResolvedValue({
        status: LLMResponseStatus.COMPLETED,
        generated: expectedData,
        request: "test",
        modelKey: "test-model",
        context: { resource: "test", purpose: LLMPurpose.COMPLETIONS },
      });

      await pipeline.executeCompletion({
        resourceName: "test-resource",
        content: "test prompt",
        context: {
          resource: "test-resource",
          purpose: LLMPurpose.COMPLETIONS,
          modelKey: "test-model",
        },
        candidates: [mockCandidate],
      });

      // Verify retryOnInvalid is true (passed to retryStrategy)
      expect(mockRetryStrategy.executeWithRetries).toHaveBeenCalledWith(
        expect.any(Function),
        "test prompt",
        expect.any(Object),
        expect.any(Object),
        true, // retryOnInvalid should be true for completions
      );
    });

    test("should track JSON mutations when repairs are significant", async () => {
      const expectedData = { result: "repaired" };

      mockRetryStrategy.executeWithRetries.mockResolvedValue({
        status: LLMResponseStatus.COMPLETED,
        generated: expectedData,
        request: "test",
        modelKey: "test-model",
        context: { resource: "test", purpose: LLMPurpose.COMPLETIONS },
        repairs: ["coerceStringToArray"], // Significant repair
      });

      const mockCandidate = createMockCandidate(expectedData);

      await pipeline.executeCompletion({
        resourceName: "test-resource",
        content: "test prompt",
        context: {
          resource: "test-resource",
          purpose: LLMPurpose.COMPLETIONS,
          modelKey: "test-model",
        },
        candidates: [mockCandidate],
      });

      expect(mockStats.recordJsonMutated).toHaveBeenCalled();
    });

    test("should return success result with generated data", async () => {
      const expectedData = { key: "value" };

      mockRetryStrategy.executeWithRetries.mockResolvedValue({
        status: LLMResponseStatus.COMPLETED,
        generated: expectedData,
        request: "test",
        modelKey: "test-model",
        context: { resource: "test", purpose: LLMPurpose.COMPLETIONS },
      });

      const mockCandidate = createMockCandidate(expectedData);

      const result = await pipeline.executeCompletion({
        resourceName: "test-resource",
        content: "test prompt",
        context: {
          resource: "test-resource",
          purpose: LLMPurpose.COMPLETIONS,
          modelKey: "test-model",
        },
        candidates: [mockCandidate],
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toEqual(expectedData);
      }
    });
  });

  describe("executeEmbedding", () => {
    test("should call execute with retryOnInvalid=false and trackJsonMutations=false", async () => {
      const expectedEmbeddings = [0.1, 0.2, 0.3];
      const mockCandidate = createMockCandidate(expectedEmbeddings);

      mockRetryStrategy.executeWithRetries.mockResolvedValue({
        status: LLMResponseStatus.COMPLETED,
        generated: expectedEmbeddings,
        request: "test",
        modelKey: "test-model",
        context: { resource: "test", purpose: LLMPurpose.EMBEDDINGS },
      });

      await pipeline.executeEmbedding({
        resourceName: "test-resource",
        content: "test content",
        context: {
          resource: "test-resource",
          purpose: LLMPurpose.EMBEDDINGS,
          modelKey: "test-model",
        },
        candidates: [mockCandidate],
      });

      // Verify retryOnInvalid is false (passed to retryStrategy)
      expect(mockRetryStrategy.executeWithRetries).toHaveBeenCalledWith(
        expect.any(Function),
        "test content",
        expect.any(Object),
        expect.any(Object),
        false, // retryOnInvalid should be false for embeddings
      );
    });

    test("should NOT track JSON mutations for embeddings", async () => {
      const expectedEmbeddings = [0.1, 0.2, 0.3];

      mockRetryStrategy.executeWithRetries.mockResolvedValue({
        status: LLMResponseStatus.COMPLETED,
        generated: expectedEmbeddings,
        request: "test",
        modelKey: "test-model",
        context: { resource: "test", purpose: LLMPurpose.EMBEDDINGS },
        repairs: ["some-repair"], // Even with repairs, should not track for embeddings
      });

      const mockCandidate = createMockCandidate(expectedEmbeddings);

      await pipeline.executeEmbedding({
        resourceName: "test-resource",
        content: "test content",
        context: {
          resource: "test-resource",
          purpose: LLMPurpose.EMBEDDINGS,
          modelKey: "test-model",
        },
        candidates: [mockCandidate],
      });

      // JSON mutations should NOT be tracked for embeddings
      expect(mockStats.recordJsonMutated).not.toHaveBeenCalled();
    });

    test("should return success result with embedding array", async () => {
      const expectedEmbeddings = [0.1, 0.2, 0.3, 0.4, 0.5];

      mockRetryStrategy.executeWithRetries.mockResolvedValue({
        status: LLMResponseStatus.COMPLETED,
        generated: expectedEmbeddings,
        request: "test",
        modelKey: "test-model",
        context: { resource: "test", purpose: LLMPurpose.EMBEDDINGS },
      });

      const mockCandidate = createMockCandidate(expectedEmbeddings);

      const result = await pipeline.executeEmbedding({
        resourceName: "test-resource",
        content: "test content",
        context: {
          resource: "test-resource",
          purpose: LLMPurpose.EMBEDDINGS,
          modelKey: "test-model",
        },
        candidates: [mockCandidate],
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toEqual(expectedEmbeddings);
        expect(Array.isArray(result.value)).toBe(true);
      }
    });
  });

  describe("method separation ensures correct settings", () => {
    test("executeCompletion and executeEmbedding use different flag settings", async () => {
      const completionData = { text: "completion" };
      const embeddingData = [0.1, 0.2];

      // Track calls to verify different configurations
      const retryOnInvalidCalls: boolean[] = [];
      mockRetryStrategy.executeWithRetries.mockImplementation(
        async <T extends LLMResponsePayload>(
          _fn: BoundLLMFunction<T>,
          _content: string,
          _ctx: LLMContext,
          _config: LLMRetryConfig,
          retryOnInvalid?: boolean,
        ): Promise<LLMFunctionResponse<T> | null> => {
          retryOnInvalidCalls.push(retryOnInvalid ?? true);
          const generated = retryOnInvalidCalls.length === 1 ? completionData : embeddingData;
          return {
            status: LLMResponseStatus.COMPLETED,
            generated: generated as T,
            request: "test",
            modelKey: "test-model",
            context: { resource: "test", purpose: LLMPurpose.COMPLETIONS },
          } as LLMFunctionResponse<T>;
        },
      );

      // Execute completion
      await pipeline.executeCompletion({
        resourceName: "completion-resource",
        content: "completion prompt",
        context: {
          resource: "completion-resource",
          purpose: LLMPurpose.COMPLETIONS,
          modelKey: "test-model",
        },
        candidates: [createMockCandidate(completionData)],
      });

      // Execute embedding
      await pipeline.executeEmbedding({
        resourceName: "embedding-resource",
        content: "embedding content",
        context: {
          resource: "embedding-resource",
          purpose: LLMPurpose.EMBEDDINGS,
          modelKey: "test-model",
        },
        candidates: [createMockCandidate(embeddingData)],
      });

      // First call (completion) should have retryOnInvalid=true
      expect(retryOnInvalidCalls[0]).toBe(true);
      // Second call (embedding) should have retryOnInvalid=false
      expect(retryOnInvalidCalls[1]).toBe(false);
    });
  });
});
