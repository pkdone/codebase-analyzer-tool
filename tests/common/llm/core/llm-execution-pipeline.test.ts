import "reflect-metadata";
import { jest, describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { LLMExecutionPipeline } from "../../../../src/common/llm/llm-execution-pipeline";
import LLMTelemetryTracker from "../../../../src/common/llm/tracking/llm-telemetry-tracker";
import { RetryStrategy } from "../../../../src/common/llm/strategies/retry-strategy";
import {
  LLMContext,
  LLMPurpose,
  LLMResponseStatus,
  LLMOutputFormat,
  LLMFunctionResponse,
  BoundLLMFunction,
  LLMModelQuality,
  LLMGeneratedContent,
} from "../../../../src/common/llm/types/llm.types";
import { SANITIZATION_STEP } from "../../../../src/common/llm/json-processing/sanitizers";

/**
 * Helper to create a mock BoundLLMFunction.
 * BoundLLMFunction is a function that returns a specific response type.
 */
function createMockLLMFunction<T extends LLMGeneratedContent>(
  response: LLMFunctionResponse<T>,
): BoundLLMFunction<T> {
  // Use explicit async function to avoid Jest mock type inference issues
  return async () => response;
}

describe("LLMExecutionPipeline - JSON Mutation Detection", () => {
  let llmStats: LLMTelemetryTracker;
  let retryStrategy: RetryStrategy;
  let pipeline: LLMExecutionPipeline;
  let recordJsonMutatedSpy: jest.SpiedFunction<() => void>;

  beforeEach(() => {
    // Mock console.log to avoid cluttering test output
    jest.spyOn(console, "log").mockImplementation(() => {
      // Mock implementation
    });

    // Create real instances
    llmStats = new LLMTelemetryTracker();
    retryStrategy = new RetryStrategy(llmStats);

    // Create the pipeline (strategies are now pure functions, not classes)
    pipeline = new LLMExecutionPipeline(retryStrategy, llmStats);

    // Spy on the recordJsonMutated method
    recordJsonMutatedSpy = jest.spyOn(llmStats, "recordJsonMutated");
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("Significant mutation detection", () => {
    test("should record JSON mutation for significant sanitization steps", async () => {
      const mockLLMFunction = createMockLLMFunction({
        status: LLMResponseStatus.COMPLETED,
        request: "test",
        modelKey: "test-model",
        context: { resource: "test", purpose: LLMPurpose.COMPLETIONS },
        generated: { test: "value" },
        mutationSteps: [SANITIZATION_STEP.TRIMMED_WHITESPACE, "Fixed trailing commas"],
      });

      const context: LLMContext = {
        resource: "test-resource",
        purpose: LLMPurpose.COMPLETIONS,
      };

      await pipeline.execute({
        resourceName: "test-resource",
        content: "test prompt",
        context,
        llmFunctions: [mockLLMFunction],
        providerRetryConfig: {
          requestTimeoutMillis: 60000,
          maxRetryAttempts: 3,
          minRetryDelayMillis: 100,
          maxRetryDelayMillis: 1000,
        },
        modelsMetadata: {},
        candidateModels: undefined,
      });

      expect(recordJsonMutatedSpy).toHaveBeenCalledTimes(1);
    });

    test("should NOT record JSON mutation for only whitespace trimming", async () => {
      const mockLLMFunction = createMockLLMFunction({
        status: LLMResponseStatus.COMPLETED,
        request: "test",
        modelKey: "test-model",
        context: { resource: "test", purpose: LLMPurpose.COMPLETIONS },
        generated: { test: "value" },
        mutationSteps: [SANITIZATION_STEP.TRIMMED_WHITESPACE],
      });

      const context: LLMContext = {
        resource: "test-resource",
        purpose: LLMPurpose.COMPLETIONS,
      };

      await pipeline.execute({
        resourceName: "test-resource",
        content: "test prompt",
        context,
        llmFunctions: [mockLLMFunction],
        providerRetryConfig: {
          requestTimeoutMillis: 60000,
          maxRetryAttempts: 3,
          minRetryDelayMillis: 100,
          maxRetryDelayMillis: 1000,
        },
        modelsMetadata: {},
        candidateModels: undefined,
      });

      expect(recordJsonMutatedSpy).not.toHaveBeenCalled();
    });

    test("should NOT record JSON mutation for only code fence removal", async () => {
      const mockLLMFunction = createMockLLMFunction({
        status: LLMResponseStatus.COMPLETED,
        request: "test",
        modelKey: "test-model",
        context: { resource: "test", purpose: LLMPurpose.COMPLETIONS },
        generated: { test: "value" },
        mutationSteps: [SANITIZATION_STEP.REMOVED_CODE_FENCES],
      });

      const context: LLMContext = {
        resource: "test-resource",
        purpose: LLMPurpose.COMPLETIONS,
      };

      await pipeline.execute({
        resourceName: "test-resource",
        content: "test prompt",
        context,
        llmFunctions: [mockLLMFunction],
        providerRetryConfig: {
          requestTimeoutMillis: 60000,
          maxRetryAttempts: 3,
          minRetryDelayMillis: 100,
          maxRetryDelayMillis: 1000,
        },
        modelsMetadata: {},
        candidateModels: undefined,
      });

      expect(recordJsonMutatedSpy).not.toHaveBeenCalled();
    });

    test("should NOT record JSON mutation for both whitespace and code fence removal only", async () => {
      const mockLLMFunction = createMockLLMFunction({
        status: LLMResponseStatus.COMPLETED,
        request: "test",
        modelKey: "test-model",
        context: { resource: "test", purpose: LLMPurpose.COMPLETIONS },
        generated: { test: "value" },
        mutationSteps: [
          SANITIZATION_STEP.TRIMMED_WHITESPACE,
          SANITIZATION_STEP.REMOVED_CODE_FENCES,
        ],
      });

      const context: LLMContext = {
        resource: "test-resource",
        purpose: LLMPurpose.COMPLETIONS,
      };

      await pipeline.execute({
        resourceName: "test-resource",
        content: "test prompt",
        context,
        llmFunctions: [mockLLMFunction],
        providerRetryConfig: {
          requestTimeoutMillis: 60000,
          maxRetryAttempts: 3,
          minRetryDelayMillis: 100,
          maxRetryDelayMillis: 1000,
        },
        modelsMetadata: {},
        candidateModels: undefined,
      });

      expect(recordJsonMutatedSpy).not.toHaveBeenCalled();
    });

    test("should NOT record JSON mutation when no sanitization steps", async () => {
      const mockLLMFunction = createMockLLMFunction({
        status: LLMResponseStatus.COMPLETED,
        request: "test",
        modelKey: "test-model",
        context: { resource: "test", purpose: LLMPurpose.COMPLETIONS },
        generated: { test: "value" },
        mutationSteps: [],
      });

      const context: LLMContext = {
        resource: "test-resource",
        purpose: LLMPurpose.COMPLETIONS,
      };

      await pipeline.execute({
        resourceName: "test-resource",
        content: "test prompt",
        context,
        llmFunctions: [mockLLMFunction],
        providerRetryConfig: {
          requestTimeoutMillis: 60000,
          maxRetryAttempts: 3,
          minRetryDelayMillis: 100,
          maxRetryDelayMillis: 1000,
        },
        modelsMetadata: {},
        candidateModels: undefined,
      });

      expect(recordJsonMutatedSpy).not.toHaveBeenCalled();
    });

    test("should NOT record JSON mutation when sanitizationSteps is undefined", async () => {
      const mockLLMFunction = createMockLLMFunction({
        status: LLMResponseStatus.COMPLETED,
        request: "test",
        modelKey: "test-model",
        context: { resource: "test", purpose: LLMPurpose.COMPLETIONS },
        generated: { test: "value" },
      });

      const context: LLMContext = {
        resource: "test-resource",
        purpose: LLMPurpose.COMPLETIONS,
      };

      await pipeline.execute({
        resourceName: "test-resource",
        content: "test prompt",
        context,
        llmFunctions: [mockLLMFunction],
        providerRetryConfig: {
          requestTimeoutMillis: 60000,
          maxRetryAttempts: 3,
          minRetryDelayMillis: 100,
          maxRetryDelayMillis: 1000,
        },
        modelsMetadata: {},
        candidateModels: undefined,
      });

      expect(recordJsonMutatedSpy).not.toHaveBeenCalled();
    });

    test("should record JSON mutation for multiple significant steps", async () => {
      const mockLLMFunction = createMockLLMFunction({
        status: LLMResponseStatus.COMPLETED,
        request: "test",
        modelKey: "test-model",
        context: { resource: "test", purpose: LLMPurpose.COMPLETIONS },
        generated: { test: "value" },
        mutationSteps: [
          SANITIZATION_STEP.TRIMMED_WHITESPACE,
          SANITIZATION_STEP.REMOVED_CODE_FENCES,
          "Fixed mismatched delimiters",
          "Added missing property commas",
        ],
      });

      const context: LLMContext = {
        resource: "test-resource",
        purpose: LLMPurpose.COMPLETIONS,
      };

      await pipeline.execute({
        resourceName: "test-resource",
        content: "test prompt",
        context,
        llmFunctions: [mockLLMFunction],
        providerRetryConfig: {
          requestTimeoutMillis: 60000,
          maxRetryAttempts: 3,
          minRetryDelayMillis: 100,
          maxRetryDelayMillis: 1000,
        },
        modelsMetadata: {},
        candidateModels: undefined,
      });

      expect(recordJsonMutatedSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("Error Context Handling", () => {
    test("should return LLMExecutionError with typed context when generated is undefined", async () => {
      const mockLLMFunction = createMockLLMFunction({
        status: LLMResponseStatus.COMPLETED,
        request: "test",
        modelKey: "test-model",
        context: { resource: "test", purpose: LLMPurpose.COMPLETIONS },
        generated: undefined, // Explicitly undefined
      });

      const context: LLMContext = {
        resource: "test-resource",
        purpose: LLMPurpose.COMPLETIONS,
        modelQuality: LLMModelQuality.PRIMARY,
        outputFormat: LLMOutputFormat.JSON,
      };

      const result = await pipeline.execute({
        resourceName: "test-resource",
        content: "test prompt",
        context,
        llmFunctions: [mockLLMFunction],
        providerRetryConfig: {
          requestTimeoutMillis: 60000,
          maxRetryAttempts: 3,
          minRetryDelayMillis: 100,
          maxRetryDelayMillis: 1000,
        },
        modelsMetadata: {},
        candidateModels: undefined,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.resourceName).toBe("test-resource");
        expect(result.error.context).toEqual(context);
        expect(result.error.context?.resource).toBe("test-resource");
        expect(result.error.context?.purpose).toBe(LLMPurpose.COMPLETIONS);
        expect(result.error.context?.modelQuality).toBe(LLMModelQuality.PRIMARY);
        expect(result.error.context?.outputFormat).toBe(LLMOutputFormat.JSON);
      }
    });

    test("should return LLMExecutionError with typed context when all functions fail", async () => {
      const mockLLMFunction = createMockLLMFunction({
        status: LLMResponseStatus.INVALID,
        request: "test",
        modelKey: "test-model",
        context: { resource: "test", purpose: LLMPurpose.COMPLETIONS },
      });

      const context: LLMContext = {
        resource: "failed-resource",
        purpose: LLMPurpose.COMPLETIONS,
        modelQuality: LLMModelQuality.SECONDARY,
      };

      const result = await pipeline.execute({
        resourceName: "failed-resource",
        content: "test prompt",
        context,
        llmFunctions: [mockLLMFunction],
        providerRetryConfig: {
          requestTimeoutMillis: 60000,
          maxRetryAttempts: 3,
          minRetryDelayMillis: 100,
          maxRetryDelayMillis: 1000,
        },
        modelsMetadata: {},
        candidateModels: undefined,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.resourceName).toBe("failed-resource");
        expect(result.error.context).toEqual(context);
        expect(result.error.context?.resource).toBe("failed-resource");
        expect(result.error.context?.purpose).toBe(LLMPurpose.COMPLETIONS);
        expect(result.error.context?.modelQuality).toBe(LLMModelQuality.SECONDARY);
      }
    });

    test("should return LLMExecutionError with typed context when LLM function throws", async () => {
      const thrownError = new Error("Unexpected error");
      const mockLLMFunction: BoundLLMFunction<LLMGeneratedContent> = async () => {
        throw thrownError;
      };

      const context: LLMContext = {
        resource: "exception-resource",
        purpose: LLMPurpose.EMBEDDINGS,
      };

      const result = await pipeline.execute({
        resourceName: "exception-resource",
        content: "test prompt",
        context,
        llmFunctions: [mockLLMFunction],
        providerRetryConfig: {
          requestTimeoutMillis: 60000,
          maxRetryAttempts: 3,
          minRetryDelayMillis: 100,
          maxRetryDelayMillis: 1000,
        },
        modelsMetadata: {},
        candidateModels: undefined,
      });

      // When LLM function throws, retry strategy catches it and returns null,
      // which causes the pipeline to return a failure result
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.resourceName).toBe("exception-resource");
        expect(result.error.context).toEqual(context);
        expect(result.error.context?.resource).toBe("exception-resource");
        expect(result.error.context?.purpose).toBe(LLMPurpose.EMBEDDINGS);
        // errorCause is undefined because the error was caught by retry strategy
        expect(result.error.errorCause).toBeUndefined();
      }
    });

    test("should return LLMExecutionError with typed context and cause when iterateOverLLMFunctions throws", async () => {
      const context: LLMContext = {
        resource: "direct-exception-resource",
        purpose: LLMPurpose.COMPLETIONS,
      };

      // Create a pipeline with a mocked retryStrategy that throws
      const testLlmStats = new LLMTelemetryTracker();
      const mockRetryStrategy = {
        executeWithRetries: async () => {
          throw new Error("Direct exception");
        },
      };
      const testPipeline = new LLMExecutionPipeline(
        mockRetryStrategy as unknown as RetryStrategy,
        testLlmStats,
      );

      const mockLLMFunction = createMockLLMFunction({
        status: LLMResponseStatus.COMPLETED,
        request: "test",
        modelKey: "test-model",
        context: { resource: "test", purpose: LLMPurpose.COMPLETIONS },
        generated: { test: "value" },
      });

      const result = await testPipeline.execute({
        resourceName: "direct-exception-resource",
        content: "test prompt",
        context,
        llmFunctions: [mockLLMFunction],
        providerRetryConfig: {
          requestTimeoutMillis: 60000,
          maxRetryAttempts: 3,
          minRetryDelayMillis: 100,
          maxRetryDelayMillis: 1000,
        },
        modelsMetadata: {},
        candidateModels: undefined,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.resourceName).toBe("direct-exception-resource");
        expect(result.error.context).toEqual(context);
        expect(result.error.context?.resource).toBe("direct-exception-resource");
        expect(result.error.context?.purpose).toBe(LLMPurpose.COMPLETIONS);
        expect(result.error.errorCause).toBeInstanceOf(Error);
        expect((result.error.errorCause as Error).message).toBe("Direct exception");
      }
    });

    test("should preserve context with responseContentParseError", async () => {
      const mockLLMFunction = createMockLLMFunction({
        status: LLMResponseStatus.COMPLETED,
        request: "test",
        modelKey: "test-model",
        context: { resource: "test", purpose: LLMPurpose.COMPLETIONS },
        generated: undefined,
      });

      const context: LLMContext = {
        resource: "parse-error-resource",
        purpose: LLMPurpose.COMPLETIONS,
        responseContentParseError: "Invalid JSON structure",
      };

      const result = await pipeline.execute({
        resourceName: "parse-error-resource",
        content: "test prompt",
        context,
        llmFunctions: [mockLLMFunction],
        providerRetryConfig: {
          requestTimeoutMillis: 60000,
          maxRetryAttempts: 3,
          minRetryDelayMillis: 100,
          maxRetryDelayMillis: 1000,
        },
        modelsMetadata: {},
        candidateModels: undefined,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.context?.responseContentParseError).toBe("Invalid JSON structure");
      }
    });
  });

  describe("Type Safety with Schemas", () => {
    let llmStats: LLMTelemetryTracker;
    let retryStrategy: RetryStrategy;
    let pipeline: LLMExecutionPipeline;

    beforeEach(() => {
      jest.spyOn(console, "log").mockImplementation(() => {
        // Mock implementation
      });
      llmStats = new LLMTelemetryTracker();
      retryStrategy = new RetryStrategy(llmStats);
      pipeline = new LLMExecutionPipeline(retryStrategy, llmStats);
    });

    test("should preserve object type through pipeline execution", async () => {
      const mockLLMFunction = createMockLLMFunction({
        status: LLMResponseStatus.COMPLETED,
        request: "test",
        modelKey: "test-model",
        context: { resource: "test", purpose: LLMPurpose.COMPLETIONS },
        generated: { enabled: true, maxItems: 10, tags: ["tag1", "tag2"] },
      });

      const context: LLMContext = {
        resource: "test-resource",
        purpose: LLMPurpose.COMPLETIONS,
      };

      const result = await pipeline.execute({
        resourceName: "test-resource",
        content: "test prompt",
        context,
        llmFunctions: [mockLLMFunction],
        providerRetryConfig: {
          requestTimeoutMillis: 60000,
          maxRetryAttempts: 3,
          minRetryDelayMillis: 100,
          maxRetryDelayMillis: 1000,
        },
        modelsMetadata: {},
      });

      expect(result.success).toBe(true);

      if (result.success) {
        const data = result.data as Record<string, unknown>;
        expect(data.enabled).toBe(true);
        expect(data.maxItems).toBe(10);
        expect(Array.isArray(data.tags)).toBe(true);
      }
    });

    test("should preserve array type through pipeline execution", async () => {
      const mockLLMFunction = createMockLLMFunction({
        status: LLMResponseStatus.COMPLETED,
        request: "test",
        modelKey: "test-model",
        context: { resource: "test", purpose: LLMPurpose.COMPLETIONS },
        generated: [
          { id: 1, name: "Item 1" },
          { id: 2, name: "Item 2" },
        ] as any,
      });

      const context: LLMContext = {
        resource: "test-resource",
        purpose: LLMPurpose.COMPLETIONS,
      };

      const result = await pipeline.execute({
        resourceName: "test-resource",
        content: "test prompt",
        context,
        llmFunctions: [mockLLMFunction],
        providerRetryConfig: {
          requestTimeoutMillis: 60000,
          maxRetryAttempts: 3,
          minRetryDelayMillis: 100,
          maxRetryDelayMillis: 1000,
        },
        modelsMetadata: {},
      });

      expect(result.success).toBe(true);

      if (result.success) {
        expect(Array.isArray(result.data)).toBe(true);
        const data = result.data as unknown[];
        expect(data.length).toBe(2);
      }
    });

    test("should preserve complex nested type", async () => {
      const mockLLMFunction = createMockLLMFunction({
        status: LLMResponseStatus.COMPLETED,
        request: "test",
        modelKey: "test-model",
        context: { resource: "test", purpose: LLMPurpose.COMPLETIONS },
        generated: {
          user: {
            id: 42,
            profile: {
              name: "Charlie",
              settings: {
                theme: "dark",
              },
            },
          },
          metadata: {
            version: "1.0.0",
          },
        },
      });

      const context: LLMContext = {
        resource: "test-resource",
        purpose: LLMPurpose.COMPLETIONS,
      };

      const result = await pipeline.execute({
        resourceName: "test-resource",
        content: "test prompt",
        context,
        llmFunctions: [mockLLMFunction],
        providerRetryConfig: {
          requestTimeoutMillis: 60000,
          maxRetryAttempts: 3,
          minRetryDelayMillis: 100,
          maxRetryDelayMillis: 1000,
        },
        modelsMetadata: {},
      });

      expect(result.success).toBe(true);

      if (result.success) {
        const data = result.data as Record<string, unknown>;
        expect(data).toHaveProperty("user");
        expect(data).toHaveProperty("metadata");
      }
    });
  });
});
