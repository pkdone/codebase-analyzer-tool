import "reflect-metadata";
import InsightsFromDBGenerator from "../../../../../src/app/components/insights/generators/db-insights-generator";
import { AppSummariesRepository } from "../../../../../src/app/repositories/app-summaries/app-summaries.repository.interface";
import { SourcesRepository } from "../../../../../src/app/repositories/sources/sources.repository.interface";
import LLMRouter from "../../../../../src/common/llm/llm-router";
import { LLMOutputFormat } from "../../../../../src/common/llm/types/llm.types";
import { llmProviderConfig } from "../../../../../src/common/llm/config/llm.config";
import * as logging from "../../../../../src/common/utils/logging";
import { ok, err } from "../../../../../src/common/types/result.types";
import { LLMError, LLMErrorCode } from "../../../../../src/common/llm/types/llm-errors.types";

// Mock the logging utilities
jest.mock("../../../../../src/common/utils/logging", () => ({
  logError: jest.fn(),
  logOneLineWarning: jest.fn(),
}));

describe("InsightsFromDBGenerator - Map-Reduce Strategy", () => {
  let generator: InsightsFromDBGenerator;
  let mockAppSummaryRepository: jest.Mocked<AppSummariesRepository>;
  let mockSourcesRepository: jest.Mocked<SourcesRepository>;
  let mockLLMRouter: jest.Mocked<LLMRouter>;
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
      insertSource: jest.fn().mockResolvedValue(undefined),
      deleteSourcesByProject: jest.fn().mockResolvedValue(undefined),
      doesProjectSourceExist: jest.fn().mockResolvedValue(false),
      getProjectSourcesSummariesByFileType: jest.fn().mockResolvedValue([]),
      getProjectSourcesSummariesByCanonicalType: jest.fn().mockResolvedValue([]),
      getProjectDatabaseIntegrations: jest.fn().mockResolvedValue([]),
      getProjectStoredProceduresAndTriggers: jest.fn().mockResolvedValue([]),
      vectorSearchProjectSourcesRawContent: jest.fn().mockResolvedValue([]),
      getProjectFilesPaths: jest.fn().mockResolvedValue([]),
      getProjectFileAndLineStats: jest.fn().mockResolvedValue({ fileCount: 0, linesOfCode: 0 }),
      getProjectFileTypesCountAndLines: jest.fn().mockResolvedValue([]),
      getProjectIntegrationPoints: jest.fn().mockResolvedValue([]),
      getTopComplexMethods: jest.fn().mockResolvedValue([]),
      getCodeSmellStatistics: jest.fn().mockResolvedValue([]),
      getCodeQualityStatistics: jest.fn().mockResolvedValue({
        totalFunctions: 0,
        averageComplexity: 0,
        highComplexityCount: 0,
        veryHighComplexityCount: 0,
        averageFunctionLength: 0,
        longFunctionCount: 0,
      }),
    } as unknown as jest.Mocked<SourcesRepository>;

    mockLLMRouter = {
      getModelsUsedDescription: jest.fn().mockReturnValue("TestLLM (GPT-4)"),
      executeCompletion: jest.fn(),
      getLLMManifest: jest.fn().mockReturnValue(mockManifest),
    } as unknown as jest.Mocked<LLMRouter>;

    generator = new InsightsFromDBGenerator(
      mockAppSummaryRepository,
      mockLLMRouter,
      mockSourcesRepository,
      "test-project",
    );
  });

  afterEach(() => {
    mockConsoleLog.mockRestore();
  });

  describe("Constructor", () => {
    it("should initialize with correct max token limit from manifest", () => {
      expect(mockLLMRouter.getLLMManifest).toHaveBeenCalled();
      // Access private field for testing
      const maxTokens = (generator as any).maxTokens;
      expect(maxTokens).toBe(128000);
    });
  });

  // Note: Tests for the text chunking logic were moved to tests/llm/utils/text-chunking.test.ts
  // since the chunkSummaries method was extracted as a reusable utility function.

  describe("generateAndRecordDataForCategory", () => {
    beforeEach(() => {
      mockSourcesRepository.getProjectSourcesSummariesByFileType.mockResolvedValue([
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
      const mockResponse = { technologies: [{ name: "Entity1", description: "Test entity" }] };

      (mockLLMRouter.executeCompletion as jest.Mock).mockResolvedValue(ok(mockResponse));

      await (generator as any).generateAndRecordDataForCategory("technologies", summaries);

      // Should call executeCompletion once with the category name (not -chunk or -reduce)
      expect(mockLLMRouter.executeCompletion).toHaveBeenCalledTimes(1);
      expect(mockLLMRouter.executeCompletion).toHaveBeenCalledWith(
        "technologies",
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

      const mockPartialResult = { technologies: [{ name: "Entity1", description: "Test" }] };
      const mockFinalResult = {
        entities: [
          { name: "Entity1", description: "Test" },
          { name: "Entity2", description: "Test" },
        ],
      };

      // Mock partial results for MAP phase and final result for REDUCE phase
      (mockLLMRouter.executeCompletion as jest.Mock).mockResolvedValue(ok(mockPartialResult));
      // Override the last call to return the final result
      (mockLLMRouter.executeCompletion as jest.Mock).mockResolvedValueOnce(ok(mockPartialResult));
      (mockLLMRouter.executeCompletion as jest.Mock).mockResolvedValueOnce(ok(mockPartialResult));
      (mockLLMRouter.executeCompletion as jest.Mock).mockResolvedValueOnce(ok(mockFinalResult));

      await (generator as any).generateAndRecordDataForCategory("technologies", summaries);

      // Should have at least 3 calls: at least 2 for MAP (chunks) + 1 for REDUCE
      expect(mockLLMRouter.executeCompletion.mock.calls.length).toBeGreaterThanOrEqual(3);

      // Verify MAP calls use -chunk suffix
      const chunkCalls = mockLLMRouter.executeCompletion.mock.calls.filter(
        (call) => call[0] === "technologies-chunk",
      );
      expect(chunkCalls.length).toBeGreaterThanOrEqual(2);

      // Verify REDUCE call uses -reduce suffix
      const reduceCallIndex = mockLLMRouter.executeCompletion.mock.calls.findIndex(
        (call) => call[0] === "technologies-reduce",
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

      // First chunk returns valid result, second chunk returns err
      (mockLLMRouter.executeCompletion as jest.Mock)
        .mockResolvedValueOnce(ok({ technologies: [{ name: "Entity1", description: "Test" }] }))
        .mockResolvedValueOnce(err(new LLMError(LLMErrorCode.BAD_RESPONSE_CONTENT, "No response")))
        .mockResolvedValueOnce(ok({ technologies: [{ name: "Entity1", description: "Final" }] }));

      await (generator as any).generateAndRecordDataForCategory("technologies", summaries);

      // Should still proceed to REDUCE with the one valid result
      expect(mockAppSummaryRepository.updateAppSummary).toHaveBeenCalled();
      expect(logging.logOneLineWarning).not.toHaveBeenCalledWith(
        expect.stringContaining("No partial insights were generated"),
      );
    });

    it("should skip REDUCE if all partial results are err", async () => {
      const tokenLimitPerChunk = 128000 * 0.7;
      const charsPerChunk = tokenLimitPerChunk * llmProviderConfig.AVERAGE_CHARS_PER_TOKEN;
      const largeSummary = "x".repeat(Math.floor(charsPerChunk * 0.9));
      const summaries = [largeSummary, largeSummary];

      // All chunks return err
      (mockLLMRouter.executeCompletion as jest.Mock).mockResolvedValue(
        err(new LLMError(LLMErrorCode.BAD_RESPONSE_CONTENT, "No response")),
      );

      await (generator as any).generateAndRecordDataForCategory("technologies", summaries);

      // Should not call updateAppSummary
      expect(mockAppSummaryRepository.updateAppSummary).not.toHaveBeenCalled();
      expect(logging.logOneLineWarning).toHaveBeenCalledWith(
        expect.stringContaining("No partial insights were generated"),
      );
    });

    it("should handle REDUCE phase returning err", async () => {
      const tokenLimitPerChunk = 128000 * 0.7;
      const charsPerChunk = tokenLimitPerChunk * llmProviderConfig.AVERAGE_CHARS_PER_TOKEN;
      const largeSummary = "x".repeat(Math.floor(charsPerChunk * 0.9));
      const summaries = [largeSummary, largeSummary];

      // MAP phase succeeds, REDUCE phase fails
      (mockLLMRouter.executeCompletion as jest.Mock)
        .mockResolvedValueOnce(ok({ technologies: [{ name: "Entity1", description: "Test" }] }))
        .mockResolvedValueOnce(ok({ technologies: [{ name: "Entity2", description: "Test" }] }))
        .mockResolvedValueOnce(
          err(new LLMError(LLMErrorCode.BAD_RESPONSE_CONTENT, "REDUCE failed")),
        ); // REDUCE fails

      await (generator as any).generateAndRecordDataForCategory("technologies", summaries);

      expect(mockAppSummaryRepository.updateAppSummary).not.toHaveBeenCalled();
      expect(logging.logOneLineWarning).toHaveBeenCalledWith(
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

      mockSourcesRepository.getProjectSourcesSummariesByFileType.mockResolvedValue([
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
      (mockLLMRouter.executeCompletion as jest.Mock).mockResolvedValue(
        ok({
          entities: [{ name: "Entity1", description: "Test" }],
        }),
      );

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
      mockSourcesRepository.getProjectSourcesSummariesByFileType.mockResolvedValue([]);

      await expect(generator.generateAndStoreInsights()).rejects.toThrow(
        "No existing code file summaries found",
      );
    });
  });
});
