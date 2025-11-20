import "reflect-metadata";
import InsightsFromDBGenerator from "../../../src/components/insights/insights-from-db-generator";
import { AppSummariesRepository } from "../../../src/repositories/app-summaries/app-summaries.repository.interface";
import { SourcesRepository } from "../../../src/repositories/sources/sources.repository.interface";
import LLMRouter from "../../../src/llm/core/llm-router";
import { LLMProviderManager } from "../../../src/llm/core/llm-provider-manager";
import { LLMOutputFormat } from "../../../src/llm/types/llm.types";
import { llmProviderConfig } from "../../../src/llm/llm.config";
import * as logging from "../../../src/common/utils/logging";

// Mock the logging utilities
jest.mock("../../../src/common/utils/logging", () => ({
  logErrorMsgAndDetail: jest.fn(),
  logSingleLineWarning: jest.fn(),
}));

describe("InsightsFromDBGenerator - Map-Reduce Strategy", () => {
  let generator: InsightsFromDBGenerator;
  let mockAppSummaryRepository: jest.Mocked<AppSummariesRepository>;
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

    mockAppSummaryRepository = {
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

    const mockBomAggregator = {
      aggregateBillOfMaterials: jest.fn().mockResolvedValue({
        dependencies: [],
        totalDependencies: 0,
        conflictCount: 0,
        buildFiles: [],
      }),
    } as any;

    const mockCodeQualityAggregator = {
      aggregateCodeQualityMetrics: jest.fn().mockResolvedValue({
        topComplexMethods: [],
        commonCodeSmells: [],
        overallStatistics: {
          totalMethods: 0,
          averageComplexity: 0,
          highComplexityCount: 0,
          veryHighComplexityCount: 0,
          averageMethodLength: 0,
          longMethodCount: 0,
        },
      }),
    } as any;

    const mockJobAggregator = {
      aggregateScheduledJobs: jest.fn().mockResolvedValue({
        jobs: [],
        totalJobs: 0,
        triggerTypes: [],
        jobFiles: [],
      }),
    } as any;

    const mockModuleCouplingAggregator = {
      aggregateModuleCoupling: jest.fn().mockResolvedValue({
        couplings: [],
        totalModules: 0,
        totalCouplings: 0,
        highestCouplingCount: 0,
        moduleDepth: 2,
      }),
    } as any;

    const mockUiAggregator = {
      aggregateUiAnalysis: jest.fn().mockResolvedValue({
        frameworks: [],
        totalJspFiles: 0,
        totalScriptlets: 0,
        totalExpressions: 0,
        totalDeclarations: 0,
        averageScriptletsPerFile: 0,
        filesWithHighScriptletCount: 0,
        customTagLibraries: [],
        topScriptletFiles: [],
      }),
    } as any;

    generator = new InsightsFromDBGenerator(
      mockAppSummaryRepository,
      mockLLMRouter,
      mockSourcesRepository,
      "test-project",
      mockLLMProviderManager,
      mockBomAggregator,
      mockCodeQualityAggregator,
      mockJobAggregator,
      mockModuleCouplingAggregator,
      mockUiAggregator,
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

  // Note: Tests for the text chunking logic were moved to tests/llm/utils/text-chunking.test.ts
  // since the chunkSummaries method was extracted as a reusable utility function.

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

      expect(mockAppSummaryRepository.updateAppSummary).toHaveBeenCalledWith(
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

      expect(mockAppSummaryRepository.updateAppSummary).toHaveBeenCalledWith(
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
      expect(mockAppSummaryRepository.updateAppSummary).toHaveBeenCalled();
      expect(logging.logSingleLineWarning).not.toHaveBeenCalledWith(
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
      expect(mockAppSummaryRepository.updateAppSummary).not.toHaveBeenCalled();
      expect(logging.logSingleLineWarning).toHaveBeenCalledWith(
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

      expect(mockAppSummaryRepository.updateAppSummary).not.toHaveBeenCalled();
      expect(logging.logSingleLineWarning).toHaveBeenCalledWith(
        expect.stringContaining("Failed to generate final consolidated summary"),
      );
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
      expect(mockAppSummaryRepository.createOrReplaceAppSummary).toHaveBeenCalledWith({
        projectName: "test-project",
        llmProvider: "TestLLM (GPT-4)",
      });

      // Verify updates were made for categories (8 categories total)
      expect(mockAppSummaryRepository.updateAppSummary).toHaveBeenCalled();
    });

    it("should throw error when no source summaries exist", async () => {
      mockSourcesRepository.getProjectSourcesSummaries.mockResolvedValue([]);

      await expect(generator.generateAndStoreInsights()).rejects.toThrow(
        "No existing code file summaries found",
      );
    });
  });
});
