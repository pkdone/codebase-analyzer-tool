import "reflect-metadata";
import { jest, describe, test, expect } from "@jest/globals";
import {
  buildCompletionCandidatesFromChain,
  buildEmbeddingCandidatesFromChain,
  getFilteredCompletionCandidates,
} from "../../../../src/common/llm/utils/completions-models-retriever";
import { LLMPurpose } from "../../../../src/common/llm/types/llm-request.types";
import { LLMResponseStatus } from "../../../../src/common/llm/types/llm-response.types";
import type { LLMCandidateFunction } from "../../../../src/common/llm/types/llm-function.types";
import type { ProviderManager } from "../../../../src/common/llm/provider-manager";
import type { ResolvedModelChain } from "../../../../src/common/llm/types/llm-model.types";
import type { LLMProvider } from "../../../../src/common/llm/types/llm-provider.interface";
import { LLMError, LLMErrorCode } from "../../../../src/common/llm/types/llm-errors.types";

// Mock provider for testing
function createMockProvider(): LLMProvider {
  const mockExecuteCompletion = jest.fn<() => Promise<{ generated: string; status: string }>>();
  mockExecuteCompletion.mockResolvedValue({
    generated: "test response",
    status: LLMResponseStatus.COMPLETED,
  });

  const mockGenerateEmbeddings = jest.fn<() => Promise<{ generated: number[]; status: string }>>();
  mockGenerateEmbeddings.mockResolvedValue({
    generated: [0.1, 0.2, 0.3],
    status: LLMResponseStatus.COMPLETED,
  });

  const mockClose = jest.fn<() => Promise<void>>();
  mockClose.mockResolvedValue(undefined);

  const mockValidateCredentials = jest.fn<() => Promise<void>>();
  mockValidateCredentials.mockResolvedValue(undefined);

  return {
    executeCompletion: mockExecuteCompletion,
    generateEmbeddings: mockGenerateEmbeddings,
    getModelFamily: jest.fn().mockReturnValue("TestProvider"),
    getModelsNames: jest.fn().mockReturnValue({
      [LLMPurpose.EMBEDDINGS]: ["embed-model"],
      [LLMPurpose.COMPLETIONS]: ["comp-model"],
    }),
    getAvailableModelNames: jest.fn().mockReturnValue({
      embeddings: ["embed-model"],
      completions: ["comp-model"],
    }),
    getModelsMetadata: jest.fn().mockReturnValue({}),
    getEmbeddingModelDimensions: jest.fn().mockReturnValue(1536),
    close: mockClose,
    getShutdownBehavior: jest.fn().mockReturnValue("graceful"),
    validateCredentials: mockValidateCredentials,
  } as unknown as LLMProvider;
}

// Mock provider manager for testing
function createMockProviderManager(providers: Record<string, LLMProvider>): ProviderManager {
  return {
    getProvider: jest.fn((family: string) => {
      if (!(family in providers)) {
        throw new Error(`Provider not found: ${family}`);
      }
      return providers[family];
    }),
    getAllProviders: jest.fn(() => Object.values(providers)),
    hasProvider: jest.fn((family: string) => family in providers),
    getAllModelsMetadata: jest.fn(() => ({})),
    shutdown: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  } as unknown as ProviderManager;
}

