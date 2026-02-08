import "reflect-metadata";
import InsightsFromDBGenerator from "../../../../../src/app/components/insights/generators/db-insights-generator";
import { AppSummariesRepository } from "../../../../../src/app/repositories/app-summaries/app-summaries.repository.interface";
import { SourcesRepository } from "../../../../../src/app/repositories/sources/sources.repository.interface";
import LLMRouter from "../../../../../src/common/llm/llm-router";
import type { InsightGenerationStrategy } from "../../../../../src/app/components/insights/strategies/insight-generation-strategy.interface";
import type { FileProcessingRulesType } from "../../../../../src/app/config/file-handling";
import type { LlmConcurrencyService } from "../../../../../src/app/components/concurrency";
import { llmConfig } from "../../../../../src/common/llm/config/llm.config";

// Mock the logging utilities
jest.mock("../../../../../src/common/utils/logging", () => ({
  logError: jest.fn(),
  logWarn: jest.fn(),
}));

describe("InsightsFromDBGenerator - Map-Reduce Strategy", () => {
  let generator: InsightsFromDBGenerator;
  let mockAppSummaryRepository: jest.Mocked<AppSummariesRepository>;
  let mockSourcesRepository: jest.Mocked<SourcesRepository>;
  let mockLLMRouter: jest.Mocked<LLMRouter>;
  let mockSinglePassStrategy: jest.Mocked<InsightGenerationStrategy>;
  let mockMapReduceStrategy: jest.Mocked<InsightGenerationStrategy>;
  let mockFileProcessingConfig: FileProcessingRulesType;
  let mockConsoleLog: jest.SpyInstance;

  const mockMaxTokens = 128000;

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
      insertSources: jest.fn().mockResolvedValue(undefined),
      deleteSourcesByProject: jest.fn().mockResolvedValue(undefined),
      doesProjectSourceExist: jest.fn().mockResolvedValue(false),
      getProjectSourcesSummariesByFileExtension: jest.fn().mockResolvedValue([]),
      getProjectSourcesSummariesByCanonicalType: jest.fn().mockResolvedValue([]),
      getProjectDatabaseIntegrations: jest.fn().mockResolvedValue([]),
      getProjectStoredProceduresAndTriggers: jest.fn().mockResolvedValue([]),
      vectorSearchProjectSources: jest.fn().mockResolvedValue([]),
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
      getFirstCompletionModelMaxTokens: jest.fn().mockReturnValue(mockMaxTokens),
    } as unknown as jest.Mocked<LLMRouter>;

    mockSinglePassStrategy = {
      generateInsights: jest.fn(),
    } as unknown as jest.Mocked<InsightGenerationStrategy>;

    mockMapReduceStrategy = {
      generateInsights: jest.fn(),
    } as unknown as jest.Mocked<InsightGenerationStrategy>;

    mockFileProcessingConfig = {
      FOLDER_IGNORE_LIST: ["node_modules", ".git"],
      FILENAME_PREFIX_IGNORE: "test-",
      FILENAME_IGNORE_LIST: ["package-lock.json"],
      BINARY_FILE_EXTENSION_IGNORE_LIST: ["png", "jpg"],
      CODE_FILE_EXTENSIONS: ["ts", "js", "java"],
      BOM_DEPENDENCY_CANONICAL_TYPES: ["maven", "npm"],
      SCHEDULED_JOB_CANONICAL_TYPES: ["shell-script"],
    } as unknown as FileProcessingRulesType;

    // Create mock for LlmConcurrencyService that executes immediately
    const mockLlmConcurrencyService = {
      run: jest.fn().mockImplementation(async <T>(fn: () => Promise<T>) => fn()),
    } as unknown as jest.Mocked<LlmConcurrencyService>;

    generator = new InsightsFromDBGenerator(
      mockAppSummaryRepository,
      mockLLMRouter,
      mockSourcesRepository,
      "test-project",
      mockSinglePassStrategy,
      mockMapReduceStrategy,
      mockFileProcessingConfig,
      mockLlmConcurrencyService,
    );
  });

  afterEach(() => {
    mockConsoleLog.mockRestore();
  });

  describe("Constructor", () => {
    it("should initialize with correct max token limit from router", () => {
      expect(mockLLMRouter.getFirstCompletionModelMaxTokens).toHaveBeenCalled();
      // Access private field for testing
      const maxTokens = (generator as any).maxTokens;
      expect(maxTokens).toBe(mockMaxTokens);
    });
  });

  // Note: Tests for the text chunking logic were moved to tests/llm/utils/text-chunking.test.ts
  // since the chunkSummaries method was extracted as a reusable utility function.

  describe("generateAndRecordDataForCategory", () => {
    beforeEach(() => {
      mockSourcesRepository.getProjectSourcesSummariesByFileExtension.mockResolvedValue([
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

      (mockSinglePassStrategy.generateInsights as jest.Mock).mockResolvedValue(mockResponse);

      await (generator as any).generateAndRecordDataForCategory("technologies", summaries);

      // Should call single-pass strategy, not map-reduce
      expect(mockSinglePassStrategy.generateInsights).toHaveBeenCalledTimes(1);
      expect(mockSinglePassStrategy.generateInsights).toHaveBeenCalledWith(
        "technologies",
        summaries,
      );
      expect(mockMapReduceStrategy.generateInsights).not.toHaveBeenCalled();

      expect(mockAppSummaryRepository.updateAppSummary).toHaveBeenCalledWith(
        "test-project",
        mockResponse,
      );
    });

    it("should use map-reduce when summaries exceed one chunk", async () => {
      // Create large summaries that will require chunking
      const tokenLimitPerChunk = 128000 * 0.7;
      const charsPerChunk = tokenLimitPerChunk * llmConfig.AVERAGE_CHARS_PER_TOKEN;
      const largeSummary = "x".repeat(Math.floor(charsPerChunk * 0.6));
      const summaries = [largeSummary, largeSummary];

      const mockFinalResult = {
        technologies: [
          { name: "Entity1", description: "Test" },
          { name: "Entity2", description: "Test" },
        ],
      };

      // Mock map-reduce strategy to return final result
      (mockMapReduceStrategy.generateInsights as jest.Mock).mockResolvedValue(mockFinalResult);

      await (generator as any).generateAndRecordDataForCategory("technologies", summaries);

      // Should call map-reduce strategy, not single-pass
      expect(mockMapReduceStrategy.generateInsights).toHaveBeenCalledTimes(1);
      expect(mockMapReduceStrategy.generateInsights).toHaveBeenCalledWith(
        "technologies",
        summaries,
      );
      expect(mockSinglePassStrategy.generateInsights).not.toHaveBeenCalled();

      expect(mockAppSummaryRepository.updateAppSummary).toHaveBeenCalledWith(
        "test-project",
        mockFinalResult,
      );
    });

    it("should handle map-reduce strategy returning null", async () => {
      const tokenLimitPerChunk = 128000 * 0.7;
      const charsPerChunk = tokenLimitPerChunk * llmConfig.AVERAGE_CHARS_PER_TOKEN;
      const largeSummary = "x".repeat(Math.floor(charsPerChunk * 0.9));
      const summaries = [largeSummary, largeSummary];

      // Map-reduce strategy returns null (simulating failure)
      (mockMapReduceStrategy.generateInsights as jest.Mock).mockResolvedValue(null);

      await (generator as any).generateAndRecordDataForCategory("technologies", summaries);

      // Should not call updateAppSummary when strategy returns null
      expect(mockAppSummaryRepository.updateAppSummary).not.toHaveBeenCalled();
    });

    it("should handle map-reduce strategy returning null for all chunks", async () => {
      const tokenLimitPerChunk = 128000 * 0.7;
      const charsPerChunk = tokenLimitPerChunk * llmConfig.AVERAGE_CHARS_PER_TOKEN;
      const largeSummary = "x".repeat(Math.floor(charsPerChunk * 0.9));
      const summaries = [largeSummary, largeSummary];

      // Map-reduce strategy returns null (simulating all chunks failed)
      (mockMapReduceStrategy.generateInsights as jest.Mock).mockResolvedValue(null);

      await (generator as any).generateAndRecordDataForCategory("technologies", summaries);

      // Should not call updateAppSummary
      expect(mockAppSummaryRepository.updateAppSummary).not.toHaveBeenCalled();
    });

    it("should handle map-reduce strategy returning null (REDUCE phase failure)", async () => {
      const tokenLimitPerChunk = 128000 * 0.7;
      const charsPerChunk = tokenLimitPerChunk * llmConfig.AVERAGE_CHARS_PER_TOKEN;
      const largeSummary = "x".repeat(Math.floor(charsPerChunk * 0.9));
      const summaries = [largeSummary, largeSummary];

      // Map-reduce strategy returns null (simulating REDUCE phase failure)
      (mockMapReduceStrategy.generateInsights as jest.Mock).mockResolvedValue(null);

      await (generator as any).generateAndRecordDataForCategory("technologies", summaries);

      expect(mockAppSummaryRepository.updateAppSummary).not.toHaveBeenCalled();
    });
  });

  describe("generateAndStoreInsights - Integration", () => {
    it("should handle complete workflow with map-reduce", async () => {
      // Setup: Large codebase requiring chunking
      const tokenLimitPerChunk = 128000 * 0.7;
      const charsPerChunk = tokenLimitPerChunk * llmConfig.AVERAGE_CHARS_PER_TOKEN;
      const largeSummary = "x".repeat(Math.floor(charsPerChunk * 0.9));

      mockSourcesRepository.getProjectSourcesSummariesByFileExtension.mockResolvedValue([
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

      // Mock strategy responses for all categories
      (mockSinglePassStrategy.generateInsights as jest.Mock).mockResolvedValue({
        entities: [{ name: "Entity1", description: "Test" }],
      });
      (mockMapReduceStrategy.generateInsights as jest.Mock).mockResolvedValue({
        entities: [{ name: "Entity1", description: "Test" }],
      });

      await generator.generateAndStoreInsights();

      // Verify app summary was created (use objectContaining to ignore capturedAt timestamp)
      expect(mockAppSummaryRepository.createOrReplaceAppSummary).toHaveBeenCalledWith(
        expect.objectContaining({
          projectName: "test-project",
          llmModels: "TestLLM (GPT-4)",
        }),
      );

      // Verify updates were made for categories (8 categories total)
      expect(mockAppSummaryRepository.updateAppSummary).toHaveBeenCalled();
    });

    it("should throw error when no source summaries exist", async () => {
      mockSourcesRepository.getProjectSourcesSummariesByFileExtension.mockResolvedValue([]);

      await expect(generator.generateAndStoreInsights()).rejects.toThrow(
        "No existing code file summaries found",
      );
    });
  });
});
