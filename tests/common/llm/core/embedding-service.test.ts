import { EmbeddingService, type EmbeddingCandidate } from "../../../../src/common/llm/embedding-service";
import type { LLMExecutionPipeline } from "../../../../src/common/llm/llm-execution-pipeline";
import type { ProviderManager } from "../../../../src/common/llm/provider-manager";
import type { ResolvedModelChain } from "../../../../src/common/llm/types/llm-model.types";
import type { LLMProvider } from "../../../../src/common/llm/types/llm-provider.interface";
import { LLMExecutionError } from "../../../../src/common/llm/types/llm-execution-result.types";

describe("EmbeddingService", () => {
  let mockExecutionPipeline: jest.Mocked<LLMExecutionPipeline>;
  let mockProviderManager: jest.Mocked<ProviderManager>;
  let mockProvider: jest.Mocked<LLMProvider>;
  let embeddingCandidates: EmbeddingCandidate[];
  let modelChain: ResolvedModelChain;

  beforeEach(() => {
    // Reset mocks
    mockProvider = {
      getEmbeddingModelDimensions: jest.fn().mockReturnValue(1536),
    } as unknown as jest.Mocked<LLMProvider>;

    mockProviderManager = {
      getProvider: jest.fn().mockReturnValue(mockProvider),
    } as unknown as jest.Mocked<ProviderManager>;

    mockExecutionPipeline = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<LLMExecutionPipeline>;

    modelChain = {
      completions: [{ providerFamily: "OpenAI", modelKey: "gpt-4", modelUrn: "gpt-4" }],
      embeddings: [{ providerFamily: "OpenAI", modelKey: "text-embedding-ada-002", modelUrn: "text-embedding-ada-002" }],
    };

    embeddingCandidates = [
      {
        func: jest.fn(),
        providerFamily: "OpenAI",
        modelKey: "text-embedding-ada-002",
        priority: 0,
      },
    ];
  });

  describe("constructor", () => {
    it("should create an instance with valid dependencies", () => {
      const service = new EmbeddingService({
        embeddingCandidates,
        modelChain,
        providerManager: mockProviderManager,
        executionPipeline: mockExecutionPipeline,
      });

      expect(service).toBeInstanceOf(EmbeddingService);
    });
  });

  describe("generateEmbeddings", () => {
    it("should return embeddings array on successful execution", async () => {
      const expectedEmbeddings = [0.1, 0.2, 0.3, 0.4, 0.5];
      mockExecutionPipeline.execute.mockResolvedValue({
        success: true,
        data: expectedEmbeddings,
      });

      const service = new EmbeddingService({
        embeddingCandidates,
        modelChain,
        providerManager: mockProviderManager,
        executionPipeline: mockExecutionPipeline,
      });

      const result = await service.generateEmbeddings("test-resource", "test content");

      expect(result).toEqual(expectedEmbeddings);
      expect(mockExecutionPipeline.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          resourceName: "test-resource",
          content: "test content",
          retryOnInvalid: false,
          trackJsonMutations: false,
        }),
      );
    });

    it("should return null when execution pipeline fails", async () => {
      mockExecutionPipeline.execute.mockResolvedValue({
        success: false,
        error: new LLMExecutionError("Failed to generate embeddings", "test-resource"),
      });

      const service = new EmbeddingService({
        embeddingCandidates,
        modelChain,
        providerManager: mockProviderManager,
        executionPipeline: mockExecutionPipeline,
      });

      const result = await service.generateEmbeddings("test-resource", "test content");

      expect(result).toBeNull();
    });

    it("should return null when response data is not an array", async () => {
      mockExecutionPipeline.execute.mockResolvedValue({
        success: true,
        data: "not an array",
      });

      const service = new EmbeddingService({
        embeddingCandidates,
        modelChain,
        providerManager: mockProviderManager,
        executionPipeline: mockExecutionPipeline,
      });

      const result = await service.generateEmbeddings("test-resource", "test content");

      expect(result).toBeNull();
    });

    it("should return null when no candidates are available at specified index", async () => {
      const service = new EmbeddingService({
        embeddingCandidates,
        modelChain,
        providerManager: mockProviderManager,
        executionPipeline: mockExecutionPipeline,
      });

      // Try to use an index that doesn't exist
      const result = await service.generateEmbeddings("test-resource", "test content", 10);

      expect(result).toBeNull();
      expect(mockExecutionPipeline.execute).not.toHaveBeenCalled();
    });

    it("should pass modelIndexOverride to candidate builder", async () => {
      const multiCandidates: EmbeddingCandidate[] = [
        {
          func: jest.fn(),
          providerFamily: "OpenAI",
          modelKey: "text-embedding-ada-002",
          priority: 0,
        },
        {
          func: jest.fn(),
          providerFamily: "OpenAI",
          modelKey: "text-embedding-3-small",
          priority: 1,
        },
      ];

      const multiModelChain: ResolvedModelChain = {
        completions: [{ providerFamily: "OpenAI", modelKey: "gpt-4", modelUrn: "gpt-4" }],
        embeddings: [
          { providerFamily: "OpenAI", modelKey: "text-embedding-ada-002", modelUrn: "text-embedding-ada-002" },
          { providerFamily: "OpenAI", modelKey: "text-embedding-3-small", modelUrn: "text-embedding-3-small" },
        ],
      };

      mockExecutionPipeline.execute.mockResolvedValue({
        success: true,
        data: [0.1, 0.2],
      });

      const service = new EmbeddingService({
        embeddingCandidates: multiCandidates,
        modelChain: multiModelChain,
        providerManager: mockProviderManager,
        executionPipeline: mockExecutionPipeline,
      });

      await service.generateEmbeddings("test-resource", "test content", 1);

      expect(mockExecutionPipeline.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          candidates: expect.arrayContaining([
            expect.objectContaining({
              modelKey: "text-embedding-3-small",
            }),
          ]),
        }),
      );
    });
  });

  describe("getEmbeddingChain", () => {
    it("should return the embedding chain from model chain", () => {
      const service = new EmbeddingService({
        embeddingCandidates,
        modelChain,
        providerManager: mockProviderManager,
        executionPipeline: mockExecutionPipeline,
      });

      const result = service.getEmbeddingChain();

      expect(result).toEqual(modelChain.embeddings);
    });
  });

  describe("getEmbeddingModelDimensions", () => {
    it("should return dimensions from provider", () => {
      mockProvider.getEmbeddingModelDimensions.mockReturnValue(1536);

      const service = new EmbeddingService({
        embeddingCandidates,
        modelChain,
        providerManager: mockProviderManager,
        executionPipeline: mockExecutionPipeline,
      });

      const result = service.getEmbeddingModelDimensions();

      expect(result).toBe(1536);
      expect(mockProviderManager.getProvider).toHaveBeenCalledWith("OpenAI");
      expect(mockProvider.getEmbeddingModelDimensions).toHaveBeenCalledWith(
        "text-embedding-ada-002",
      );
    });

    it("should return undefined when no candidates are available", () => {
      const service = new EmbeddingService({
        embeddingCandidates: [],
        modelChain,
        providerManager: mockProviderManager,
        executionPipeline: mockExecutionPipeline,
      });

      const result = service.getEmbeddingModelDimensions();

      expect(result).toBeUndefined();
    });
  });

  describe("hasEmbeddingCandidates", () => {
    it("should return true when candidates are available", () => {
      const service = new EmbeddingService({
        embeddingCandidates,
        modelChain,
        providerManager: mockProviderManager,
        executionPipeline: mockExecutionPipeline,
      });

      expect(service.hasEmbeddingCandidates()).toBe(true);
    });

    it("should return false when no candidates are available", () => {
      const service = new EmbeddingService({
        embeddingCandidates: [],
        modelChain,
        providerManager: mockProviderManager,
        executionPipeline: mockExecutionPipeline,
      });

      expect(service.hasEmbeddingCandidates()).toBe(false);
    });
  });
});
