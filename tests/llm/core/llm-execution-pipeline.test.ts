import "reflect-metadata";
import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import { LLMExecutionPipeline } from "../../../src/llm/llm-execution-pipeline";
import LLMStats from "../../../src/llm/tracking/llm-stats";
import { RetryStrategy } from "../../../src/llm/strategies/retry-strategy";
import { FallbackStrategy } from "../../../src/llm/strategies/fallback-strategy";
import { PromptAdaptationStrategy } from "../../../src/llm/strategies/prompt-adaptation-strategy";
import {
  LLMContext,
  LLMPurpose,
  LLMResponseStatus,
  LLMOutputFormat,
  LLMFunctionResponse,
  LLMFunction,
} from "../../../src/llm/types/llm.types";
import { SANITIZATION_STEP } from "../../../src/llm/json-processing/sanitizers";

describe("LLMExecutionPipeline - JSON Mutation Detection", () => {
  let llmStats: LLMStats;
  let retryStrategy: RetryStrategy;
  let fallbackStrategy: FallbackStrategy;
  let promptAdaptationStrategy: PromptAdaptationStrategy;
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
    fallbackStrategy = new FallbackStrategy();
    promptAdaptationStrategy = new PromptAdaptationStrategy();

    // Create the pipeline
    pipeline = new LLMExecutionPipeline(
      retryStrategy,
      fallbackStrategy,
      promptAdaptationStrategy,
      llmStats,
    );

    // Spy on the recordJsonMutated method
    recordJsonMutatedSpy = jest.spyOn(llmStats, "recordJsonMutated");
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("Significant mutation detection", () => {
    test("should record JSON mutation for significant sanitization steps", async () => {
      const mockLLMFunction = jest.fn<LLMFunction<Record<string, unknown>>>().mockResolvedValue({
        status: LLMResponseStatus.COMPLETED,
        request: "test",
        modelKey: "test-model",
        context: { resource: "test", purpose: LLMPurpose.COMPLETIONS },
        generated: { test: "value" },
        mutationSteps: [SANITIZATION_STEP.TRIMMED_WHITESPACE, "Fixed trailing commas"],
      } as LLMFunctionResponse<Record<string, unknown>>);

      const context: LLMContext = {
        resource: "test-resource",
        purpose: LLMPurpose.COMPLETIONS,
      };

      await pipeline.execute(
        "test-resource",
        "test prompt",
        context,
        [mockLLMFunction],
        {
          requestTimeoutMillis: 60000,
          maxRetryAttempts: 3,
          minRetryDelayMillis: 100,
          maxRetryDelayMillis: 1000,
        },
        {},
        undefined,
        { outputFormat: LLMOutputFormat.JSON },
      );

      expect(recordJsonMutatedSpy).toHaveBeenCalledTimes(1);
    });

    test("should NOT record JSON mutation for only whitespace trimming", async () => {
      const mockLLMFunction = jest.fn<LLMFunction>().mockResolvedValue({
        status: LLMResponseStatus.COMPLETED,
        request: "test",
        modelKey: "test-model",
        context: { resource: "test", purpose: LLMPurpose.COMPLETIONS },
        generated: { test: "value" },
        mutationSteps: [SANITIZATION_STEP.TRIMMED_WHITESPACE],
      } as LLMFunctionResponse);

      const context: LLMContext = {
        resource: "test-resource",
        purpose: LLMPurpose.COMPLETIONS,
      };

      await pipeline.execute(
        "test-resource",
        "test prompt",
        context,
        [mockLLMFunction],
        {
          requestTimeoutMillis: 60000,
          maxRetryAttempts: 3,
          minRetryDelayMillis: 100,
          maxRetryDelayMillis: 1000,
        },
        {},
        undefined,
        { outputFormat: LLMOutputFormat.JSON },
      );

      expect(recordJsonMutatedSpy).not.toHaveBeenCalled();
    });

    test("should NOT record JSON mutation for only code fence removal", async () => {
      const mockLLMFunction = jest.fn<LLMFunction>().mockResolvedValue({
        status: LLMResponseStatus.COMPLETED,
        request: "test",
        modelKey: "test-model",
        context: { resource: "test", purpose: LLMPurpose.COMPLETIONS },
        generated: { test: "value" },
        mutationSteps: [SANITIZATION_STEP.REMOVED_CODE_FENCES],
      } as LLMFunctionResponse);

      const context: LLMContext = {
        resource: "test-resource",
        purpose: LLMPurpose.COMPLETIONS,
      };

      await pipeline.execute(
        "test-resource",
        "test prompt",
        context,
        [mockLLMFunction],
        {
          requestTimeoutMillis: 60000,
          maxRetryAttempts: 3,
          minRetryDelayMillis: 100,
          maxRetryDelayMillis: 1000,
        },
        {},
        undefined,
        { outputFormat: LLMOutputFormat.JSON },
      );

      expect(recordJsonMutatedSpy).not.toHaveBeenCalled();
    });

    test("should NOT record JSON mutation for both whitespace and code fence removal only", async () => {
      const mockLLMFunction = jest.fn<LLMFunction>().mockResolvedValue({
        status: LLMResponseStatus.COMPLETED,
        request: "test",
        modelKey: "test-model",
        context: { resource: "test", purpose: LLMPurpose.COMPLETIONS },
        generated: { test: "value" },
        mutationSteps: [
          SANITIZATION_STEP.TRIMMED_WHITESPACE,
          SANITIZATION_STEP.REMOVED_CODE_FENCES,
        ],
      } as LLMFunctionResponse);

      const context: LLMContext = {
        resource: "test-resource",
        purpose: LLMPurpose.COMPLETIONS,
      };

      await pipeline.execute(
        "test-resource",
        "test prompt",
        context,
        [mockLLMFunction],
        {
          requestTimeoutMillis: 60000,
          maxRetryAttempts: 3,
          minRetryDelayMillis: 100,
          maxRetryDelayMillis: 1000,
        },
        {},
        undefined,
        { outputFormat: LLMOutputFormat.JSON },
      );

      expect(recordJsonMutatedSpy).not.toHaveBeenCalled();
    });

    test("should NOT record JSON mutation when no sanitization steps", async () => {
      const mockLLMFunction = jest.fn<LLMFunction>().mockResolvedValue({
        status: LLMResponseStatus.COMPLETED,
        request: "test",
        modelKey: "test-model",
        context: { resource: "test", purpose: LLMPurpose.COMPLETIONS },
        generated: { test: "value" },
        mutationSteps: [],
      } as LLMFunctionResponse);

      const context: LLMContext = {
        resource: "test-resource",
        purpose: LLMPurpose.COMPLETIONS,
      };

      await pipeline.execute(
        "test-resource",
        "test prompt",
        context,
        [mockLLMFunction],
        {
          requestTimeoutMillis: 60000,
          maxRetryAttempts: 3,
          minRetryDelayMillis: 100,
          maxRetryDelayMillis: 1000,
        },
        {},
        undefined,
        { outputFormat: LLMOutputFormat.JSON },
      );

      expect(recordJsonMutatedSpy).not.toHaveBeenCalled();
    });

    test("should NOT record JSON mutation when sanitizationSteps is undefined", async () => {
      const mockLLMFunction = jest.fn<LLMFunction>().mockResolvedValue({
        status: LLMResponseStatus.COMPLETED,
        request: "test",
        modelKey: "test-model",
        context: { resource: "test", purpose: LLMPurpose.COMPLETIONS },
        generated: { test: "value" },
      } as LLMFunctionResponse);

      const context: LLMContext = {
        resource: "test-resource",
        purpose: LLMPurpose.COMPLETIONS,
      };

      await pipeline.execute(
        "test-resource",
        "test prompt",
        context,
        [mockLLMFunction],
        {
          requestTimeoutMillis: 60000,
          maxRetryAttempts: 3,
          minRetryDelayMillis: 100,
          maxRetryDelayMillis: 1000,
        },
        {},
        undefined,
        { outputFormat: LLMOutputFormat.JSON },
      );

      expect(recordJsonMutatedSpy).not.toHaveBeenCalled();
    });

    test("should record JSON mutation for multiple significant steps", async () => {
      const mockLLMFunction = jest.fn<LLMFunction>().mockResolvedValue({
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
      } as LLMFunctionResponse);

      const context: LLMContext = {
        resource: "test-resource",
        purpose: LLMPurpose.COMPLETIONS,
      };

      await pipeline.execute(
        "test-resource",
        "test prompt",
        context,
        [mockLLMFunction],
        {
          requestTimeoutMillis: 60000,
          maxRetryAttempts: 3,
          minRetryDelayMillis: 100,
          maxRetryDelayMillis: 1000,
        },
        {},
        undefined,
        { outputFormat: LLMOutputFormat.JSON },
      );

      expect(recordJsonMutatedSpy).toHaveBeenCalledTimes(1);
    });
  });
});
