import "reflect-metadata";
import { jest, describe, test, expect } from "@jest/globals";
import {
  buildCompletionCandidatesFromChain,
  buildEmbeddingCandidatesFromChain,
  buildExecutableCandidates,
  buildExecutableEmbeddingCandidates,
} from "../../../../src/common/llm/utils/completions-models-retriever";
import {
  LLMPurpose,
  LLMOutputFormat,
  type LLMCompletionOptions,
} from "../../../../src/common/llm/types/llm-request.types";
import { LLMResponseStatus } from "../../../../src/common/llm/types/llm-response.types";
import type { LLMCandidateFunction } from "../../../../src/common/llm/types/llm-function.types";
import type { ProviderManager } from "../../../../src/common/llm/provider-manager";
import type { ResolvedModelChain } from "../../../../src/common/llm/types/llm-model.types";
import type { LLMProvider } from "../../../../src/common/llm/types/llm-provider.interface";
import { LLMError, LLMErrorCode } from "../../../../src/common/llm/types/llm-errors.types";
import { z } from "zod";

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
    getProviderFamily: jest.fn().mockReturnValue("TestProvider"),
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

  describe("buildExecutableCandidates", () => {
    const testSchema = z.object({ value: z.string() });
    const testOptions: LLMCompletionOptions<typeof testSchema> = {
      outputFormat: LLMOutputFormat.JSON,
      jsonSchema: testSchema,
    };

    // Helper to create mock candidate functions with proper typing
    function createMockCandidateFunc(generatedValue: string): LLMCandidateFunction["func"] {
      return (async () => ({
        status: LLMResponseStatus.COMPLETED,
        generated: { value: generatedValue },
        request: "test",
        modelKey: "test-model",
        context: { resource: "test", purpose: LLMPurpose.COMPLETIONS },
      })) as unknown as LLMCandidateFunction["func"];
    }

    const mockCandidates: LLMCandidateFunction[] = [
      {
        func: createMockCandidateFunc("result1"),
        providerFamily: "Provider1",
        modelKey: "model-1",
        description: "Provider1/model-1",
        priority: 0,
      },
      {
        func: createMockCandidateFunc("result2"),
        providerFamily: "Provider2",
        modelKey: "model-2",
        description: "Provider2/model-2",
        priority: 1,
      },
      {
        func: createMockCandidateFunc("result3"),
        providerFamily: "Provider1",
        modelKey: "model-3",
        description: "Provider1/model-3",
        priority: 2,
      },
    ];

    test("should create unified executable candidates with bound functions and metadata", () => {
      const candidates = buildExecutableCandidates(mockCandidates, testOptions);

      expect(candidates).toHaveLength(3);

      // Check first candidate has all expected properties
      expect(candidates[0].execute).toBeDefined();
      expect(typeof candidates[0].execute).toBe("function");
      expect(candidates[0].providerFamily).toBe("Provider1");
      expect(candidates[0].modelKey).toBe("model-1");
      expect(candidates[0].description).toBe("Provider1/model-1");

      // Check second candidate
      expect(candidates[1].providerFamily).toBe("Provider2");
      expect(candidates[1].modelKey).toBe("model-2");
    });

    test("should correctly apply index override - slicing from specified index", () => {
      const candidates = buildExecutableCandidates(mockCandidates, testOptions, 1);

      // Should slice from index 1, so only models 2 and 3
      expect(candidates).toHaveLength(2);
      expect(candidates[0].modelKey).toBe("model-2");
      expect(candidates[1].modelKey).toBe("model-3");
    });

    test("should throw LLMError for invalid index (negative)", () => {
      expect(() => buildExecutableCandidates(mockCandidates, testOptions, -1)).toThrow(LLMError);

      try {
        buildExecutableCandidates(mockCandidates, testOptions, -1);
      } catch (error) {
        expect(error).toBeInstanceOf(LLMError);
        expect((error as LLMError).code).toBe(LLMErrorCode.BAD_CONFIGURATION);
        expect((error as Error).message).toContain("Invalid completion candidate index");
      }
    });

    test("should throw LLMError for invalid index (out of bounds)", () => {
      expect(() => buildExecutableCandidates(mockCandidates, testOptions, 3)).toThrow(LLMError);
      expect(() => buildExecutableCandidates(mockCandidates, testOptions, 100)).toThrow(LLMError);
    });

    test("should throw LLMError when no candidates available", () => {
      expect(() => buildExecutableCandidates([], testOptions)).toThrow(LLMError);

      try {
        buildExecutableCandidates([], testOptions);
      } catch (error) {
        expect(error).toBeInstanceOf(LLMError);
        expect((error as LLMError).code).toBe(LLMErrorCode.BAD_CONFIGURATION);
        expect((error as Error).message).toContain("No completion candidates available");
      }
    });

    test("should bind options to the execute function and return expected response", async () => {
      const candidates = buildExecutableCandidates(mockCandidates, testOptions);
      const context = { resource: "test", purpose: LLMPurpose.COMPLETIONS };

      // Call the bound execute function
      const result = await candidates[0].execute("test content", context);

      // Verify the result matches what the mock function returns
      expect(result.status).toBe(LLMResponseStatus.COMPLETED);
      expect(result.generated).toEqual({ value: "result1" });
    });

    test("should assign debug-friendly names to bound functions", () => {
      const candidates = buildExecutableCandidates(mockCandidates, testOptions);

      // Check function names are set for debugging
      expect(candidates[0].execute.name).toBe("boundCompletion_0");
      expect(candidates[1].execute.name).toBe("boundCompletion_1");
    });

    test("should preserve correct debug names when using index override", () => {
      const candidates = buildExecutableCandidates(mockCandidates, testOptions, 1);

      // When starting from index 1, names should reflect original indices
      expect(candidates[0].execute.name).toBe("boundCompletion_1");
      expect(candidates[1].execute.name).toBe("boundCompletion_2");
    });
  });

  describe("buildExecutableEmbeddingCandidates", () => {
    test("should create unified executable embedding candidates", () => {
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

      const embeddingCandidates = buildEmbeddingCandidatesFromChain(providerManager, modelChain);
      const candidates = buildExecutableEmbeddingCandidates(embeddingCandidates);

      expect(candidates).toHaveLength(2);
      expect(candidates[0].execute).toBeDefined();
      expect(candidates[0].providerFamily).toBe("TestProvider");
      expect(candidates[0].modelKey).toBe("embed-1");
      expect(candidates[0].description).toBe("TestProvider/embed-1");
    });

    test("should correctly apply index override for embeddings", () => {
      const mockProvider = createMockProvider();
      const providerManager = createMockProviderManager({
        TestProvider: mockProvider,
      });

      const modelChain: ResolvedModelChain = {
        embeddings: [
          { providerFamily: "TestProvider", modelKey: "embed-1", modelUrn: "urn-1" },
          { providerFamily: "TestProvider", modelKey: "embed-2", modelUrn: "urn-2" },
          { providerFamily: "TestProvider", modelKey: "embed-3", modelUrn: "urn-3" },
        ],
        completions: [],
      };

      const embeddingCandidates = buildEmbeddingCandidatesFromChain(providerManager, modelChain);
      const candidates = buildExecutableEmbeddingCandidates(embeddingCandidates, 1);

      expect(candidates).toHaveLength(2);
      expect(candidates[0].modelKey).toBe("embed-2");
      expect(candidates[1].modelKey).toBe("embed-3");
    });

    test("should throw LLMError for invalid embedding index", () => {
      const mockProvider = createMockProvider();
      const providerManager = createMockProviderManager({
        TestProvider: mockProvider,
      });

      const modelChain: ResolvedModelChain = {
        embeddings: [{ providerFamily: "TestProvider", modelKey: "embed-1", modelUrn: "urn-1" }],
        completions: [],
      };

      const embeddingCandidates = buildEmbeddingCandidatesFromChain(providerManager, modelChain);

      expect(() => buildExecutableEmbeddingCandidates(embeddingCandidates, -1)).toThrow(LLMError);
      expect(() => buildExecutableEmbeddingCandidates(embeddingCandidates, 1)).toThrow(LLMError);
    });

    test("should throw LLMError when no embedding candidates available", () => {
      expect(() => buildExecutableEmbeddingCandidates([])).toThrow(LLMError);

      try {
        buildExecutableEmbeddingCandidates([]);
      } catch (error) {
        expect(error).toBeInstanceOf(LLMError);
        expect((error as LLMError).code).toBe(LLMErrorCode.BAD_CONFIGURATION);
        expect((error as Error).message).toContain("No embedding candidates available");
      }
    });
  });
});
