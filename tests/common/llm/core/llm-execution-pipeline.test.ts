import "reflect-metadata";
import { jest, describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { z } from "zod";
import { LLMExecutionPipeline } from "../../../../src/common/llm/llm-execution-pipeline";
import LLMStats from "../../../../src/common/llm/tracking/llm-stats";
import { RetryStrategy } from "../../../../src/common/llm/strategies/retry-strategy";
import {
  LLMContext,
  LLMPurpose,
  LLMResponseStatus,
  LLMOutputFormat,
  LLMFunctionResponse,
  LLMFunction,
  LLMModelQuality,
} from "../../../../src/common/llm/types/llm.types";
import { SANITIZATION_STEP } from "../../../../src/common/llm/json-processing/sanitizers";

/**
 * Helper to create a mock LLMFunction.
 * Since LLMFunction is now a generic function type, we need to cast the mock.
 */
function createMockLLMFunction(response: LLMFunctionResponse): LLMFunction {
  // Use explicit async function to avoid Jest mock type inference issues
  return (async () => response) as unknown as LLMFunction;
}

describe("LLMExecutionPipeline - JSON Mutation Detection", () => {
  let llmStats: LLMStats;
  let retryStrategy: RetryStrategy;
  let pipeline: LLMExecutionPipeline;
  let recordJsonMutatedSpy: jest.SpiedFunction<() => void>;

  beforeEach(() => {
    // Mock console.log to avoid cluttering test output
    jest.spyOn(console, "log").mockImplementation(() => {
      // Mock implementation
    });

    // Create real instances
    llmStats = new LLMStats();
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
        prompt: "test prompt",
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
        completionOptions: { outputFormat: LLMOutputFormat.JSON },
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
        prompt: "test prompt",
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
        completionOptions: { outputFormat: LLMOutputFormat.JSON },
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
        prompt: "test prompt",
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
        completionOptions: { outputFormat: LLMOutputFormat.JSON },
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
        prompt: "test prompt",
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
        completionOptions: { outputFormat: LLMOutputFormat.JSON },
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
        prompt: "test prompt",
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
        completionOptions: { outputFormat: LLMOutputFormat.JSON },
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
        prompt: "test prompt",
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
        completionOptions: { outputFormat: LLMOutputFormat.JSON },
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
        prompt: "test prompt",
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
        completionOptions: { outputFormat: LLMOutputFormat.JSON },
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
        prompt: "test prompt",
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
        completionOptions: { outputFormat: LLMOutputFormat.JSON },
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
        prompt: "test prompt",
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
        completionOptions: { outputFormat: LLMOutputFormat.TEXT },
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
      const mockLLMFunction = (async () => {
        throw thrownError;
      }) as unknown as LLMFunction;

      const context: LLMContext = {
        resource: "exception-resource",
        purpose: LLMPurpose.EMBEDDINGS,
      };

      const result = await pipeline.execute({
        resourceName: "exception-resource",
        prompt: "test prompt",
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
        completionOptions: { outputFormat: LLMOutputFormat.JSON },
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
      const testLlmStats = new LLMStats();
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
        prompt: "test prompt",
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
        completionOptions: { outputFormat: LLMOutputFormat.JSON },
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
        prompt: "test prompt",
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
        completionOptions: { outputFormat: LLMOutputFormat.JSON },
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.context?.responseContentParseError).toBe("Invalid JSON structure");
      }
    });
  });

  describe("Type Safety with Schemas", () => {
    let llmStats: LLMStats;
    let retryStrategy: RetryStrategy;
    let pipeline: LLMExecutionPipeline;

    beforeEach(() => {
      jest.spyOn(console, "log").mockImplementation(() => {
        // Mock implementation
      });
      llmStats = new LLMStats();
      retryStrategy = new RetryStrategy(llmStats);
      pipeline = new LLMExecutionPipeline(retryStrategy, llmStats);
    });

    test("should preserve object schema type through pipeline execution", async () => {
      const configSchema = z.object({
        enabled: z.boolean(),
        maxItems: z.number(),
        tags: z.array(z.string()),
      });

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
        prompt: "test prompt",
        context,
        llmFunctions: [mockLLMFunction],
        providerRetryConfig: {
          requestTimeoutMillis: 60000,
          maxRetryAttempts: 3,
          minRetryDelayMillis: 100,
          maxRetryDelayMillis: 1000,
        },
        modelsMetadata: {},
        completionOptions: {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: configSchema,
        },
      });

      expect(result.success).toBe(true);

      if (result.success) {
        const data = result.data as Record<string, unknown>;
        expect(data.enabled).toBe(true);
        expect(data.maxItems).toBe(10);
        expect(Array.isArray(data.tags)).toBe(true);
      }
    });

    test("should preserve array schema type through pipeline execution", async () => {
      const itemsSchema = z.array(
        z.object({
          id: z.number(),
          name: z.string(),
        }),
      );

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
        prompt: "test prompt",
        context,
        llmFunctions: [mockLLMFunction],
        providerRetryConfig: {
          requestTimeoutMillis: 60000,
          maxRetryAttempts: 3,
          minRetryDelayMillis: 100,
          maxRetryDelayMillis: 1000,
        },
        modelsMetadata: {},
        completionOptions: {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: itemsSchema,
        },
      });

      expect(result.success).toBe(true);

      if (result.success) {
        expect(Array.isArray(result.data)).toBe(true);
        const data = result.data as unknown[];
        expect(data.length).toBe(2);
      }
    });

    test("should preserve complex nested schema type", async () => {
      const complexSchema = z.object({
        user: z.object({
          id: z.number(),
          profile: z.object({
            name: z.string(),
            settings: z.object({
              theme: z.string(),
            }),
          }),
        }),
        metadata: z.object({
          version: z.string(),
        }),
      });

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
        prompt: "test prompt",
        context,
        llmFunctions: [mockLLMFunction],
        providerRetryConfig: {
          requestTimeoutMillis: 60000,
          maxRetryAttempts: 3,
          minRetryDelayMillis: 100,
          maxRetryDelayMillis: 1000,
        },
        modelsMetadata: {},
        completionOptions: {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: complexSchema,
        },
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
