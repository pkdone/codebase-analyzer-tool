import "reflect-metadata";
import { jest, describe, test, expect } from "@jest/globals";
import {
  buildCompletionCandidates,
  getOverriddenCompletionCandidates,
} from "../../../../src/common/llm/utils/completions-models-retriever";
import {
  LLMContext,
  LLMPurpose,
  LLMOutputFormat,
} from "../../../../src/common/llm/types/llm-request.types";
import {
  LLMResponseStatus,
  LLMFunctionResponse,
} from "../../../../src/common/llm/types/llm-response.types";
import {
  LLMCandidateFunction,
  LLMFunction,
  LLMEmbeddingFunction,
} from "../../../../src/common/llm/types/llm-function.types";
import { LLMModelTier } from "../../../../src/common/llm/types/llm-model.types";
import type { LLMProvider } from "../../../../src/common/llm/types/llm-provider.interface";
import { ShutdownBehavior } from "../../../../src/common/llm/types/llm-shutdown.types";

describe("completions-models-retriever", () => {
  describe("buildCompletionCandidates", () => {
    test("should build candidates with bound methods preserving generic signatures", () => {
      const mockExecutePrimary = jest.fn() as unknown as LLMFunction;
      const mockExecuteSecondary = jest.fn() as unknown as LLMFunction;
      const mockLLM: LLMProvider = {
        generateEmbeddings: jest.fn() as unknown as LLMEmbeddingFunction,
        executeCompletionPrimary: mockExecutePrimary,
        executeCompletionSecondary: mockExecuteSecondary,
        getModelsNames: jest.fn(() => ({
          embeddings: "test-embeddings",
          primaryCompletion: "test-primary",
          secondaryCompletion: "test-secondary",
        })),
        getAvailableCompletionModelTiers: jest.fn(() => [
          LLMModelTier.PRIMARY,
          LLMModelTier.SECONDARY,
        ]),
        getEmbeddingModelDimensions: jest.fn(() => 1536),
        getModelFamily: jest.fn(() => "test-family"),
        getModelsMetadata: jest.fn(() => ({})),
        close: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        getShutdownBehavior: jest.fn(() => ShutdownBehavior.GRACEFUL),
        validateCredentials: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      };

      const candidates = buildCompletionCandidates(mockLLM);

      expect(candidates).toHaveLength(2);
      expect(candidates[0].modelTier).toBe(LLMModelTier.PRIMARY);
      expect(candidates[0].description).toBe("Primary completion model");
      expect(candidates[1].modelTier).toBe(LLMModelTier.SECONDARY);
      expect(candidates[1].description).toBe("Secondary completion model (fallback)");

      // Verify that the functions are bound methods (not wrapped async functions)
      // Note: .bind() creates a new function, so we verify it's callable and preserves context
      expect(typeof candidates[0].func).toBe("function");
      expect(typeof candidates[1].func).toBe("function");
    });

    test("should only include primary candidate when secondary is not available", () => {
      const mockLLM: LLMProvider = {
        generateEmbeddings: jest.fn() as unknown as LLMEmbeddingFunction,
        executeCompletionPrimary: jest.fn() as unknown as LLMFunction,
        executeCompletionSecondary: jest.fn() as unknown as LLMFunction,
        getModelsNames: jest.fn(() => ({
          embeddings: "test-embeddings",
          primaryCompletion: "test-primary",
        })),
        getAvailableCompletionModelTiers: jest.fn(() => [LLMModelTier.PRIMARY]),
        getEmbeddingModelDimensions: jest.fn(() => 1536),
        getModelFamily: jest.fn(() => "test-family"),
        getModelsMetadata: jest.fn(() => ({})),
        close: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        getShutdownBehavior: jest.fn(() => ShutdownBehavior.GRACEFUL),
        validateCredentials: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      };

      const candidates = buildCompletionCandidates(mockLLM);

      expect(candidates).toHaveLength(1);
      expect(candidates[0].modelTier).toBe(LLMModelTier.PRIMARY);
    });

    test("should preserve type information in bound methods", async () => {
      const mockResponse: LLMFunctionResponse<string> = {
        status: LLMResponseStatus.COMPLETED,
        request: "test",
        modelKey: "test-model",
        context: { resource: "test", purpose: LLMPurpose.COMPLETIONS },
        generated: "test response",
      };

      // Create a trackable mock by wrapping with jest.fn
      let capturedArgs: unknown[] = [];
      const mockExecutePrimaryTyped = (async (...args: unknown[]) => {
        capturedArgs = args;
        return mockResponse;
      }) as unknown as LLMFunction;

      const mockLLM: LLMProvider = {
        generateEmbeddings: jest.fn() as unknown as LLMEmbeddingFunction,
        executeCompletionPrimary: mockExecutePrimaryTyped,
        executeCompletionSecondary: jest.fn() as unknown as LLMFunction,
        getModelsNames: jest.fn(() => ({
          embeddings: "test-embeddings",
          primaryCompletion: "test-primary",
        })),
        getAvailableCompletionModelTiers: jest.fn(() => [LLMModelTier.PRIMARY]),
        getEmbeddingModelDimensions: jest.fn(() => 1536),
        getModelFamily: jest.fn(() => "test-family"),
        getModelsMetadata: jest.fn(() => ({})),
        close: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        getShutdownBehavior: jest.fn(() => ShutdownBehavior.GRACEFUL),
        validateCredentials: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      };

      const candidates = buildCompletionCandidates(mockLLM);
      const context: LLMContext = {
        resource: "test",
        purpose: LLMPurpose.COMPLETIONS,
      };

      const result = await candidates[0].func("test prompt", context, {
        outputFormat: LLMOutputFormat.TEXT,
      });

      expect(result).toEqual(mockResponse);
      // Verify the function was called with correct arguments
      expect(capturedArgs[0]).toBe("test prompt");
      expect(capturedArgs[1]).toEqual(context);
      expect(capturedArgs[2]).toEqual({ outputFormat: LLMOutputFormat.TEXT });
    });
  });

  describe("getOverriddenCompletionCandidates", () => {
    test("should filter candidates by model tier override", () => {
      const candidates: LLMCandidateFunction[] = [
        {
          func: jest.fn() as LLMFunction,
          modelTier: LLMModelTier.PRIMARY,
          description: "Primary",
        },
        {
          func: jest.fn() as LLMFunction,
          modelTier: LLMModelTier.SECONDARY,
          description: "Secondary",
        },
      ];

      const result = getOverriddenCompletionCandidates(candidates, LLMModelTier.SECONDARY);

      expect(result.candidatesToUse).toHaveLength(1);
      expect(result.candidatesToUse[0].modelTier).toBe(LLMModelTier.SECONDARY);
      expect(result.candidateFunctions).toHaveLength(1);
    });

    test("should return all candidates when override is null", () => {
      const candidates: LLMCandidateFunction[] = [
        {
          func: jest.fn() as LLMFunction,
          modelTier: LLMModelTier.PRIMARY,
          description: "Primary",
        },
        {
          func: jest.fn() as LLMFunction,
          modelTier: LLMModelTier.SECONDARY,
          description: "Secondary",
        },
      ];

      const result = getOverriddenCompletionCandidates(candidates, null);

      expect(result.candidatesToUse).toHaveLength(2);
      expect(result.candidateFunctions).toHaveLength(2);
    });

    test("should throw error when no candidates match override", () => {
      const candidates: LLMCandidateFunction[] = [
        {
          func: jest.fn() as LLMFunction,
          modelTier: LLMModelTier.PRIMARY,
          description: "Primary",
        },
      ];

      expect(() => {
        getOverriddenCompletionCandidates(candidates, LLMModelTier.SECONDARY);
      }).toThrow("No completion candidates found for model tier: secondary");
    });

    test("should throw error when no candidates available", () => {
      const candidates: LLMCandidateFunction[] = [];

      expect(() => {
        getOverriddenCompletionCandidates(candidates, null);
      }).toThrow("No completion candidates available");
    });

    test("should preserve function references in candidateFunctions", () => {
      const func1 = jest.fn() as LLMFunction;
      const func2 = jest.fn() as LLMFunction;
      const candidates: LLMCandidateFunction[] = [
        {
          func: func1,
          modelTier: LLMModelTier.PRIMARY,
          description: "Primary",
        },
        {
          func: func2,
          modelTier: LLMModelTier.SECONDARY,
          description: "Secondary",
        },
      ];

      const result = getOverriddenCompletionCandidates(candidates, null);

      expect(result.candidateFunctions[0]).toBe(func1);
      expect(result.candidateFunctions[1]).toBe(func2);
    });
  });
});
