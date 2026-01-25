import "reflect-metadata";
import mockFs from "mock-fs";
import path from "path";
import ejs from "ejs";
import { HtmlReportWriter } from "../../../../src/app/components/reporting/html-report-writer";
import type {
  PreparedHtmlReportData,
  PreparedHtmlReportDataWithoutAssets,
} from "../../../../src/app/components/reporting/types/html-report-data.types";
import { HtmlReportAssetService } from "../../../../src/app/components/reporting/services/html-report-asset.service";
import { outputConfig } from "../../../../src/app/config/output.config";
import { writeFile } from "../../../../src/common/fs/file-operations";
import { container } from "tsyringe";
import { coreTokens, reportingTokens } from "../../../../src/app/di/tokens";

// Mock dependencies
jest.mock("../../../../src/common/fs/file-operations");
jest.mock("ejs");
jest.mock("../../../../src/app/components/reporting/services/html-report-asset.service");

const mockWriteFile = writeFile as jest.MockedFunction<typeof writeFile>;
const mockEjs = ejs as jest.Mocked<typeof ejs>;

describe("HtmlReportWriter", () => {
  let htmlReportWriter: HtmlReportWriter;
  let mockConsoleLog: jest.SpyInstance;
  let mockAssetService: jest.Mocked<HtmlReportAssetService>;

  const mockPreparedDataWithoutAssets: PreparedHtmlReportDataWithoutAssets = {
    appStats: {
      projectName: "test-project",
      currentDate: "2025-10-09",
      llmModels: "test-provider",
      fileCount: 100,
      linesOfCode: 5000,
      appDescription: "Test application",
    },
    fileTypesData: [
      { fileType: "javascript", lines: 1000, files: 50 },
      { fileType: "typescript", lines: 2000, files: 30 },
    ],
    pieChartData: {
      totalFiles: 80,
      svgHeight: 600,
      svgWidth: 950,
      slices: [
        {
          label: "javascript",
          value: 50,
          percentage: 62.5,
          color: "#2196F3",
          pathData: "M 300 300 L 550 300 A 250 250 0 1 1 300 50 Z",
          labelX: 300,
          labelY: 100,
          showLabel: true,
        },
        {
          label: "typescript",
          value: 30,
          percentage: 37.5,
          color: "#4CAF50",
          pathData: "M 300 300 L 300 50 A 250 250 0 0 1 550 300 Z",
          labelX: 450,
          labelY: 300,
          showLabel: true,
        },
      ],
      config: {
        centerX: 300,
        centerY: 300,
        legendX: 620,
        legendY: 30,
        legendItemHeight: 28,
        legendBoxSize: 14,
      },
    },
    categorizedData: [
      {
        category: "technologies",
        label: "Business Entities",
        data: [{ name: "User", description: "User entity" }],
        tableViewModel: new (jest.requireActual(
          "../../../../src/app/components/reporting/table",
        ).TableViewModel)([]),
      },
    ],
    dbInteractions: [
      {
        path: "/src/db.ts",
        mechanism: "MongoDB",
        description: "Database connection",
        codeExample: "const db = new MongoClient()",
      },
    ],
    procsAndTriggers: {
      procs: { total: 5, low: 2, medium: 2, high: 1, list: [] },
      trigs: { total: 2, low: 1, medium: 1, high: 0, list: [] },
    },
    integrationPoints: [
      {
        namespace: "com.example.UserController",
        filepath: "src/controllers/UserController.java",
        mechanism: "REST",
        name: "getUsers",
        path: "/api/users",
        method: "GET",
        description: "Get all users",
        requestBody: undefined,
        responseBody: "List of users",
        authentication: "JWT",
      },
    ],
    jsonFilesConfig: {
      allRequiredAppSummaryFields: ["appDescription", "llmModels"],
      jsonDataFiles: {
        completeReport: "complete-report",
        appStats: "app-stats.json",
        appDescription: "app-description.tson",
        fileTypes: "file-types.tson",
        dbInteractions: "db-interactions.tson",
        procsAndTriggers: "procs-and-triggers.tson",
        integrationPoints: "integration-points.tson",
      },
      getCategoryJSONFilename: (category: string) => `${category}.tson`,
    },
    htmlReportConstants: {
      paths: {
        ASSETS_DIR: "assets/",
      },
    },
    convertToDisplayName: (text: string) => text.replace(/_/g, " "),
    fileTypesTableViewModel: new (jest.requireActual(
      "../../../../src/app/components/reporting/table",
    ).TableViewModel)([]),
    dbInteractionsTableViewModel: new (jest.requireActual(
      "../../../../src/app/components/reporting/table",
    ).TableViewModel)([]),
    procsAndTriggersTableViewModel: new (jest.requireActual(
      "../../../../src/app/components/reporting/table",
    ).TableViewModel)([]),
    integrationPointsTableViewModel: new (jest.requireActual(
      "../../../../src/app/components/reporting/table",
    ).TableViewModel)([]),
    billOfMaterials: [],
    bomStatistics: {
      total: 0,
      conflicts: 0,
      buildFiles: 0,
      conflictsCssClass: "no-conflicts",
    },
    codeQualitySummary: null,
    scheduledJobsSummary: null,
    jobsStatistics: null,
    moduleCoupling: null,
    couplingStatistics: null,
    uiTechnologyAnalysis: null,

    // Enhanced UI data
    businessProcessesFlowchartSvgs: [],
    domainModelData: {
      boundedContexts: [],
      aggregates: [],
      entities: [],
      repositories: [],
    },
    contextDiagramSvgs: [],
    microservicesData: [],
    architectureDiagramSvg: "",

    // Current/Inferred Architecture data
    inferredArchitectureData: null,
    currentArchitectureDiagramSvg: "",
  };

  const mockAssets = {
    inlineCss: "/* test css */",
    jsonIconSvg: "<svg>test</svg>",
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Create a mock asset service
    mockAssetService = {
      loadAssets: jest.fn().mockResolvedValue(mockAssets),
      clearCache: jest.fn(),
    } as unknown as jest.Mocked<HtmlReportAssetService>;

    // Register dependencies in DI container for testing
    container.registerInstance(coreTokens.OutputConfig, outputConfig);
    container.registerInstance(reportingTokens.HtmlReportAssetService, mockAssetService);
    htmlReportWriter = container.resolve(HtmlReportWriter);

    // Mock console.log
    mockConsoleLog = jest.spyOn(console, "log").mockImplementation();

    // Setup default mock implementations
    mockEjs.renderFile = jest.fn().mockResolvedValue("<html><body>Test Report</body></html>");
    mockWriteFile.mockResolvedValue(undefined);
  });

  afterEach(() => {
    mockConsoleLog.mockRestore();
    mockFs.restore();
  });

  describe("writeHTMLReportFile", () => {
    it("should load assets and render template successfully", async () => {
      const htmlFilePath = "/output/test-report.html";
      const expectedTemplatePath = path.join(
        __dirname.replace("tests/app/components/reporting", "src/app/components/reporting"),
        outputConfig.HTML_TEMPLATES_DIR,
        outputConfig.HTML_MAIN_TEMPLATE_FILE,
      );

      await htmlReportWriter.writeHTMLReportFile(mockPreparedDataWithoutAssets, htmlFilePath);

      // Verify assets were loaded
      expect(mockAssetService.loadAssets).toHaveBeenCalled();

      // Expect the template data to include loaded assets
      expect(mockEjs.renderFile).toHaveBeenCalledWith(
        expectedTemplatePath,
        expect.objectContaining({
          ...mockPreparedDataWithoutAssets,
          inlineCss: mockAssets.inlineCss,
          jsonIconSvg: mockAssets.jsonIconSvg,
        }),
      );
      expect(mockWriteFile).toHaveBeenCalledWith(
        htmlFilePath,
        "<html><body>Test Report</body></html>",
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        `View generated report in a browser: file://${path.resolve(htmlFilePath)}`,
      );
    });

    it("should handle template rendering errors", async () => {
      const htmlFilePath = "/output/test-report.html";
      const templateError = new Error("Template rendering failed");

      mockEjs.renderFile = jest.fn().mockRejectedValue(templateError);

      await expect(
        htmlReportWriter.writeHTMLReportFile(mockPreparedDataWithoutAssets, htmlFilePath),
      ).rejects.toThrow("Template rendering failed");

      expect(mockWriteFile).not.toHaveBeenCalled();
      expect(mockConsoleLog).not.toHaveBeenCalled();
    });

    it("should handle file writing errors", async () => {
      const htmlFilePath = "/output/test-report.html";
      const fileError = new Error("File writing failed");

      mockWriteFile.mockRejectedValue(fileError);

      await expect(
        htmlReportWriter.writeHTMLReportFile(mockPreparedDataWithoutAssets, htmlFilePath),
      ).rejects.toThrow("File writing failed");

      expect(mockEjs.renderFile).toHaveBeenCalled();
      expect(mockConsoleLog).not.toHaveBeenCalled();
    });

    it("should handle asset loading errors", async () => {
      const htmlFilePath = "/output/test-report.html";
      const assetError = new Error("Asset loading failed");

      mockAssetService.loadAssets.mockRejectedValue(assetError);

      await expect(
        htmlReportWriter.writeHTMLReportFile(mockPreparedDataWithoutAssets, htmlFilePath),
      ).rejects.toThrow("Asset loading failed");

      expect(mockEjs.renderFile).not.toHaveBeenCalled();
      expect(mockWriteFile).not.toHaveBeenCalled();
    });

    it("should use correct template path", async () => {
      const htmlFilePath = "/output/custom-report.html";

      await htmlReportWriter.writeHTMLReportFile(mockPreparedDataWithoutAssets, htmlFilePath);

      const expectedTemplatePath = path.join(
        __dirname.replace("tests/app/components/reporting", "src/app/components/reporting"),
        outputConfig.HTML_TEMPLATES_DIR,
        outputConfig.HTML_MAIN_TEMPLATE_FILE,
      );

      expect(mockEjs.renderFile).toHaveBeenCalledWith(
        expectedTemplatePath,
        expect.objectContaining({
          inlineCss: expect.any(String),
          jsonIconSvg: expect.any(String),
        }),
      );
    });

    it("should pass through all prepared data to template with assets", async () => {
      const htmlFilePath = "/output/test-report.html";

      await htmlReportWriter.writeHTMLReportFile(mockPreparedDataWithoutAssets, htmlFilePath);

      const passedData = (mockEjs.renderFile as jest.Mock).mock
        .calls[0][1] as PreparedHtmlReportData;

      // Verify assets are injected
      expect(passedData.inlineCss).toBe(mockAssets.inlineCss);
      expect(passedData.jsonIconSvg).toBe(mockAssets.jsonIconSvg);

      // Verify original data is preserved
      expect(passedData.appStats).toEqual(mockPreparedDataWithoutAssets.appStats);
      expect(passedData.categorizedData).toEqual(mockPreparedDataWithoutAssets.categorizedData);
      expect(passedData).toHaveProperty("convertToDisplayName");
    });

    it("should handle different file paths correctly", async () => {
      const testCases = [
        "/output/report.html",
        "./relative/path/report.html",
        "../parent/directory/report.html",
        "simple-filename.html",
      ];

      for (const htmlFilePath of testCases) {
        await htmlReportWriter.writeHTMLReportFile(mockPreparedDataWithoutAssets, htmlFilePath);

        expect(mockWriteFile).toHaveBeenCalledWith(htmlFilePath, expect.any(String));
        expect(mockConsoleLog).toHaveBeenCalledWith(
          `View generated report in a browser: file://${path.resolve(htmlFilePath)}`,
        );
      }

      expect(mockEjs.renderFile).toHaveBeenCalledTimes(testCases.length);
      expect(mockWriteFile).toHaveBeenCalledTimes(testCases.length);
    });

    it("should preserve template content exactly", async () => {
      const customTemplate =
        "<html><head><title>{{title}}</title></head><body>{{content}}</body></html>";
      mockEjs.renderFile = jest.fn().mockResolvedValue(customTemplate);

      const htmlFilePath = "/output/test-report.html";
      await htmlReportWriter.writeHTMLReportFile(mockPreparedDataWithoutAssets, htmlFilePath);

      expect(mockWriteFile).toHaveBeenCalledWith(htmlFilePath, customTemplate);
    });
  });

  describe("edge cases", () => {
    it("should handle empty prepared data", async () => {
      const emptyData = {} as PreparedHtmlReportDataWithoutAssets;
      const htmlFilePath = "/output/empty-report.html";

      await htmlReportWriter.writeHTMLReportFile(emptyData, htmlFilePath);

      // Should still inject assets even with empty data
      expect(mockEjs.renderFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          inlineCss: mockAssets.inlineCss,
          jsonIconSvg: mockAssets.jsonIconSvg,
        }),
      );
      expect(mockWriteFile).toHaveBeenCalled();
    });

    it("should handle very long file paths", async () => {
      const longPath =
        "/very/long/path/with/many/nested/directories/and/a/very/long/filename/that/exceeds/normal/length/expectations/report.html";

      await htmlReportWriter.writeHTMLReportFile(mockPreparedDataWithoutAssets, longPath);

      expect(mockWriteFile).toHaveBeenCalledWith(longPath, expect.any(String));
      expect(mockConsoleLog).toHaveBeenCalledWith(
        `View generated report in a browser: file://${path.resolve(longPath)}`,
      );
    });

    it("should handle special characters in file paths", async () => {
      const specialCharPath = "/output/report with spaces & symbols (test).html";

      await htmlReportWriter.writeHTMLReportFile(mockPreparedDataWithoutAssets, specialCharPath);

      expect(mockWriteFile).toHaveBeenCalledWith(specialCharPath, expect.any(String));
    });
  });

  describe("PreparedHtmlReportData interface structure", () => {
    it("should have table view model properties defined before enhanced UI data section", () => {
      // Verify that table view model properties are correctly positioned
      expect(mockPreparedDataWithoutAssets).toHaveProperty("fileTypesTableViewModel");
      expect(mockPreparedDataWithoutAssets).toHaveProperty("dbInteractionsTableViewModel");
      expect(mockPreparedDataWithoutAssets).toHaveProperty("procsAndTriggersTableViewModel");
      expect(mockPreparedDataWithoutAssets).toHaveProperty("integrationPointsTableViewModel");

      // Verify these properties come before enhanced UI data
      const dataKeys = Object.keys(mockPreparedDataWithoutAssets);
      const fileTypesIndex = dataKeys.indexOf("fileTypesTableViewModel");
      const dbInteractionsIndex = dataKeys.indexOf("dbInteractionsTableViewModel");
      const businessProcessesIndex = dataKeys.indexOf("businessProcessesFlowchartSvgs");

      expect(fileTypesIndex).toBeGreaterThan(-1);
      expect(dbInteractionsIndex).toBeGreaterThan(-1);
      expect(businessProcessesIndex).toBeGreaterThan(-1);
      expect(fileTypesIndex).toBeLessThan(businessProcessesIndex);
      expect(dbInteractionsIndex).toBeLessThan(businessProcessesIndex);
    });

    it("should ensure PreparedHtmlReportDataWithoutAssets excludes asset properties", () => {
      // TypeScript compilation would fail if these existed
      const keys = Object.keys(mockPreparedDataWithoutAssets);
      expect(keys).not.toContain("inlineCss");
      expect(keys).not.toContain("jsonIconSvg");
    });
  });
});
