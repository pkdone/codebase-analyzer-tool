import "reflect-metadata";
import { jest, describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import {
  LLMExecutionPipeline,
  type LLMPipelineConfig,
} from "../../../../src/common/llm/llm-execution-pipeline";
import LLMExecutionStats from "../../../../src/common/llm/tracking/llm-execution-stats";
import { RetryStrategy } from "../../../../src/common/llm/strategies/retry-strategy";
import {
  LLMContext,
  LLMPurpose,
  LLMOutputFormat,
} from "../../../../src/common/llm/types/llm-request.types";
import {
  LLMResponseStatus,
  LLMFunctionResponse,
  LLMGeneratedContent,
} from "../../../../src/common/llm/types/llm-response.types";
import { BoundLLMFunction } from "../../../../src/common/llm/types/llm-function.types";
import { REPAIR_STEP } from "../../../../src/common/llm/json-processing/sanitizers";

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

/**
 * Creates a mock pipeline configuration for testing.
 */
function createMockPipelineConfig(): LLMPipelineConfig {
  return {
    retryConfig: {
      requestTimeoutMillis: 60000,
      maxRetryAttempts: 3,
      minRetryDelayMillis: 100,
      maxRetryDelayMillis: 1000,
    },
    getModelsMetadata: () => ({}),
  };
}

describe("LLMExecutionPipeline - JSON Mutation Detection", () => {
  let llmStats: LLMExecutionStats;
  let retryStrategy: RetryStrategy;
  let pipeline: LLMExecutionPipeline;
  let recordJsonMutatedSpy: jest.SpiedFunction<() => void>;

  beforeEach(() => {
    // Mock console.log to avoid cluttering test output
    jest.spyOn(console, "log").mockImplementation(() => {
      // Mock implementation
    });

    // Create real instances
    llmStats = new LLMExecutionStats();
    retryStrategy = new RetryStrategy(llmStats);

    // Create the pipeline with mock config
    const pipelineConfig = createMockPipelineConfig();
    pipeline = new LLMExecutionPipeline(retryStrategy, llmStats, pipelineConfig);

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
        repairs: [REPAIR_STEP.TRIMMED_WHITESPACE, "Fixed trailing commas"],
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
        repairs: [REPAIR_STEP.TRIMMED_WHITESPACE],
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
        repairs: [REPAIR_STEP.REMOVED_CODE_FENCES],
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
        repairs: [REPAIR_STEP.TRIMMED_WHITESPACE, REPAIR_STEP.REMOVED_CODE_FENCES],
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
        repairs: [],
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
        repairs: [
          REPAIR_STEP.TRIMMED_WHITESPACE,
          REPAIR_STEP.REMOVED_CODE_FENCES,
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
        outputFormat: LLMOutputFormat.JSON,
      };

      const result = await pipeline.execute({
        resourceName: "test-resource",
        content: "test prompt",
        context,
        llmFunctions: [mockLLMFunction],
        candidateModels: undefined,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.resourceName).toBe("test-resource");
        expect(result.error.context).toEqual(context);
        expect(result.error.context?.resource).toBe("test-resource");
        expect(result.error.context?.purpose).toBe(LLMPurpose.COMPLETIONS);
        // modelTier has been removed from LLMContext
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
      };

      const result = await pipeline.execute({
        resourceName: "failed-resource",
        content: "test prompt",
        context,
        llmFunctions: [mockLLMFunction],
        candidateModels: undefined,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.resourceName).toBe("failed-resource");
        expect(result.error.context).toEqual(context);
        expect(result.error.context?.resource).toBe("failed-resource");
        expect(result.error.context?.purpose).toBe(LLMPurpose.COMPLETIONS);
        // modelTier has been removed from LLMContext
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

    test("should return LLMExecutionError with typed context and cause when tryFallbackChain throws", async () => {
      const context: LLMContext = {
        resource: "direct-exception-resource",
        purpose: LLMPurpose.COMPLETIONS,
      };

      // Create a pipeline with a mocked retryStrategy that throws
      const testLlmStats = new LLMExecutionStats();
      const mockRetryStrategy = {
        executeWithRetries: async () => {
          throw new Error("Direct exception");
        },
      };
      const testPipeline = new LLMExecutionPipeline(
        mockRetryStrategy as unknown as RetryStrategy,
        testLlmStats,
        createMockPipelineConfig(),
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
        candidateModels: undefined,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.context?.responseContentParseError).toBe("Invalid JSON structure");
      }
    });
  });

  describe("Type Safety with Schemas", () => {
    let llmStats: LLMExecutionStats;
    let retryStrategy: RetryStrategy;
    let pipeline: LLMExecutionPipeline;

    beforeEach(() => {
      jest.spyOn(console, "log").mockImplementation(() => {
        // Mock implementation
      });
      llmStats = new LLMExecutionStats();
      retryStrategy = new RetryStrategy(llmStats);
      const pipelineConfig = createMockPipelineConfig();
      pipeline = new LLMExecutionPipeline(retryStrategy, llmStats, pipelineConfig);
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
      });

      expect(result.success).toBe(true);

      if (result.success) {
        const data = result.data as Record<string, unknown>;
        expect(data).toHaveProperty("user");
        expect(data).toHaveProperty("metadata");
      }
    });
  });

  describe("Null vs Undefined Content Handling", () => {
    /**
     * Tests that verify the pipeline correctly distinguishes between:
     * - undefined: No content was generated (error case)
     * - null: Content is null, which is a valid value in LLMGeneratedContent
     */

    test("should return success when generated content is null", async () => {
      // null is a valid member of LLMGeneratedContent representing "absence of content"
      // but still a valid response that was intentionally returned
      const mockLLMFunction = createMockLLMFunction({
        status: LLMResponseStatus.COMPLETED,
        request: "test",
        modelKey: "test-model",
        context: { resource: "test", purpose: LLMPurpose.COMPLETIONS },
        generated: null,
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
      });

      // null is a valid response type in LLMGeneratedContent, should succeed
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeNull();
      }
    });

    test("should return error when generated content is explicitly undefined", async () => {
      // undefined means no content was generated - this is an error case
      const mockLLMFunction = createMockLLMFunction({
        status: LLMResponseStatus.COMPLETED,
        request: "test",
        modelKey: "test-model",
        context: { resource: "test", purpose: LLMPurpose.COMPLETIONS },
        generated: undefined,
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
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain("generated no content");
      }
    });

    test("should return success when generated content is empty string", async () => {
      // Empty string is a valid string response (though unusual for LLM output)
      const mockLLMFunction = createMockLLMFunction({
        status: LLMResponseStatus.COMPLETED,
        request: "test",
        modelKey: "test-model",
        context: { resource: "test", purpose: LLMPurpose.COMPLETIONS },
        generated: "",
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
      });

      // Empty string is a valid string value, should succeed
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("");
      }
    });

    test("should return success when generated content is empty object", async () => {
      // Empty object is valid JSON
      const mockLLMFunction = createMockLLMFunction({
        status: LLMResponseStatus.COMPLETED,
        request: "test",
        modelKey: "test-model",
        context: { resource: "test", purpose: LLMPurpose.COMPLETIONS },
        generated: {},
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
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({});
      }
    });

    test("should return success when generated content is empty array", async () => {
      // Empty array is valid JSON
      const mockLLMFunction = createMockLLMFunction({
        status: LLMResponseStatus.COMPLETED,
        request: "test",
        modelKey: "test-model",
        context: { resource: "test", purpose: LLMPurpose.COMPLETIONS },
        generated: [] as unknown[],
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
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual([]);
      }
    });
  });
});
