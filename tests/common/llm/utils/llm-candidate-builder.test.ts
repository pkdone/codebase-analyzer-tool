import "reflect-metadata";
import { jest, describe, test, expect } from "@jest/globals";
import {
  buildCompletionExecutables,
  buildEmbeddingExecutables,
} from "../../../../src/common/llm/utils/llm-candidate-builder";
import {
  LLMPurpose,
  LLMOutputFormat,
  type LLMCompletionOptions,
} from "../../../../src/common/llm/types/llm-request.types";
import {
  LLMResponseStatus,
  isCompletedResponse,
} from "../../../../src/common/llm/types/llm-response.types";
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

describe("llm-candidate-builder", () => {
  const testSchema = z.object({ value: z.string() });
  const testOptions: LLMCompletionOptions<typeof testSchema> = {
    outputFormat: LLMOutputFormat.JSON,
    jsonSchema: testSchema,
  };

  describe("buildCompletionExecutables", () => {
    test("should build executable candidates for each model in the chain", () => {
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

      const candidates = buildCompletionExecutables(providerManager, modelChain, testOptions);

      expect(candidates).toHaveLength(2);
      expect(candidates[0].modelKey).toBe("comp-model-1");
      expect(candidates[0].providerFamily).toBe("TestProvider");
      expect(candidates[0].description).toBe("TestProvider/comp-model-1");
      expect(candidates[1].modelKey).toBe("comp-model-2");
      expect(candidates[1].providerFamily).toBe("TestProvider");
      expect(candidates[1].description).toBe("TestProvider/comp-model-2");
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

      const candidates = buildCompletionExecutables(providerManager, modelChain, testOptions);

      expect(candidates).toHaveLength(3);
      expect(candidates[0].providerFamily).toBe("ProviderA");
      expect(candidates[0].modelKey).toBe("model-a");
      expect(candidates[1].providerFamily).toBe("ProviderB");
      expect(candidates[1].modelKey).toBe("model-b");
      expect(candidates[2].providerFamily).toBe("ProviderA");
      expect(candidates[2].modelKey).toBe("model-a2");
    });

    test("should create bound functions that route to correct provider with options", async () => {
      const mockProvider = createMockProvider();
      const providerManager = createMockProviderManager({
        TestProvider: mockProvider,
      });

      const modelChain: ResolvedModelChain = {
        embeddings: [],
        completions: [{ providerFamily: "TestProvider", modelKey: "test-model", modelUrn: "urn" }],
      };

      const candidates = buildCompletionExecutables(providerManager, modelChain, testOptions);
      expect(candidates).toHaveLength(1);

      // Call the bound function
      const context = {
        resource: "test-resource",
        purpose: LLMPurpose.COMPLETIONS,
        modelKey: "test-model",
      };
      await candidates[0].execute("test prompt", context);

      // Verify it called the provider's executeCompletion with the correct model key and options
      expect(mockProvider.executeCompletion).toHaveBeenCalledWith(
        "test-model",
        "test prompt",
        context,
        testOptions,
      );
    });

    test("should correctly apply index override - slicing from specified index", () => {
      const mockProvider = createMockProvider();
      const providerManager = createMockProviderManager({
        TestProvider: mockProvider,
      });

      const modelChain: ResolvedModelChain = {
        embeddings: [],
        completions: [
          { providerFamily: "TestProvider", modelKey: "model-1", modelUrn: "urn-1" },
          { providerFamily: "TestProvider", modelKey: "model-2", modelUrn: "urn-2" },
          { providerFamily: "TestProvider", modelKey: "model-3", modelUrn: "urn-3" },
        ],
      };

      const candidates = buildCompletionExecutables(providerManager, modelChain, testOptions, 1);

      // Should slice from index 1, so only models 2 and 3
      expect(candidates).toHaveLength(2);
      expect(candidates[0].modelKey).toBe("model-2");
      expect(candidates[1].modelKey).toBe("model-3");
    });

    test("should throw LLMError for invalid index (negative)", () => {
      const mockProvider = createMockProvider();
      const providerManager = createMockProviderManager({
        TestProvider: mockProvider,
      });

      const modelChain: ResolvedModelChain = {
        embeddings: [],
        completions: [{ providerFamily: "TestProvider", modelKey: "model-1", modelUrn: "urn-1" }],
      };

      expect(() =>
        buildCompletionExecutables(providerManager, modelChain, testOptions, -1),
      ).toThrow(LLMError);

      try {
        buildCompletionExecutables(providerManager, modelChain, testOptions, -1);
      } catch (error) {
        expect(error).toBeInstanceOf(LLMError);
        expect((error as LLMError).code).toBe(LLMErrorCode.BAD_CONFIGURATION);
        expect((error as Error).message).toContain("Invalid completion model index");
      }
    });

    test("should throw LLMError for invalid index (out of bounds)", () => {
      const mockProvider = createMockProvider();
      const providerManager = createMockProviderManager({
        TestProvider: mockProvider,
      });

      const modelChain: ResolvedModelChain = {
        embeddings: [],
        completions: [
          { providerFamily: "TestProvider", modelKey: "model-1", modelUrn: "urn-1" },
          { providerFamily: "TestProvider", modelKey: "model-2", modelUrn: "urn-2" },
        ],
      };

      expect(() => buildCompletionExecutables(providerManager, modelChain, testOptions, 2)).toThrow(
        LLMError,
      );
      expect(() =>
        buildCompletionExecutables(providerManager, modelChain, testOptions, 100),
      ).toThrow(LLMError);
    });

    test("should throw LLMError when no completion models configured", () => {
      const mockProvider = createMockProvider();
      const providerManager = createMockProviderManager({
        TestProvider: mockProvider,
      });

      const modelChain: ResolvedModelChain = {
        embeddings: [{ providerFamily: "TestProvider", modelKey: "embed-1", modelUrn: "urn-1" }],
        completions: [],
      };

      expect(() => buildCompletionExecutables(providerManager, modelChain, testOptions)).toThrow(
        LLMError,
      );

      try {
        buildCompletionExecutables(providerManager, modelChain, testOptions);
      } catch (error) {
        expect(error).toBeInstanceOf(LLMError);
        expect((error as LLMError).code).toBe(LLMErrorCode.BAD_CONFIGURATION);
        expect((error as Error).message).toContain("No completion models configured");
      }
    });

    test("should execute bound function and return expected response", async () => {
      const mockProvider = createMockProvider();
      (mockProvider.executeCompletion as ReturnType<typeof jest.fn>).mockResolvedValue({
        status: LLMResponseStatus.COMPLETED,
        generated: { value: "test-result" },
        request: "test",
        modelKey: "test-model",
        context: { resource: "test", purpose: LLMPurpose.COMPLETIONS, modelKey: "test-model" },
      });

      const providerManager = createMockProviderManager({
        TestProvider: mockProvider,
      });

      const modelChain: ResolvedModelChain = {
        embeddings: [],
        completions: [{ providerFamily: "TestProvider", modelKey: "test-model", modelUrn: "urn" }],
      };

      const candidates = buildCompletionExecutables(providerManager, modelChain, testOptions);
      const context = { resource: "test", purpose: LLMPurpose.COMPLETIONS, modelKey: "test-model" };

      const result = await candidates[0].execute("test content", context);

      expect(result.status).toBe(LLMResponseStatus.COMPLETED);
      expect(isCompletedResponse(result)).toBe(true);
      if (isCompletedResponse(result)) {
        expect(result.generated).toEqual({ value: "test-result" });
      }
    });

    test("should assign debug-friendly names to bound functions", () => {
      const mockProvider = createMockProvider();
      const providerManager = createMockProviderManager({
        TestProvider: mockProvider,
      });

      const modelChain: ResolvedModelChain = {
        embeddings: [],
        completions: [
          { providerFamily: "TestProvider", modelKey: "model-1", modelUrn: "urn-1" },
          { providerFamily: "TestProvider", modelKey: "model-2", modelUrn: "urn-2" },
        ],
      };

      const candidates = buildCompletionExecutables(providerManager, modelChain, testOptions);

      // Check function names are set for debugging
      expect(candidates[0].execute.name).toBe("boundCompletion_0");
      expect(candidates[1].execute.name).toBe("boundCompletion_1");
    });

    test("should preserve correct debug names when using index override", () => {
      const mockProvider = createMockProvider();
      const providerManager = createMockProviderManager({
        TestProvider: mockProvider,
      });

      const modelChain: ResolvedModelChain = {
        embeddings: [],
        completions: [
          { providerFamily: "TestProvider", modelKey: "model-1", modelUrn: "urn-1" },
          { providerFamily: "TestProvider", modelKey: "model-2", modelUrn: "urn-2" },
          { providerFamily: "TestProvider", modelKey: "model-3", modelUrn: "urn-3" },
        ],
      };

      const candidates = buildCompletionExecutables(providerManager, modelChain, testOptions, 1);

      // When starting from index 1, names should reflect original indices
      expect(candidates[0].execute.name).toBe("boundCompletion_1");
      expect(candidates[1].execute.name).toBe("boundCompletion_2");
    });
  });

  describe("buildEmbeddingExecutables", () => {
    test("should build executable embedding candidates for each model in the chain", () => {
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

      const candidates = buildEmbeddingExecutables(providerManager, modelChain);

      expect(candidates).toHaveLength(2);
      expect(candidates[0].modelKey).toBe("embed-1");
      expect(candidates[0].providerFamily).toBe("TestProvider");
      expect(candidates[0].description).toBe("TestProvider/embed-1");
      expect(candidates[1].modelKey).toBe("embed-2");
      expect(candidates[1].description).toBe("TestProvider/embed-2");
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

      const candidates = buildEmbeddingExecutables(providerManager, modelChain);
      expect(candidates).toHaveLength(1);

      // Call the bound function
      const context = {
        resource: "test-resource",
        purpose: LLMPurpose.EMBEDDINGS,
        modelKey: "embed-model",
      };
      await candidates[0].execute("test content", context);

      // Verify it called the provider's generateEmbeddings with the correct model key
      expect(mockProvider.generateEmbeddings).toHaveBeenCalledWith(
        "embed-model",
        "test content",
        context,
      );
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

      const candidates = buildEmbeddingExecutables(providerManager, modelChain, 1);

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

      expect(() => buildEmbeddingExecutables(providerManager, modelChain, -1)).toThrow(LLMError);
      expect(() => buildEmbeddingExecutables(providerManager, modelChain, 1)).toThrow(LLMError);
    });

    test("should throw LLMError when no embedding models configured", () => {
      const mockProvider = createMockProvider();
      const providerManager = createMockProviderManager({
        TestProvider: mockProvider,
      });

      const modelChain: ResolvedModelChain = {
        embeddings: [],
        completions: [{ providerFamily: "TestProvider", modelKey: "comp-1", modelUrn: "urn-1" }],
      };

      expect(() => buildEmbeddingExecutables(providerManager, modelChain)).toThrow(LLMError);

      try {
        buildEmbeddingExecutables(providerManager, modelChain);
      } catch (error) {
        expect(error).toBeInstanceOf(LLMError);
        expect((error as LLMError).code).toBe(LLMErrorCode.BAD_CONFIGURATION);
        expect((error as Error).message).toContain("No embedding models configured");
      }
    });

    test("should assign debug-friendly names to bound embedding functions", () => {
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

      const candidates = buildEmbeddingExecutables(providerManager, modelChain);

      expect(candidates[0].execute.name).toBe("boundEmbedding_0");
      expect(candidates[1].execute.name).toBe("boundEmbedding_1");
    });

    test("should preserve correct debug names when using index override for embeddings", () => {
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

      const candidates = buildEmbeddingExecutables(providerManager, modelChain, 1);

      // When starting from index 1, names should reflect original indices
      expect(candidates[0].execute.name).toBe("boundEmbedding_1");
      expect(candidates[1].execute.name).toBe("boundEmbedding_2");
    });
  });
});
