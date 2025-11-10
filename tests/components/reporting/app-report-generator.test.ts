import "reflect-metadata";
import AppReportGenerator from "../../../src/components/reporting/app-report-generator";
import { AppSummariesRepository } from "../../../src/repositories/app-summaries/app-summaries.repository.interface";
import { HtmlReportWriter } from "../../../src/components/reporting/html-report-writer";
import { JsonReportWriter } from "../../../src/components/reporting/json-report-writer";
import { AppStatisticsDataProvider } from "../../../src/components/reporting/data-providers/app-statistics-data-provider";
import { AppSummaryCategoriesProvider } from "../../../src/components/reporting/data-providers/categories-data-provider";
import type { ReportSection } from "../../../src/components/reporting/sections/report-section.interface";
// Import types for type checking only
import type { ReportData } from "../../../src/components/reporting/report-gen.types";

describe("AppReportGenerator", () => {
  let generator: AppReportGenerator;
  let mockAppSummariesRepository: jest.Mocked<AppSummariesRepository>;
  let mockHtmlWriter: jest.Mocked<HtmlReportWriter>;
  let mockJsonWriter: jest.Mocked<JsonReportWriter>;
  let mockAppStatsDataProvider: jest.Mocked<AppStatisticsDataProvider>;
  let mockCategoriesDataProvider: jest.Mocked<AppSummaryCategoriesProvider>;
  let mockSections: jest.Mocked<ReportSection>[];

  beforeEach(() => {
    mockAppSummariesRepository = {
      getProjectAppSummaryFields: jest.fn(),
    } as unknown as jest.Mocked<AppSummariesRepository>;

    mockHtmlWriter = {
      writeHTMLReportFile: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<HtmlReportWriter>;

    mockJsonWriter = {
      writeAllJSONFiles: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<JsonReportWriter>;

    mockAppStatsDataProvider = {
      getAppStatistics: jest.fn(),
    } as unknown as jest.Mocked<AppStatisticsDataProvider>;

    mockCategoriesDataProvider = {
      getGenericCategoryData: jest.fn(),
    } as unknown as jest.Mocked<AppSummaryCategoriesProvider>;

    // Create mock sections
    mockSections = [
      {
        getName: jest.fn().mockReturnValue("section1"),
        getData: jest.fn().mockResolvedValue({ section1Data: "test" }),
        prepareHtmlData: jest.fn().mockResolvedValue({ section1Html: "html" }),
        prepareJsonData: jest.fn().mockReturnValue([{ filename: "section1.json", data: {} }]),
      },
      {
        getName: jest.fn().mockReturnValue("section2"),
        getData: jest.fn().mockResolvedValue({ section2Data: "test" }),
        prepareHtmlData: jest.fn().mockResolvedValue({ section2Html: "html" }),
        prepareJsonData: jest.fn().mockReturnValue([{ filename: "section2.json", data: {} }]),
      },
    ] as unknown as jest.Mocked<ReportSection>[];

    generator = new AppReportGenerator(
      mockAppSummariesRepository,
      mockHtmlWriter,
      mockJsonWriter,
      mockAppStatsDataProvider,
      mockCategoriesDataProvider,
      mockSections,
    );
  });

  describe("generateReport", () => {
    it("should throw error when no app summary data exists", async () => {
      mockAppSummariesRepository.getProjectAppSummaryFields.mockResolvedValue(null);

      await expect(generator.generateReport("project", "/output", "report.html")).rejects.toThrow(
        "Unable to generate report because no app summary data exists",
      );
    });

    it("should generate report using sections", async () => {
      const mockAppSummaryData = { appDescription: "Test app", projectName: "test" };
      mockAppSummariesRepository.getProjectAppSummaryFields.mockResolvedValue(mockAppSummaryData);

      const mockAppStats = {
        projectName: "test",
        currentDate: "2024-01-01",
        llmProvider: "test",
        fileCount: 100,
        linesOfCode: 5000,
        appDescription: "Test app",
      };

      const mockCategorizedData = [
        {
          category: "entities",
          label: "Entities",
          data: [{ name: "User", description: "User entity" }],
        },
      ];

      mockAppStatsDataProvider.getAppStatistics.mockResolvedValue(mockAppStats);
      mockCategoriesDataProvider.getGenericCategoryData.mockReturnValue(mockCategorizedData);

      await generator.generateReport("test-project", "/output", "report.html");

      // Verify sections were called
      expect(mockSections[0].getData).toHaveBeenCalledWith("test-project");
      expect(mockSections[1].getData).toHaveBeenCalledWith("test-project");
      expect(mockSections[0].prepareHtmlData).toHaveBeenCalled();
      expect(mockSections[1].prepareHtmlData).toHaveBeenCalled();
      expect(mockSections[0].prepareJsonData).toHaveBeenCalled();
      expect(mockSections[1].prepareJsonData).toHaveBeenCalled();

      // Verify writers were called
      expect(mockHtmlWriter.writeHTMLReportFile).toHaveBeenCalled();
      expect(mockJsonWriter.writeAllJSONFiles).toHaveBeenCalled();
    });

    it("should handle multiple sections correctly", async () => {
      const mockAppSummaryData = { appDescription: "Test app", projectName: "test" };
      mockAppSummariesRepository.getProjectAppSummaryFields.mockResolvedValue(mockAppSummaryData);

      const mockAppStats = {
        projectName: "test",
        currentDate: "2024-01-01",
        llmProvider: "test",
        fileCount: 100,
        linesOfCode: 5000,
        appDescription: "Test app",
      };

      const mockCategorizedData: ReportData["categorizedData"] = [];

      mockAppStatsDataProvider.getAppStatistics.mockResolvedValue(mockAppStats);
      mockCategoriesDataProvider.getGenericCategoryData.mockReturnValue(mockCategorizedData);

      await generator.generateReport("test-project", "/output", "report.html");

      // Verify all sections contributed to JSON data
      const jsonDataCall = mockJsonWriter.writeAllJSONFiles.mock.calls[0][0];
      expect(jsonDataCall.length).toBeGreaterThan(2); // At least one from each section
    });
  });
});
