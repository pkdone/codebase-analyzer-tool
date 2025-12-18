import "reflect-metadata";
import { jest, describe, test, expect, beforeEach, afterEach } from "@jest/globals";
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
});
