import "reflect-metadata";
import { jest, describe, test, expect } from "@jest/globals";
import {
  buildCompletionCandidates,
  getOverriddenCompletionCandidates,
} from "../../../src/llm/utils/completions-models-retriever";
import {
  LLMProvider,
  LLMModelQuality,
  LLMCandidateFunction,
  LLMFunction,
  LLMContext,
  LLMResponseStatus,
  LLMPurpose,
  LLMOutputFormat,
  LLMFunctionResponse,
} from "../../../src/llm/types/llm.types";

describe("completions-models-retriever", () => {
  describe("buildCompletionCandidates", () => {
    test("should build candidates with bound methods preserving generic signatures", () => {
      const mockExecutePrimary = jest.fn() as jest.MockedFunction<
        LLMProvider["executeCompletionPrimary"]
      >;
      const mockExecuteSecondary = jest.fn() as jest.MockedFunction<
        LLMProvider["executeCompletionSecondary"]
      >;
      const mockLLM: LLMProvider = {
        generateEmbeddings: jest.fn() as LLMFunction<number[]>,
        executeCompletionPrimary: mockExecutePrimary,
        executeCompletionSecondary: mockExecuteSecondary,
        getModelsNames: jest.fn(() => ({
          embeddings: "test-embeddings",
          primaryCompletion: "test-primary",
          secondaryCompletion: "test-secondary",
        })),
        getAvailableCompletionModelQualities: jest.fn(() => [
          LLMModelQuality.PRIMARY,
          LLMModelQuality.SECONDARY,
        ]),
        getEmbeddingModelDimensions: jest.fn(() => 1536),
        getModelFamily: jest.fn(() => "test-family"),
        getModelsMetadata: jest.fn(() => ({})),
        close: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        needsForcedShutdown: jest.fn(() => false),
      };

      const candidates = buildCompletionCandidates(mockLLM);

      expect(candidates).toHaveLength(2);
      expect(candidates[0].modelQuality).toBe(LLMModelQuality.PRIMARY);
      expect(candidates[0].description).toBe("Primary completion model");
      expect(candidates[1].modelQuality).toBe(LLMModelQuality.SECONDARY);
      expect(candidates[1].description).toBe("Secondary completion model (fallback)");

      // Verify that the functions are bound methods (not wrapped async functions)
      // Note: .bind() creates a new function, so we verify it's callable and preserves context
      expect(typeof candidates[0].func).toBe("function");
      expect(typeof candidates[1].func).toBe("function");
    });

    test("should only include primary candidate when secondary is not available", () => {
      const mockLLM: LLMProvider = {
        generateEmbeddings: jest.fn() as LLMFunction<number[]>,
        executeCompletionPrimary: jest.fn() as jest.MockedFunction<
          LLMProvider["executeCompletionPrimary"]
        >,
        executeCompletionSecondary: jest.fn() as jest.MockedFunction<
          LLMProvider["executeCompletionSecondary"]
        >,
        getModelsNames: jest.fn(() => ({
          embeddings: "test-embeddings",
          primaryCompletion: "test-primary",
        })),
        getAvailableCompletionModelQualities: jest.fn(() => [LLMModelQuality.PRIMARY]),
        getEmbeddingModelDimensions: jest.fn(() => 1536),
        getModelFamily: jest.fn(() => "test-family"),
        getModelsMetadata: jest.fn(() => ({})),
        close: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        needsForcedShutdown: jest.fn(() => false),
      };

      const candidates = buildCompletionCandidates(mockLLM);

      expect(candidates).toHaveLength(1);
      expect(candidates[0].modelQuality).toBe(LLMModelQuality.PRIMARY);
    });

    test("should preserve generic type information in bound methods", async () => {
      const mockResponse: LLMFunctionResponse<string> = {
        status: LLMResponseStatus.COMPLETED,
        request: "test",
        modelKey: "test-model",
        context: { resource: "test", purpose: LLMPurpose.COMPLETIONS },
        generated: "test response",
      };

      const mockExecutePrimary = jest.fn() as jest.MockedFunction<
        LLMProvider["executeCompletionPrimary"]
      >;
      mockExecutePrimary.mockResolvedValue(mockResponse);
      const mockLLM: LLMProvider = {
        generateEmbeddings: jest.fn() as LLMFunction<number[]>,
        executeCompletionPrimary: mockExecutePrimary,
        executeCompletionSecondary: jest.fn() as jest.MockedFunction<
          LLMProvider["executeCompletionSecondary"]
        >,
        getModelsNames: jest.fn(() => ({
          embeddings: "test-embeddings",
          primaryCompletion: "test-primary",
        })),
        getAvailableCompletionModelQualities: jest.fn(() => [LLMModelQuality.PRIMARY]),
        getEmbeddingModelDimensions: jest.fn(() => 1536),
        getModelFamily: jest.fn(() => "test-family"),
        getModelsMetadata: jest.fn(() => ({})),
        close: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        needsForcedShutdown: jest.fn(() => false),
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
      expect(mockExecutePrimary).toHaveBeenCalledWith("test prompt", context, {
        outputFormat: LLMOutputFormat.TEXT,
      });
    });
  });

  describe("getOverriddenCompletionCandidates", () => {
    test("should filter candidates by model quality override", () => {
      const candidates: LLMCandidateFunction[] = [
        {
          func: jest.fn() as LLMFunction,
          modelQuality: LLMModelQuality.PRIMARY,
          description: "Primary",
        },
        {
          func: jest.fn() as LLMFunction,
          modelQuality: LLMModelQuality.SECONDARY,
          description: "Secondary",
        },
      ];

      const result = getOverriddenCompletionCandidates(candidates, LLMModelQuality.SECONDARY);

      expect(result.candidatesToUse).toHaveLength(1);
      expect(result.candidatesToUse[0].modelQuality).toBe(LLMModelQuality.SECONDARY);
      expect(result.candidateFunctions).toHaveLength(1);
    });

    test("should return all candidates when override is null", () => {
      const candidates: LLMCandidateFunction[] = [
        {
          func: jest.fn() as LLMFunction,
          modelQuality: LLMModelQuality.PRIMARY,
          description: "Primary",
        },
        {
          func: jest.fn() as LLMFunction,
          modelQuality: LLMModelQuality.SECONDARY,
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
          modelQuality: LLMModelQuality.PRIMARY,
          description: "Primary",
        },
      ];

      expect(() => {
        getOverriddenCompletionCandidates(candidates, LLMModelQuality.SECONDARY);
      }).toThrow("No completion candidates found for model quality: secondary");
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
          modelQuality: LLMModelQuality.PRIMARY,
          description: "Primary",
        },
        {
          func: func2,
          modelQuality: LLMModelQuality.SECONDARY,
          description: "Secondary",
        },
      ];

      const result = getOverriddenCompletionCandidates(candidates, null);

      expect(result.candidateFunctions[0]).toBe(func1);
      expect(result.candidateFunctions[1]).toBe(func2);
    });
  });
});