describe("completions-models-retriever", () => {
  describe("buildCompletionCandidatesFromChain", () => {
    test("should build candidates for each model in the chain", () => {
      const mockProvider = createMockProvider();
      const providerManager = createMockProviderManager({
        TestProvider: mockProvider,
      });

      const modelChain: ResolvedModelChain = {
        embeddings: [],
        completions: [
          { providerFamily: "TestProvider", modelKey: "comp-model-1", modelUrn: "urn-1" },
          { providerFamily: "TestProvider", modelKey: "comp-model-2", modelUrn: "urn-2" },
        ],
      };

      const candidates = buildCompletionCandidatesFromChain(providerManager, modelChain);

      expect(candidates).toHaveLength(2);
      expect(candidates[0].modelKey).toBe("comp-model-1");
      expect(candidates[0].providerFamily).toBe("TestProvider");
      expect(candidates[0].priority).toBe(0);
      expect(candidates[1].modelKey).toBe("comp-model-2");
      expect(candidates[1].providerFamily).toBe("TestProvider");
      expect(candidates[1].priority).toBe(1);
    });

    test("should build candidates from multiple providers", () => {
      const mockProviderA = createMockProvider();
      const mockProviderB = createMockProvider();
      const providerManager = createMockProviderManager({
        ProviderA: mockProviderA,
        ProviderB: mockProviderB,
      });

      const modelChain: ResolvedModelChain = {
        embeddings: [],
        completions: [
          { providerFamily: "ProviderA", modelKey: "model-a", modelUrn: "urn-a" },
          { providerFamily: "ProviderB", modelKey: "model-b", modelUrn: "urn-b" },
          { providerFamily: "ProviderA", modelKey: "model-a2", modelUrn: "urn-a2" },
        ],
      };

      const candidates = buildCompletionCandidatesFromChain(providerManager, modelChain);

      expect(candidates).toHaveLength(3);
      expect(candidates[0].providerFamily).toBe("ProviderA");
      expect(candidates[0].modelKey).toBe("model-a");
      expect(candidates[1].providerFamily).toBe("ProviderB");
      expect(candidates[1].modelKey).toBe("model-b");
      expect(candidates[2].providerFamily).toBe("ProviderA");
      expect(candidates[2].modelKey).toBe("model-a2");
    });

    test("should create bound functions that route to correct provider", async () => {
      const mockProvider = createMockProvider();
      const providerManager = createMockProviderManager({
        TestProvider: mockProvider,
      });

      const modelChain: ResolvedModelChain = {
        embeddings: [],
        completions: [{ providerFamily: "TestProvider", modelKey: "test-model", modelUrn: "urn" }],
      };

      const candidates = buildCompletionCandidatesFromChain(providerManager, modelChain);
      expect(candidates).toHaveLength(1);

      // Call the bound function
      const context = { resource: "test-resource", purpose: LLMPurpose.COMPLETIONS };
      await candidates[0].func("test prompt", context);

      // Verify it called the provider's executeCompletion with the correct model key
      expect(mockProvider.executeCompletion).toHaveBeenCalledWith(
        "test-model",
        "test prompt",
        context,
        undefined,
      );
    });
  });

  describe("buildEmbeddingCandidatesFromChain", () => {
    test("should build embedding candidates for each model in the chain", () => {
      const mockProvider = createMockProvider();
      const providerManager = createMockProviderManager({
        TestProvider: mockProvider,
      });

      const modelChain: ResolvedModelChain = {
        embeddings: [
          { providerFamily: "TestProvider", modelKey: "embed-1", modelUrn: "urn-1" },
          { providerFamily: "TestProvider", modelKey: "embed-2", modelUrn: "urn-2" },
        ],
        completions: [],
      };

      const candidates = buildEmbeddingCandidatesFromChain(providerManager, modelChain);

      expect(candidates).toHaveLength(2);
      expect(candidates[0].modelKey).toBe("embed-1");
      expect(candidates[0].providerFamily).toBe("TestProvider");
      expect(candidates[0].priority).toBe(0);
      expect(candidates[1].modelKey).toBe("embed-2");
      expect(candidates[1].priority).toBe(1);
    });

    test("should create bound functions that route to correct provider", async () => {
      const mockProvider = createMockProvider();
      const providerManager = createMockProviderManager({
        TestProvider: mockProvider,
      });

      const modelChain: ResolvedModelChain = {
        embeddings: [{ providerFamily: "TestProvider", modelKey: "embed-model", modelUrn: "urn" }],
        completions: [],
      };

      const candidates = buildEmbeddingCandidatesFromChain(providerManager, modelChain);
      expect(candidates).toHaveLength(1);

      // Call the bound function
      const context = { resource: "test-resource", purpose: LLMPurpose.EMBEDDINGS };
      await candidates[0].func("test content", context);

      // Verify it called the provider's generateEmbeddings with the correct model key
      expect(mockProvider.generateEmbeddings).toHaveBeenCalledWith(
        "embed-model",
        "test content",
        context,
      );
    });
  });

  describe("getFilteredCompletionCandidates", () => {
    const mockCandidates: LLMCandidateFunction[] = [
      {
        func: jest.fn() as unknown as LLMCandidateFunction["func"],
        providerFamily: "Provider1",
        modelKey: "model-1",
        description: "Model 1",
        priority: 0,
      },
      {
        func: jest.fn() as unknown as LLMCandidateFunction["func"],
        providerFamily: "Provider2",
        modelKey: "model-2",
        description: "Model 2",
        priority: 1,
      },
      {
        func: jest.fn() as unknown as LLMCandidateFunction["func"],
        providerFamily: "Provider1",
        modelKey: "model-3",
        description: "Model 3",
        priority: 2,
      },
    ];

    test("should return all candidates when no index override", () => {
      const result = getFilteredCompletionCandidates(mockCandidates);

      expect(result.candidatesToUse).toHaveLength(3);
      expect(result.candidateFunctions).toHaveLength(3);
    });

    test("should return single candidate when index override is provided", () => {
      const result = getFilteredCompletionCandidates(mockCandidates, 1);

      expect(result.candidatesToUse).toHaveLength(1);
      expect(result.candidatesToUse[0].modelKey).toBe("model-2");
      expect(result.candidateFunctions).toHaveLength(1);
    });

    test("should throw error for invalid index", () => {
      expect(() => getFilteredCompletionCandidates(mockCandidates, -1)).toThrow(LLMError);
      expect(() => getFilteredCompletionCandidates(mockCandidates, 3)).toThrow(LLMError);
      expect(() => getFilteredCompletionCandidates(mockCandidates, 100)).toThrow(LLMError);

      try {
        getFilteredCompletionCandidates(mockCandidates, 5);
      } catch (error) {
        expect(error).toBeInstanceOf(LLMError);
        expect((error as LLMError).code).toBe(LLMErrorCode.BAD_CONFIGURATION);
      }
    });

    test("should throw error when no candidates available", () => {
      expect(() => getFilteredCompletionCandidates([])).toThrow(LLMError);

      try {
        getFilteredCompletionCandidates([]);
      } catch (error) {
        expect(error).toBeInstanceOf(LLMError);
        expect((error as LLMError).code).toBe(LLMErrorCode.BAD_CONFIGURATION);
        expect((error as Error).message).toContain("No completion candidates available");
      }
    });
  });
});
