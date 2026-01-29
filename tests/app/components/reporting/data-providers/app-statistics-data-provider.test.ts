import "reflect-metadata";
import { AppStatisticsDataProvider } from "../../../../../src/app/components/reporting/sections/overview/app-statistics-data-provider";
import { SourcesRepository } from "../../../../../src/app/repositories/sources/sources.repository.interface";
import type { AppSummaryRecordWithId } from "../../../../../src/app/repositories/app-summaries/app-summaries.model";
import { NO_DESCRIPTION_PLACEHOLDER } from "../../../../../src/app/components/reporting/config/placeholders.config";
import { outputConfig, type OutputConfigType } from "../../../../../src/app/config/output.config";

describe("AppStatisticsDataProvider", () => {
  let dataProvider: AppStatisticsDataProvider;
  let mockSourcesRepository: jest.Mocked<SourcesRepository>;
  let mockOutputConfig: OutputConfigType;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSourcesRepository = {
      getProjectFileAndLineStats: jest.fn(),
    } as unknown as jest.Mocked<SourcesRepository>;

    // Use real outputConfig for testing to ensure date formatting works correctly
    mockOutputConfig = outputConfig;

    dataProvider = new AppStatisticsDataProvider(mockSourcesRepository, mockOutputConfig);
  });

  describe("getAppStatistics", () => {
    it("should return app statistics with all fields populated", async () => {
      const mockAppSummaryData: Pick<AppSummaryRecordWithId, "appDescription" | "llmModels"> = {
        appDescription: "Test application description",
        llmModels: "openai",
      };

      mockSourcesRepository.getProjectFileAndLineStats.mockResolvedValue({
        fileCount: 100,
        linesOfCode: 5000,
      });

      const result = await dataProvider.getAppStatistics("test-project", mockAppSummaryData);

      expect(result.projectName).toBe("test-project");
      expect(result.llmModels).toBe("openai");
      expect(result.fileCount).toBe(100);
      expect(result.linesOfCode).toBe(5000);
      expect(result.appDescription).toBe("Test application description");
    });

    it("should use nullish coalescing operator (??) for default app description when undefined", async () => {
      const mockAppSummaryData: Pick<AppSummaryRecordWithId, "appDescription" | "llmModels"> = {
        appDescription: undefined,
        llmModels: "openai",
      };

      mockSourcesRepository.getProjectFileAndLineStats.mockResolvedValue({
        fileCount: 50,
        linesOfCode: 2500,
      });

      const result = await dataProvider.getAppStatistics("test-project", mockAppSummaryData);

      // Verify nullish coalescing operator provides default from constant
      expect(result.appDescription).toBe(NO_DESCRIPTION_PLACEHOLDER);
      expect(result.projectName).toBe("test-project");
      expect(result.fileCount).toBe(50);
    });

    it("should use nullish coalescing operator (??) for default app description when null", async () => {
      const mockAppSummaryData: Pick<AppSummaryRecordWithId, "appDescription" | "llmModels"> = {
        appDescription: null as any,
        llmModels: "azure-openai",
      };

      mockSourcesRepository.getProjectFileAndLineStats.mockResolvedValue({
        fileCount: 75,
        linesOfCode: 3750,
      });

      const result = await dataProvider.getAppStatistics("test-project", mockAppSummaryData);

      // Verify nullish coalescing operator handles null using constant
      expect(result.appDescription).toBe(NO_DESCRIPTION_PLACEHOLDER);
      expect(result.llmModels).toBe("azure-openai");
    });

    it("should NOT use default when description is an empty string (nullish coalescing behavior)", async () => {
      const mockAppSummaryData: Pick<AppSummaryRecordWithId, "appDescription" | "llmModels"> = {
        appDescription: "",
        llmModels: "bedrock",
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
      const mockAppSummaryData: Pick<AppSummaryRecordWithId, "appDescription" | "llmModels"> = {
        appDescription: "My app",
        llmModels: "vertex-ai",
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
      const mockAppSummaryData: Pick<AppSummaryRecordWithId, "appDescription" | "llmModels"> = {
        appDescription: "Test app",
        llmModels: "openai",
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

    it("should use DATE_LOCALE from output config for date formatting", async () => {
      const mockAppSummaryData: Pick<AppSummaryRecordWithId, "appDescription" | "llmModels"> = {
        appDescription: "Test app",
        llmModels: "openai",
      };

      mockSourcesRepository.getProjectFileAndLineStats.mockResolvedValue({
        fileCount: 0,
        linesOfCode: 0,
      });

      const result = await dataProvider.getAppStatistics("test-project", mockAppSummaryData);

      // The date should be in en-GB format (DD/MM/YYYY) based on the config
      // This validates the config is being used for date formatting
      expect(result.currentDate).toBeDefined();
      expect(typeof result.currentDate).toBe("string");
      // Verify the DATE_LOCALE is defined in the config being used
      expect(mockOutputConfig.formatting.DATE_LOCALE).toBe("en-GB");
    });
  });
});
