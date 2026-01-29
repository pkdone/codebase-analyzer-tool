import "reflect-metadata";
import AppReportGenerator from "../../../../src/app/components/reporting/app-report-generator";
import { AppSummariesRepository } from "../../../../src/app/repositories/app-summaries/app-summaries.repository.interface";
import type { RequestableAppSummaryField } from "../../../../src/app/repositories/app-summaries/app-summaries.model";
import { HtmlReportWriter } from "../../../../src/app/components/reporting/html-report-writer";
import { JsonReportWriter } from "../../../../src/app/components/reporting/json-report-writer";
import { AppStatisticsDataProvider } from "../../../../src/app/components/reporting/sections/overview/app-statistics-data-provider";
import { CategorizedSectionDataBuilder } from "../../../../src/app/components/reporting/data-processing";
import { HtmlReportAssetService } from "../../../../src/app/components/reporting/services/html-report-asset.service";
import type { ReportSection } from "../../../../src/app/components/reporting/sections/report-section.interface";
// Import types for type checking only
import type { ReportData } from "../../../../src/app/components/reporting/report-data.types";

describe("AppReportGenerator", () => {
  let generator: AppReportGenerator;
  let mockAppSummariesRepository: jest.Mocked<AppSummariesRepository>;
  let mockHtmlWriter: jest.Mocked<HtmlReportWriter>;
  let mockJsonWriter: jest.Mocked<JsonReportWriter>;
  let mockAppStatsDataProvider: jest.Mocked<AppStatisticsDataProvider>;
  let mockCategorizedDataBuilder: jest.Mocked<CategorizedSectionDataBuilder>;
  let mockSections: jest.Mocked<ReportSection>[];
  let mockAssetService: jest.Mocked<HtmlReportAssetService>;

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

    mockCategorizedDataBuilder = {
      getStandardSectionData: jest.fn(),
    } as unknown as jest.Mocked<CategorizedSectionDataBuilder>;

    mockAssetService = {
      ensureMermaidAsset: jest.fn().mockResolvedValue(undefined),
      loadAssets: jest.fn().mockResolvedValue({ inlineCss: "", jsonIconSvg: "" }),
      clearCache: jest.fn(),
    } as unknown as jest.Mocked<HtmlReportAssetService>;

    // Create mock sections with properly typed required fields
    const section1Fields: readonly RequestableAppSummaryField[] = ["businessProcesses"];
    const section2Fields: readonly RequestableAppSummaryField[] = ["boundedContexts"];

    mockSections = [
      {
        getName: jest.fn().mockReturnValue("section1"),
        getRequiredAppSummaryFields: jest.fn().mockReturnValue(section1Fields),
        getData: jest.fn().mockResolvedValue({ section1Data: "test" }),
        prepareHtmlData: jest.fn().mockResolvedValue({ section1Html: "html" }),
        prepareJsonData: jest.fn().mockReturnValue([{ filename: "section1.json", data: {} }]),
      },
      {
        getName: jest.fn().mockReturnValue("section2"),
        getRequiredAppSummaryFields: jest.fn().mockReturnValue(section2Fields),
        getData: jest.fn().mockResolvedValue({ section2Data: "test" }),
        prepareHtmlData: jest.fn().mockResolvedValue({ section2Html: "html" }),
        prepareJsonData: jest.fn().mockReturnValue([{ filename: "section2.json", data: {} }]),
      },
    ] as unknown as jest.Mocked<ReportSection>[];

    const mockOutputConfig = {
      OUTPUT_DIR: "output",
      OUTPUT_SUMMARY_FILENAME: "codebase-report",
      OUTPUT_SUMMARY_HTML_FILE: "codebase-report.html",
      HTML_TEMPLATES_DIR: "templates",
      HTML_MAIN_TEMPLATE_FILE: "main.ejs",
      externalAssets: {
        MERMAID_CDN_UMD_URL: "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js",
        MERMAID_UMD_FILENAME: "mermaid.min.js",
      },
      assets: {
        CSS_FILENAME: "style.css",
        JSON_ICON_FILENAME: "json-icon.svg",
        ASSETS_SUBDIR: "assets",
      },
      jsonFiles: {
        COMPLETE_REPORT: "codebase-report.json",
        APP_STATS: "app-stats.json",
        APP_DESCRIPTION: "app-description.json",
        FILE_TYPES: "file-types.json",
        DB_INTERACTIONS: "db-interactions.json",
        PROCS_AND_TRIGGERS: "procs-and-triggers.json",
        INTEGRATION_POINTS: "integration-points.json",
        UI_TECHNOLOGY_ANALYSIS: "ui-technology-analysis.json",
      },
      formatting: {
        DATE_LOCALE: "en-GB",
      },
    } as const;

    generator = new AppReportGenerator(
      mockAppSummariesRepository,
      mockHtmlWriter,
      mockJsonWriter,
      mockAppStatsDataProvider,
      mockCategorizedDataBuilder,
      mockSections,
      mockOutputConfig,
      mockAssetService,
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
        llmModels: "test",
        fileCount: 100,
        linesOfCode: 5000,
        appDescription: "Test app",
      };

      const mockCategorizedData: ReportData["categorizedData"] = [
        {
          category: "technologies",
          label: "Entities",
          data: [{ name: "User", description: "User entity" }],
        },
      ];

      mockAppStatsDataProvider.getAppStatistics.mockResolvedValue(mockAppStats);
      mockCategorizedDataBuilder.getStandardSectionData.mockReturnValue(mockCategorizedData);

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
        llmModels: "test",
        fileCount: 100,
        linesOfCode: 5000,
        appDescription: "Test app",
      };

      const mockCategorizedData: ReportData["categorizedData"] = [];

      mockAppStatsDataProvider.getAppStatistics.mockResolvedValue(mockAppStats);
      mockCategorizedDataBuilder.getStandardSectionData.mockReturnValue(mockCategorizedData);

      await generator.generateReport("test-project", "/output", "report.html");

      // Verify all sections contributed to JSON data
      const jsonDataCall = mockJsonWriter.writeAllJSONFiles.mock.calls[0][0];
      expect(jsonDataCall.length).toBeGreaterThan(2); // At least one from each section
    });

    it("should handle partial section failures gracefully using Promise.allSettled", async () => {
      const mockAppSummaryData = { appDescription: "Test app", projectName: "test" };
      mockAppSummariesRepository.getProjectAppSummaryFields.mockResolvedValue(mockAppSummaryData);

      const mockAppStats = {
        projectName: "test",
        currentDate: "2024-01-01",
        llmModels: "test",
        fileCount: 100,
        linesOfCode: 5000,
        appDescription: "Test app",
      };

      const mockCategorizedData: ReportData["categorizedData"] = [];

      mockAppStatsDataProvider.getAppStatistics.mockResolvedValue(mockAppStats);
      mockCategorizedDataBuilder.getStandardSectionData.mockReturnValue(mockCategorizedData);

      // Make one section fail
      mockSections[0].getData.mockRejectedValue(new Error("Section 1 failed"));
      mockSections[1].getData.mockResolvedValue({ fileTypesData: [] });

      // Mock console.warn to verify it's called for failed sections
      const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();

      await generator.generateReport("test-project", "/output", "report.html");

      // Verify that console.warn was called for the failed section
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "Failed to get data for a report section:",
        expect.any(Error),
      );

      // Verify that the successful section's data is still used
      expect(mockSections[1].prepareHtmlData).toHaveBeenCalled();
      expect(mockSections[1].prepareJsonData).toHaveBeenCalled();

      // Verify that report generation still completes
      expect(mockHtmlWriter.writeHTMLReportFile).toHaveBeenCalled();
      expect(mockJsonWriter.writeAllJSONFiles).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it("should aggregate fields from all sections with core fields", async () => {
      // Setup sections with different required fields using properly typed arrays
      const businessProcessesFields: readonly RequestableAppSummaryField[] = ["businessProcesses"];
      const boundedContextsFields: readonly RequestableAppSummaryField[] = ["boundedContexts"];

      mockSections[0].getRequiredAppSummaryFields.mockReturnValue(businessProcessesFields);
      mockSections[1].getRequiredAppSummaryFields.mockReturnValue(boundedContextsFields);

      const mockAppSummaryData = { appDescription: "Test app", projectName: "test" };
      mockAppSummariesRepository.getProjectAppSummaryFields.mockResolvedValue(mockAppSummaryData);
      mockAppStatsDataProvider.getAppStatistics.mockResolvedValue({
        projectName: "test",
        currentDate: "2024-01-01",
        llmModels: "test",
        fileCount: 100,
        linesOfCode: 5000,
        appDescription: "Test app",
      });
      mockCategorizedDataBuilder.getStandardSectionData.mockReturnValue([]);

      await generator.generateReport("test-project", "/output", "report.html");

      // Verify repository was called with aggregated fields
      const [, fieldsArg] = mockAppSummariesRepository.getProjectAppSummaryFields.mock.calls[0] as [
        string,
        RequestableAppSummaryField[],
      ];

      // Should include core fields
      expect(fieldsArg).toContain("appDescription");
      expect(fieldsArg).toContain("llmModels");
      expect(fieldsArg).toContain("technologies");

      // Should include section-specific fields
      expect(fieldsArg).toContain("businessProcesses");
      expect(fieldsArg).toContain("boundedContexts");
    });

    it("should deduplicate fields requested by multiple sections", async () => {
      // Both sections request the same field using properly typed arrays
      const businessProcessesFields: readonly RequestableAppSummaryField[] = ["businessProcesses"];
      mockSections[0].getRequiredAppSummaryFields.mockReturnValue(businessProcessesFields);
      mockSections[1].getRequiredAppSummaryFields.mockReturnValue(businessProcessesFields);

      const mockAppSummaryData = { appDescription: "Test app", projectName: "test" };
      mockAppSummariesRepository.getProjectAppSummaryFields.mockResolvedValue(mockAppSummaryData);
      mockAppStatsDataProvider.getAppStatistics.mockResolvedValue({
        projectName: "test",
        currentDate: "2024-01-01",
        llmModels: "test",
        fileCount: 100,
        linesOfCode: 5000,
        appDescription: "Test app",
      });
      mockCategorizedDataBuilder.getStandardSectionData.mockReturnValue([]);

      await generator.generateReport("test-project", "/output", "report.html");

      const [, fieldsArg] = mockAppSummariesRepository.getProjectAppSummaryFields.mock.calls[0] as [
        string,
        RequestableAppSummaryField[],
      ];

      // Count occurrences of businessProcesses - should be deduplicated
      const businessProcessesCount = fieldsArg.filter(
        (f: RequestableAppSummaryField) => f === "businessProcesses",
      ).length;
      expect(businessProcessesCount).toBe(1);
    });

    it("should handle sections with empty required fields", async () => {
      // Both sections return empty arrays
      const emptyFields: readonly RequestableAppSummaryField[] = [];
      mockSections[0].getRequiredAppSummaryFields.mockReturnValue(emptyFields);
      mockSections[1].getRequiredAppSummaryFields.mockReturnValue(emptyFields);

      const mockAppSummaryData = { appDescription: "Test app", projectName: "test" };
      mockAppSummariesRepository.getProjectAppSummaryFields.mockResolvedValue(mockAppSummaryData);
      mockAppStatsDataProvider.getAppStatistics.mockResolvedValue({
        projectName: "test",
        currentDate: "2024-01-01",
        llmModels: "test",
        fileCount: 100,
        linesOfCode: 5000,
        appDescription: "Test app",
      });
      mockCategorizedDataBuilder.getStandardSectionData.mockReturnValue([]);

      await generator.generateReport("test-project", "/output", "report.html");

      const [, fieldsArg] = mockAppSummariesRepository.getProjectAppSummaryFields.mock.calls[0] as [
        string,
        RequestableAppSummaryField[],
      ];

      // Should still include core fields even if no sections request additional fields
      expect(fieldsArg).toContain("appDescription");
      expect(fieldsArg).toContain("llmModels");
      expect(fieldsArg).toContain("technologies");

      // Should have exactly the 3 core fields
      expect(fieldsArg).toHaveLength(3);
    });
  });
});
