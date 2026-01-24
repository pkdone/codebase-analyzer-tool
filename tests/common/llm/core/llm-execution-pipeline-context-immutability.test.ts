import "reflect-metadata";
import { jest, describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import {
  LLMExecutionPipeline,
  type LLMPipelineConfig,
} from "../../../../src/common/llm/llm-execution-pipeline";
import LLMExecutionStats from "../../../../src/common/llm/tracking/llm-execution-stats";
import { RetryStrategy } from "../../../../src/common/llm/strategies/retry-strategy";
import { LLMContext, LLMPurpose } from "../../../../src/common/llm/types/llm-request.types";
import { LLMResponseStatus } from "../../../../src/common/llm/types/llm-response.types";
import { ExecutableCandidate } from "../../../../src/common/llm/types/llm-function.types";

/**
 * Tests verifying that LLMExecutionPipeline treats context as immutable.
 * Context should not be mutated during execution - instead, new context
 * objects should be created for each candidate iteration.
 */
describe("LLMExecutionPipeline - Context Immutability", () => {
  let llmStats: LLMExecutionStats;
  let retryStrategy: RetryStrategy;
  let pipeline: LLMExecutionPipeline;

  const createMockPipelineConfig = (): LLMPipelineConfig => ({
    retryConfig: {
      requestTimeoutMillis: 60000,
      maxRetryAttempts: 1, // Single attempt for cleaner tests
      minRetryDelayMillis: 10,
      maxRetryDelayMillis: 100,
    },
    getModelsMetadata: () => ({}),
  });

  beforeEach(() => {
    jest.spyOn(console, "log").mockImplementation(() => {
      // Suppress logs
    });
    llmStats = new LLMExecutionStats();
    retryStrategy = new RetryStrategy(llmStats);
    pipeline = new LLMExecutionPipeline(retryStrategy, llmStats, createMockPipelineConfig());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("Context Not Mutated During Fallback", () => {
    test("original context modelKey remains unchanged after fallback to second candidate", async () => {
      // Track what modelKey the LLM functions receive
      const receivedContexts: LLMContext[] = [];

      // First candidate fails (OVERLOADED), second succeeds
      const failingCandidate: ExecutableCandidate<string> = {
        execute: async (_content: string, ctx: LLMContext) => {
          receivedContexts.push({ ...ctx });
          return {
            status: LLMResponseStatus.OVERLOADED,
            request: "test",
            modelKey: "model-1",
            context: ctx,
          };
        },
        providerFamily: "test-provider",
        modelKey: "model-1",
        description: "test-provider/model-1",
      };

      const successCandidate: ExecutableCandidate<string> = {
        execute: async (_content: string, ctx: LLMContext) => {
          receivedContexts.push({ ...ctx });
          return {
            status: LLMResponseStatus.COMPLETED,
            request: "test",
            modelKey: "model-2",
            context: ctx,
            generated: "success result",
          };
        },
        providerFamily: "test-provider",
        modelKey: "model-2",
        description: "test-provider/model-2",
      };

      const originalContext: LLMContext = {
        resource: "test-resource",
        purpose: LLMPurpose.COMPLETIONS,
        modelKey: "initial-model",
      };

      // Deep copy to verify original is not mutated
      const originalContextCopy = { ...originalContext };

      await pipeline.execute({
        resourceName: "test-resource",
        content: "test prompt",
        context: originalContext,
        candidates: [failingCandidate, successCandidate],
      });

      // Verify original context was not mutated
      expect(originalContext).toEqual(originalContextCopy);
      expect(originalContext.modelKey).toBe("initial-model");

      // Verify each candidate received a context with the correct modelKey
      expect(receivedContexts).toHaveLength(2);
      expect(receivedContexts[0].modelKey).toBe("model-1");
      expect(receivedContexts[1].modelKey).toBe("model-2");
    });

    test("original context modelKey unchanged when all candidates fail", async () => {
      const receivedContexts: LLMContext[] = [];

      const failingCandidate1: ExecutableCandidate<string> = {
        execute: async (_content: string, ctx: LLMContext) => {
          receivedContexts.push({ ...ctx });
          return {
            status: LLMResponseStatus.OVERLOADED,
            request: "test",
            modelKey: "model-1",
            context: ctx,
          };
        },
        providerFamily: "test-provider",
        modelKey: "model-1",
        description: "test-provider/model-1",
      };

      const failingCandidate2: ExecutableCandidate<string> = {
        execute: async (_content: string, ctx: LLMContext) => {
          receivedContexts.push({ ...ctx });
          return {
            status: LLMResponseStatus.OVERLOADED,
            request: "test",
            modelKey: "model-2",
            context: ctx,
          };
        },
        providerFamily: "test-provider",
        modelKey: "model-2",
        description: "test-provider/model-2",
      };

      const originalContext: LLMContext = {
        resource: "test-resource",
        purpose: LLMPurpose.COMPLETIONS,
        modelKey: "original-key",
      };

      const originalContextCopy = { ...originalContext };

      await pipeline.execute({
        resourceName: "test-resource",
        content: "test prompt",
        context: originalContext,
        candidates: [failingCandidate1, failingCandidate2],
      });

      // Original context should be unchanged
      expect(originalContext).toEqual(originalContextCopy);
      expect(originalContext.modelKey).toBe("original-key");

      // Each candidate should have received its own modelKey
      expect(receivedContexts[0].modelKey).toBe("model-1");
      expect(receivedContexts[1].modelKey).toBe("model-2");
    });

    test("context other fields are preserved during fallback", async () => {
      const receivedContexts: LLMContext[] = [];

      const failingCandidate: ExecutableCandidate<string> = {
        execute: async (_content: string, ctx: LLMContext) => {
          receivedContexts.push({ ...ctx });
          return {
            status: LLMResponseStatus.OVERLOADED,
            request: "test",
            modelKey: "model-1",
            context: ctx,
          };
        },
        providerFamily: "test-provider",
        modelKey: "model-1",
        description: "test-provider/model-1",
      };

      const successCandidate: ExecutableCandidate<string> = {
        execute: async (_content: string, ctx: LLMContext) => {
          receivedContexts.push({ ...ctx });
          return {
            status: LLMResponseStatus.COMPLETED,
            request: "test",
            modelKey: "model-2",
            context: ctx,
            generated: "success",
          };
        },
        providerFamily: "test-provider",
        modelKey: "model-2",
        description: "test-provider/model-2",
      };

      const originalContext: LLMContext = {
        resource: "special-resource",
        purpose: LLMPurpose.EMBEDDINGS,
        modelKey: "initial-model",
      };

      await pipeline.execute({
        resourceName: "special-resource",
        content: "test prompt",
        context: originalContext,
        candidates: [failingCandidate, successCandidate],
      });

      // Both contexts should have preserved the original resource and purpose
      receivedContexts.forEach((ctx) => {
        expect(ctx.resource).toBe("special-resource");
        expect(ctx.purpose).toBe(LLMPurpose.EMBEDDINGS);
      });
    });
  });

  describe("Context Per-Candidate Isolation", () => {
    test("each candidate receives isolated context object", async () => {
      const receivedContexts: LLMContext[] = [];

      // Use candidates that always fail to ensure fallback happens
      const createFailingCandidate = (modelKey: string): ExecutableCandidate<string> => ({
        execute: async (_content: string, ctx: LLMContext) => {
          receivedContexts.push(ctx);
          return {
            status: LLMResponseStatus.OVERLOADED,
            request: "test",
            modelKey,
            context: ctx,
          };
        },
        providerFamily: "test-provider",
        modelKey,
        description: `test-provider/${modelKey}`,
      });

      const originalContext: LLMContext = {
        resource: "test-resource",
        purpose: LLMPurpose.COMPLETIONS,
      };

      await pipeline.execute({
        resourceName: "test-resource",
        content: "test prompt",
        context: originalContext,
        candidates: [
          createFailingCandidate("model-A"),
          createFailingCandidate("model-B"),
          createFailingCandidate("model-C"),
        ],
      });

      // Verify each candidate received a different context object
      expect(receivedContexts).toHaveLength(3);

      // Each context should be a separate object
      expect(receivedContexts[0]).not.toBe(receivedContexts[1]);
      expect(receivedContexts[1]).not.toBe(receivedContexts[2]);
      expect(receivedContexts[0]).not.toBe(originalContext);
    });

    test("modifying context in candidate does not affect next candidate", async () => {
      const receivedContexts: LLMContext[] = [];

      // Candidate that attempts to modify the context
      const mutatingCandidate: ExecutableCandidate<string> = {
        execute: async (_content: string, ctx: LLMContext) => {
          receivedContexts.push({ ...ctx });
          // Attempt to mutate - this should not affect other candidates
          // because pipeline creates new context objects
          (ctx as { modelKey: string }).modelKey = "mutated-key";
          return {
            status: LLMResponseStatus.OVERLOADED,
            request: "test",
            modelKey: "model-1",
            context: ctx,
          };
        },
        providerFamily: "test-provider",
        modelKey: "model-1",
        description: "test-provider/model-1",
      };

      const nextCandidate: ExecutableCandidate<string> = {
        execute: async (_content: string, ctx: LLMContext) => {
          receivedContexts.push({ ...ctx });
          return {
            status: LLMResponseStatus.COMPLETED,
            request: "test",
            modelKey: "model-2",
            context: ctx,
            generated: "success",
          };
        },
        providerFamily: "test-provider",
        modelKey: "model-2",
        description: "test-provider/model-2",
      };

      const originalContext: LLMContext = {
        resource: "test-resource",
        purpose: LLMPurpose.COMPLETIONS,
        modelKey: "original-key",
      };

      await pipeline.execute({
        resourceName: "test-resource",
        content: "test prompt",
        context: originalContext,
        candidates: [mutatingCandidate, nextCandidate],
      });

      // Second candidate should still receive correct modelKey from its candidate
      expect(receivedContexts[1].modelKey).toBe("model-2");
      // Original context unchanged
      expect(originalContext.modelKey).toBe("original-key");
    });
  });

  describe("Context During Retry", () => {
    test("context modelKey consistent during retries of same candidate", async () => {
      const receivedContexts: LLMContext[] = [];
      let callCount = 0;

      // Candidate that fails first time, succeeds second time
      const retryingCandidate: ExecutableCandidate<string> = {
        execute: async (_content: string, ctx: LLMContext) => {
          receivedContexts.push({ ...ctx });
          callCount++;
          if (callCount === 1) {
            return {
              status: LLMResponseStatus.OVERLOADED,
              request: "test",
              modelKey: "model-1",
              context: ctx,
            };
          }
          return {
            status: LLMResponseStatus.COMPLETED,
            request: "test",
            modelKey: "model-1",
            context: ctx,
            generated: "success after retry",
          };
        },
        providerFamily: "test-provider",
        modelKey: "model-1",
        description: "test-provider/model-1",
      };

      // Use pipeline with 2 retry attempts
      const retryConfig = createMockPipelineConfig();
      retryConfig.retryConfig.maxRetryAttempts = 2;
      const pipelineWithRetry = new LLMExecutionPipeline(
        new RetryStrategy(new LLMExecutionStats()),
        new LLMExecutionStats(),
        retryConfig,
      );

      const originalContext: LLMContext = {
        resource: "test-resource",
        purpose: LLMPurpose.COMPLETIONS,
        modelKey: "should-be-overwritten",
      };

      await pipelineWithRetry.execute({
        resourceName: "test-resource",
        content: "test prompt",
        context: originalContext,
        candidates: [retryingCandidate],
      });

      // Both calls should have received the same modelKey (from candidate)
      expect(receivedContexts).toHaveLength(2);
      expect(receivedContexts[0].modelKey).toBe("model-1");
      expect(receivedContexts[1].modelKey).toBe("model-1");
    });
  });
});
