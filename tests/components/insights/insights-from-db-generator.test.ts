import "reflect-metadata";
import InsightsFromDBGenerator from "../../../src/components/insights/insights-from-db-generator";
import { AppSummariesRepository } from "../../../src/repositories/app-summary/app-summaries.repository.interface";
import { SourcesRepository } from "../../../src/repositories/source/sources.repository.interface";
import LLMRouter from "../../../src/llm/core/llm-router";
import { LLMProviderManager } from "../../../src/llm/core/llm-provider-manager";
import { LLMOutputFormat } from "../../../src/llm/types/llm.types";
import { llmProviderConfig } from "../../../src/llm/llm.config";
import * as logging from "../../../src/common/utils/logging";

// Mock the logging utilities
jest.mock("../../../src/common/utils/logging", () => ({
  logErrorMsgAndDetail: jest.fn(),
  logWarningMsg: jest.fn(),
}));

describe("InsightsFromDBGenerator - Map-Reduce Strategy", () => {
  let generator: InsightsFromDBGenerator;
  let mockAppSummariesRepository: jest.Mocked<AppSummariesRepository>;
  let mockSourcesRepository: jest.Mocked<SourcesRepository>;
  let mockLLMRouter: jest.Mocked<LLMRouter>;
  let mockLLMProviderManager: jest.Mocked<LLMProviderManager>;
  let mockConsoleLog: jest.SpyInstance;

  const mockManifest = {
    modelFamily: "TestFamily",
    providerName: "TestProvider",
    models: {
      embeddings: { modelKey: "embed-1", maxTotalTokens: 8192 },
      primaryCompletion: { modelKey: "gpt-4", maxTotalTokens: 128000 },
      secondaryCompletion: { modelKey: "gpt-3.5", maxTotalTokens: 16000 },
    },
    envSchema: {},
    factory: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockConsoleLog = jest.spyOn(console, "log").mockImplementation();

    mockAppSummariesRepository = {
      createOrReplaceAppSummary: jest.fn().mockResolvedValue(undefined),
      updateAppSummary: jest.fn().mockResolvedValue(undefined),
      getAppSummary: jest.fn(),
      deleteAppSummary: jest.fn(),
    } as unknown as jest.Mocked<AppSummariesRepository>;

    mockSourcesRepository = {
      getProjectSourcesSummaries: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<SourcesRepository>;

    mockLLMRouter = {
      getModelsUsedDescription: jest.fn().mockReturnValue("TestLLM (GPT-4)"),
      executeCompletion: jest.fn(),
    } as unknown as jest.Mocked<LLMRouter>;

    mockLLMProviderManager = {
      getLLMManifest: jest.fn().mockReturnValue(mockManifest),
    } as unknown as jest.Mocked<LLMProviderManager>;

    generator = new InsightsFromDBGenerator(
      mockAppSummariesRepository,
      mockLLMRouter,
      mockSourcesRepository,
      "test-project",
      mockLLMProviderManager,
    );
  });

  afterEach(() => {
    mockConsoleLog.mockRestore();
  });

  describe("Constructor", () => {
    it("should initialize with correct max token limit from manifest", () => {
      expect(mockLLMProviderManager.getLLMManifest).toHaveBeenCalled();
      // Access private field for testing
      const maxTokens = (generator as any).maxTokens;
      expect(maxTokens).toBe(128000);
    });
  });

  describe("chunkSummaries", () => {
    it("should return a single chunk when summaries fit within token limit", () => {
      const summaries = ["Summary 1", "Summary 2", "Summary 3"];
      const chunks = (generator as any).chunkSummaries(summaries);

      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toEqual(summaries);
    });

    it("should split summaries into multiple chunks when they exceed token limit", () => {
      // Create summaries that will exceed 70% of 128000 tokens (89600 tokens)
      const tokenLimitPerChunk = 128000 * 0.7;
      const charsPerChunk = tokenLimitPerChunk * llmProviderConfig.AVERAGE_CHARS_PER_TOKEN;

      // Create 3 large summaries that will each be close to the chunk limit
      const largeSummary = "x".repeat(Math.floor(charsPerChunk * 0.9));
      const summaries = [largeSummary, largeSummary, largeSummary];

      const chunks = (generator as any).chunkSummaries(summaries);

      expect(chunks.length).toBeGreaterThan(1);
      // Verify each chunk has content
      chunks.forEach((chunk: string[]) => {
        expect(chunk.length).toBeGreaterThan(0);
      });
    });

    it("should handle empty summaries array", () => {
      const chunks = (generator as any).chunkSummaries([]);

      expect(chunks).toHaveLength(0);
    });

    it("should truncate a single very large summary that exceeds the limit", () => {
      // Single summary that exceeds the limit
      const tokenLimitPerChunk = 128000 * 0.7;
      const charsPerChunk = tokenLimitPerChunk * llmProviderConfig.AVERAGE_CHARS_PER_TOKEN;
      const veryLargeSummary = "x".repeat(Math.floor(charsPerChunk * 2));

      const chunks = (generator as any).chunkSummaries([veryLargeSummary]);

      // Should still return one chunk with the truncated summary
      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toHaveLength(1);

      // The summary should be truncated to fit within the limit
      const truncatedSummary = chunks[0][0];
      expect(truncatedSummary.length).toBeLessThan(veryLargeSummary.length);
      expect(truncatedSummary.length).toBeLessThanOrEqual(Math.floor(charsPerChunk));

      // Verify warning was logged
      expect(logging.logWarningMsg).toHaveBeenCalledWith(
        expect.stringContaining("A file summary is too large and will be truncated"),
      );
    });

    it("should properly distribute summaries across chunks", () => {
      // Create many small summaries
      const summaries = Array(1000).fill("Small summary text");
      const chunks = (generator as any).chunkSummaries(summaries);

      // Verify all summaries are included
      const totalSummariesInChunks = chunks.reduce(
        (sum: number, chunk: string[]) => sum + chunk.length,
        0,
      );
      expect(totalSummariesInChunks).toBe(summaries.length);
    });

    it("should handle multiple oversized summaries by truncating each one", () => {
      const tokenLimitPerChunk = 128000 * 0.7;
      const charsPerChunk = tokenLimitPerChunk * llmProviderConfig.AVERAGE_CHARS_PER_TOKEN;

      // Create 3 summaries that each exceed the limit
      const oversizedSummary1 = "a".repeat(Math.floor(charsPerChunk * 1.5));
      const oversizedSummary2 = "b".repeat(Math.floor(charsPerChunk * 2));
      const oversizedSummary3 = "c".repeat(Math.floor(charsPerChunk * 1.2));

      const chunks = (generator as any).chunkSummaries([
        oversizedSummary1,
        oversizedSummary2,
        oversizedSummary3,
      ]);

      // Should have 3 chunks (each oversized summary gets its own chunk after truncation)
      expect(chunks).toHaveLength(3);

      // Each chunk should have exactly one summary
      chunks.forEach((chunk: string[]) => {
        expect(chunk).toHaveLength(1);
        // Each truncated summary should be within the limit
        const summaryLength = chunk[0].length;
        expect(summaryLength).toBeLessThanOrEqual(Math.floor(charsPerChunk));
      });

      // Verify warning was logged 3 times (once per oversized summary)
      expect(logging.logWarningMsg).toHaveBeenCalledTimes(3);
      expect(logging.logWarningMsg).toHaveBeenCalledWith(
        expect.stringContaining("A file summary is too large and will be truncated"),
      );
    });
  });

  describe("generateAndRecordDataForCategory", () => {
    beforeEach(() => {
      mockSourcesRepository.getProjectSourcesSummaries.mockResolvedValue([
        {
          filepath: "file1.ts",
          summary: { namespace: "File1", purpose: "Test", implementation: "Mock" },
        },
        {
          filepath: "file2.ts",
          summary: { namespace: "File2", purpose: "Test", implementation: "Mock" },
        },
      ]);
    });

    it("should use single-pass approach when summaries fit in one chunk", async () => {
      const summaries = ["Summary 1", "Summary 2"];
      const mockResponse = { entities: [{ name: "Entity1", description: "Test entity" }] };

      mockLLMRouter.executeCompletion.mockResolvedValue(mockResponse);

      await (generator as any).generateAndRecordDataForCategory("entities", summaries);

      // Should call executeCompletion once with the category name (not -chunk or -reduce)
      expect(mockLLMRouter.executeCompletion).toHaveBeenCalledTimes(1);
      expect(mockLLMRouter.executeCompletion).toHaveBeenCalledWith(
        "entities",
        expect.any(String),
        expect.objectContaining({
          outputFormat: LLMOutputFormat.JSON,
        }),
      );

      expect(mockAppSummariesRepository.updateAppSummary).toHaveBeenCalledWith(
        "test-project",
        mockResponse,
      );
    });

    it("should use map-reduce when summaries exceed one chunk", async () => {
      // Create large summaries that will require chunking
      const tokenLimitPerChunk = 128000 * 0.7;
      const charsPerChunk = tokenLimitPerChunk * llmProviderConfig.AVERAGE_CHARS_PER_TOKEN;
      const largeSummary = "x".repeat(Math.floor(charsPerChunk * 0.6));
      const summaries = [largeSummary, largeSummary];

      const mockPartialResult = { entities: [{ name: "Entity1", description: "Test" }] };
      const mockFinalResult = {
        entities: [
          { name: "Entity1", description: "Test" },
          { name: "Entity2", description: "Test" },
        ],
      };

      // Mock partial results for MAP phase and final result for REDUCE phase
      mockLLMRouter.executeCompletion.mockResolvedValue(mockPartialResult);
      // Override the last call to return the final result
      mockLLMRouter.executeCompletion.mockResolvedValueOnce(mockPartialResult);
      mockLLMRouter.executeCompletion.mockResolvedValueOnce(mockPartialResult);
      mockLLMRouter.executeCompletion.mockResolvedValueOnce(mockFinalResult);

      await (generator as any).generateAndRecordDataForCategory("entities", summaries);

      // Should have at least 3 calls: at least 2 for MAP (chunks) + 1 for REDUCE
      expect(mockLLMRouter.executeCompletion.mock.calls.length).toBeGreaterThanOrEqual(3);

      // Verify MAP calls use -chunk suffix
      const chunkCalls = mockLLMRouter.executeCompletion.mock.calls.filter(
        (call) => call[0] === "entities-chunk",
      );
      expect(chunkCalls.length).toBeGreaterThanOrEqual(2);

      // Verify REDUCE call uses -reduce suffix
      const reduceCallIndex = mockLLMRouter.executeCompletion.mock.calls.findIndex(
        (call) => call[0] === "entities-reduce",
      );
      expect(reduceCallIndex).toBeGreaterThanOrEqual(0);

      expect(mockAppSummariesRepository.updateAppSummary).toHaveBeenCalledWith(
        "test-project",
        mockFinalResult,
      );
    });

    it("should handle partial results being null in MAP phase", async () => {
      const tokenLimitPerChunk = 128000 * 0.7;
      const charsPerChunk = tokenLimitPerChunk * llmProviderConfig.AVERAGE_CHARS_PER_TOKEN;
      const largeSummary = "x".repeat(Math.floor(charsPerChunk * 0.9));
      const summaries = [largeSummary, largeSummary];

      // First chunk returns valid result, second chunk returns null
      mockLLMRouter.executeCompletion
        .mockResolvedValueOnce({ entities: [{ name: "Entity1", description: "Test" }] })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ entities: [{ name: "Entity1", description: "Final" }] });

      await (generator as any).generateAndRecordDataForCategory("entities", summaries);

      // Should still proceed to REDUCE with the one valid result
      expect(mockAppSummariesRepository.updateAppSummary).toHaveBeenCalled();
      expect(logging.logWarningMsg).not.toHaveBeenCalledWith(
        expect.stringContaining("No partial insights were generated"),
      );
    });

    it("should skip REDUCE if all partial results are null", async () => {
      const tokenLimitPerChunk = 128000 * 0.7;
      const charsPerChunk = tokenLimitPerChunk * llmProviderConfig.AVERAGE_CHARS_PER_TOKEN;
      const largeSummary = "x".repeat(Math.floor(charsPerChunk * 0.9));
      const summaries = [largeSummary, largeSummary];

      // All chunks return null
      mockLLMRouter.executeCompletion.mockResolvedValue(null);

      await (generator as any).generateAndRecordDataForCategory("entities", summaries);

      // Should not call updateAppSummary
      expect(mockAppSummariesRepository.updateAppSummary).not.toHaveBeenCalled();
      expect(logging.logWarningMsg).toHaveBeenCalledWith(
        expect.stringContaining("No partial insights were generated"),
      );
    });

    it("should handle REDUCE phase returning null", async () => {
      const tokenLimitPerChunk = 128000 * 0.7;
      const charsPerChunk = tokenLimitPerChunk * llmProviderConfig.AVERAGE_CHARS_PER_TOKEN;
      const largeSummary = "x".repeat(Math.floor(charsPerChunk * 0.9));
      const summaries = [largeSummary, largeSummary];

      // MAP phase succeeds, REDUCE phase fails
      mockLLMRouter.executeCompletion
        .mockResolvedValueOnce({ entities: [{ name: "Entity1", description: "Test" }] })
        .mockResolvedValueOnce({ entities: [{ name: "Entity2", description: "Test" }] })
        .mockResolvedValueOnce(null); // REDUCE fails

      await (generator as any).generateAndRecordDataForCategory("entities", summaries);

      expect(mockAppSummariesRepository.updateAppSummary).not.toHaveBeenCalled();
      expect(logging.logWarningMsg).toHaveBeenCalledWith(
        expect.stringContaining("Failed to generate final consolidated summary"),
      );
    });
  });

  describe("generatePartialInsightsForCategory", () => {
    it("should generate partial insights for a chunk", async () => {
      const chunk = ["Summary 1", "Summary 2"];
      const mockResponse = { entities: [{ name: "Entity1", description: "Test" }] };

      mockLLMRouter.executeCompletion.mockResolvedValue(mockResponse);

      const result = await (generator as any).generatePartialInsightsForCategory("entities", chunk);

      expect(result).toEqual(mockResponse);
      expect(mockLLMRouter.executeCompletion).toHaveBeenCalledWith(
        "entities-chunk",
        expect.stringContaining("partial analysis"),
        expect.objectContaining({
          outputFormat: LLMOutputFormat.JSON,
        }),
      );
    });

    it("should return null and log warning on error", async () => {
      const chunk = ["Summary 1"];
      mockLLMRouter.executeCompletion.mockRejectedValue(new Error("LLM error"));

      const result = await (generator as any).generatePartialInsightsForCategory("entities", chunk);

      expect(result).toBeNull();
      expect(logging.logWarningMsg).toHaveBeenCalledWith(expect.stringContaining("LLM error"));
    });
  });

  describe("reducePartialInsights", () => {
    it("should consolidate multiple partial results", async () => {
      const partialResults = [
        { entities: [{ name: "Entity1", description: "Test 1" }] },
        { entities: [{ name: "Entity2", description: "Test 2" }] },
        { entities: [{ name: "Entity3", description: "Test 3" }] },
      ];

      const mockFinalResult = {
        entities: [
          { name: "Entity1", description: "Test 1" },
          { name: "Entity2", description: "Test 2" },
          { name: "Entity3", description: "Test 3" },
        ],
      };

      mockLLMRouter.executeCompletion.mockResolvedValue(mockFinalResult);

      const result = await (generator as any).reducePartialInsights("entities", partialResults);

      expect(result).toEqual(mockFinalResult);
      expect(mockLLMRouter.executeCompletion).toHaveBeenCalledWith(
        "entities-reduce",
        expect.stringContaining("consolidate these lists"),
        expect.objectContaining({
          outputFormat: LLMOutputFormat.JSON,
        }),
      );

      // Verify the prompt contains the combined data
      const promptArg = mockLLMRouter.executeCompletion.mock.calls[0][1];
      expect(promptArg).toContain("Entity1");
      expect(promptArg).toContain("Entity2");
      expect(promptArg).toContain("Entity3");
    });

    it("should handle partial results with empty arrays", async () => {
      const partialResults = [
        { entities: [] },
        { entities: [{ name: "Entity1", description: "Test" }] },
      ];

      const mockFinalResult = { entities: [{ name: "Entity1", description: "Test" }] };

      mockLLMRouter.executeCompletion.mockResolvedValue(mockFinalResult);

      const result = await (generator as any).reducePartialInsights("entities", partialResults);

      expect(result).toEqual(mockFinalResult);
    });

    it("should return null and log warning on error", async () => {
      const partialResults = [{ entities: [{ name: "Entity1", description: "Test" }] }];

      mockLLMRouter.executeCompletion.mockRejectedValue(new Error("Reduce error"));

      const result = await (generator as any).reducePartialInsights("entities", partialResults);

      expect(result).toBeNull();
      expect(logging.logWarningMsg).toHaveBeenCalledWith(expect.stringContaining("Reduce error"));
    });
  });

  describe("generateAndStoreInsights - Integration", () => {
    it("should handle complete workflow with map-reduce", async () => {
      // Setup: Large codebase requiring chunking
      const tokenLimitPerChunk = 128000 * 0.7;
      const charsPerChunk = tokenLimitPerChunk * llmProviderConfig.AVERAGE_CHARS_PER_TOKEN;
      const largeSummary = "x".repeat(Math.floor(charsPerChunk * 0.9));

      mockSourcesRepository.getProjectSourcesSummaries.mockResolvedValue([
        {
          filepath: "file1.ts",
          summary: {
            namespace: "File1",
            purpose: largeSummary,
            implementation: "Mock",
          },
        },
        {
          filepath: "file2.ts",
          summary: {
            namespace: "File2",
            purpose: largeSummary,
            implementation: "Mock",
          },
        },
      ]);

      // Mock LLM responses for all categories
      mockLLMRouter.executeCompletion.mockResolvedValue({
        entities: [{ name: "Entity1", description: "Test" }],
      });

      await generator.generateAndStoreInsights();

      // Verify app summary was created
      expect(mockAppSummariesRepository.createOrReplaceAppSummary).toHaveBeenCalledWith({
        projectName: "test-project",
        llmProvider: "TestLLM (GPT-4)",
      });

      // Verify updates were made for categories (8 categories total)
      expect(mockAppSummariesRepository.updateAppSummary).toHaveBeenCalled();
    });

    it("should throw error when no source summaries exist", async () => {
      mockSourcesRepository.getProjectSourcesSummaries.mockResolvedValue([]);

      await expect(generator.generateAndStoreInsights()).rejects.toThrow(
        "No existing code file summaries found",
      );
    });
  });
});
