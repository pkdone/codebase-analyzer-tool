import "reflect-metadata";
import { AppStatisticsDataProvider } from "../../../../../src/app/components/reporting/sections/quality-metrics/app-statistics-data-provider";
import { SourcesRepository } from "../../../../../src/app/repositories/sources/sources.repository.interface";
import type { AppSummaryRecordWithId } from "../../../../../src/app/repositories/app-summaries/app-summaries.model";

describe("AppStatisticsDataProvider", () => {
  let dataProvider: AppStatisticsDataProvider;
  let mockSourcesRepository: jest.Mocked<SourcesRepository>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSourcesRepository = {
      getProjectFileAndLineStats: jest.fn(),
    } as unknown as jest.Mocked<SourcesRepository>;

    dataProvider = new AppStatisticsDataProvider(mockSourcesRepository);
  });

  describe("getAppStatistics", () => {
    it("should return app statistics with all fields populated", async () => {
      const mockAppSummaryData: Pick<AppSummaryRecordWithId, "appDescription" | "llmProvider"> = {
        appDescription: "Test application description",
        llmProvider: "openai",
      };

      mockSourcesRepository.getProjectFileAndLineStats.mockResolvedValue({
        fileCount: 100,
        linesOfCode: 5000,
      });

      const result = await dataProvider.getAppStatistics("test-project", mockAppSummaryData);

      expect(result.projectName).toBe("test-project");
      expect(result.llmProvider).toBe("openai");
      expect(result.fileCount).toBe(100);
      expect(result.linesOfCode).toBe(5000);
      expect(result.appDescription).toBe("Test application description");
    });

    it("should use nullish coalescing operator (??) for default app description when undefined", async () => {
      const mockAppSummaryData: Pick<AppSummaryRecordWithId, "appDescription" | "llmProvider"> = {
        appDescription: undefined,
        llmProvider: "openai",
      };

      mockSourcesRepository.getProjectFileAndLineStats.mockResolvedValue({
        fileCount: 50,
        linesOfCode: 2500,
      });

      const result = await dataProvider.getAppStatistics("test-project", mockAppSummaryData);

      // Verify nullish coalescing operator provides default
      expect(result.appDescription).toBe("No description available");
      expect(result.projectName).toBe("test-project");
      expect(result.fileCount).toBe(50);
    });

    it("should use nullish coalescing operator (??) for default app description when null", async () => {
      const mockAppSummaryData: Pick<AppSummaryRecordWithId, "appDescription" | "llmProvider"> = {
        appDescription: null as any,
        llmProvider: "azure-openai",
      };

      mockSourcesRepository.getProjectFileAndLineStats.mockResolvedValue({
        fileCount: 75,
        linesOfCode: 3750,
      });

      const result = await dataProvider.getAppStatistics("test-project", mockAppSummaryData);

      // Verify nullish coalescing operator handles null
      expect(result.appDescription).toBe("No description available");
      expect(result.llmProvider).toBe("azure-openai");
    });

    it("should NOT use default when description is an empty string (nullish coalescing behavior)", async () => {
      const mockAppSummaryData: Pick<AppSummaryRecordWithId, "appDescription" | "llmProvider"> = {
        appDescription: "",
        llmProvider: "bedrock",
      };

      mockSourcesRepository.getProjectFileAndLineStats.mockResolvedValue({
        fileCount: 10,
        linesOfCode: 500,
      });

      const result = await dataProvider.getAppStatistics("test-project", mockAppSummaryData);

      // Nullish coalescing should NOT replace empty string (only null/undefined)
      expect(result.appDescription).toBe("");
    });

    it("should call getProjectFileAndLineStats with correct project name", async () => {
      const mockAppSummaryData: Pick<AppSummaryRecordWithId, "appDescription" | "llmProvider"> = {
        appDescription: "My app",
        llmProvider: "vertex-ai",
      };

      mockSourcesRepository.getProjectFileAndLineStats.mockResolvedValue({
        fileCount: 200,
        linesOfCode: 10000,
      });

      await dataProvider.getAppStatistics("my-test-project", mockAppSummaryData);

      expect(mockSourcesRepository.getProjectFileAndLineStats).toHaveBeenCalledWith(
        "my-test-project",
      );
      expect(mockSourcesRepository.getProjectFileAndLineStats).toHaveBeenCalledTimes(1);
    });

    it("should include current date in statistics", async () => {
      const mockAppSummaryData: Pick<AppSummaryRecordWithId, "appDescription" | "llmProvider"> = {
        appDescription: "Test app",
        llmProvider: "openai",
      };

      mockSourcesRepository.getProjectFileAndLineStats.mockResolvedValue({
        fileCount: 0,
        linesOfCode: 0,
      });

      const result = await dataProvider.getAppStatistics("test-project", mockAppSummaryData);

      expect(result.currentDate).toBeDefined();
      expect(result.currentDate).not.toBe("");
      // Date format can vary, just check it contains digits and separators
      expect(result.currentDate).toMatch(/\d/);
    });
  });
});
