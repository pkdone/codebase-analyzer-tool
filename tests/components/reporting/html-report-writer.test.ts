import "reflect-metadata";
import mockFs from "mock-fs";
import path from "path";
import ejs from "ejs";
import {
  HtmlReportWriter,
  PreparedHtmlReportData,
} from "../../../src/components/reporting/html-report-writer";
import { outputConfig } from "../../../src/config/output.config";
import { writeFile } from "../../../src/common/fs/file-operations";

// Mock dependencies
jest.mock("../../../src/common/fs/file-operations");
jest.mock("ejs");

const mockWriteFile = writeFile as jest.MockedFunction<typeof writeFile>;
const mockEjs = ejs as jest.Mocked<typeof ejs>;

describe("HtmlReportWriter", () => {
  let htmlReportWriter: HtmlReportWriter;
  let mockConsoleLog: jest.SpyInstance;

  const mockPreparedData: PreparedHtmlReportData = {
    appStats: {
      projectName: "test-project",
      currentDate: "2025-10-09",
      llmProvider: "test-provider",
      fileCount: 100,
      linesOfCode: 5000,
      appDescription: "Test application",
    },
    fileTypesData: [
      { fileType: "javascript", lines: 1000, files: 50 },
      { fileType: "typescript", lines: 2000, files: 30 },
    ],
    fileTypesPieChartPath: "/path/to/chart.png",
    categorizedData: [
      {
        category: "entities",
        label: "Business Entities",
        data: [{ name: "User", description: "User entity" }],
        tableViewModel: new (jest.requireActual(
          "../../../src/components/reporting/view-models/table-view-model",
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
    topLevelJavaClasses: [{ namespace: "com.example.MyClass", dependencies: [] }],
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
      allRequiredAppSummaryFields: ["appDescription", "llmProvider"],
      jsonDataFiles: {
        completeReport: "complete-report",
        appStats: "app-stats.json",
        appDescription: "app-description.tson",
        fileTypes: "file-types.tson",
        dbInteractions: "db-interactions.tson",
        procsAndTriggers: "procs-and-triggers.tson",
        topLevelJavaClasses: "top-level-java-classes.tson",
        integrationPoints: "integration-points.tson",
      },
      getCategoryJSONFilename: (category: string) => `${category}.tson`,
    },
    convertToDisplayName: (text: string) => text.replace(/_/g, " "),
    fileTypesTableViewModel: new (jest.requireActual(
      "../../../src/components/reporting/view-models/table-view-model",
    ).TableViewModel)([]),
    dbInteractionsTableViewModel: new (jest.requireActual(
      "../../../src/components/reporting/view-models/table-view-model",
    ).TableViewModel)([]),
    procsAndTriggersTableViewModel: new (jest.requireActual(
      "../../../src/components/reporting/view-models/table-view-model",
    ).TableViewModel)([]),
    topLevelJavaClassesTableViewModel: new (jest.requireActual(
      "../../../src/components/reporting/view-models/table-view-model",
    ).TableViewModel)([]),
    integrationPointsTableViewModel: new (jest.requireActual(
      "../../../src/components/reporting/view-models/table-view-model",
    ).TableViewModel)([]),
    billOfMaterials: [],
    bomStatistics: {
      total: 0,
      conflicts: 0,
      buildFiles: 0,
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

    // Table view models for enhanced sections

    // Asset content to be embedded inline
    inlineCss: "/* test css */",
    jsonIconSvg: "<svg>test</svg>",
  };

  beforeEach(() => {
    jest.clearAllMocks();

    htmlReportWriter = new HtmlReportWriter();

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
    it("should render template and write HTML file successfully", async () => {
      const htmlFilePath = "/output/test-report.html";
      const expectedTemplatePath = path.join(
        __dirname.replace("tests/components/reporting", "src/components/reporting"),
        outputConfig.HTML_TEMPLATES_DIR,
        outputConfig.HTML_MAIN_TEMPLATE_FILE,
      );

      await htmlReportWriter.writeHTMLReportFile(mockPreparedData, htmlFilePath);

      // Expect the template data to be passed as-is (asset content should already be included)
      expect(mockEjs.renderFile).toHaveBeenCalledWith(expectedTemplatePath, mockPreparedData);
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
        htmlReportWriter.writeHTMLReportFile(mockPreparedData, htmlFilePath),
      ).rejects.toThrow("Template rendering failed");

      expect(mockWriteFile).not.toHaveBeenCalled();
      expect(mockConsoleLog).not.toHaveBeenCalled();
    });

    it("should handle file writing errors", async () => {
      const htmlFilePath = "/output/test-report.html";
      const fileError = new Error("File writing failed");

      mockWriteFile.mockRejectedValue(fileError);

      await expect(
        htmlReportWriter.writeHTMLReportFile(mockPreparedData, htmlFilePath),
      ).rejects.toThrow("File writing failed");

      expect(mockEjs.renderFile).toHaveBeenCalled();
      expect(mockConsoleLog).not.toHaveBeenCalled();
    });

    it("should use correct template path", async () => {
      const htmlFilePath = "/output/custom-report.html";

      await htmlReportWriter.writeHTMLReportFile(mockPreparedData, htmlFilePath);

      const expectedTemplatePath = path.join(
        __dirname.replace("tests/components/reporting", "src/components/reporting"),
        outputConfig.HTML_TEMPLATES_DIR,
        outputConfig.HTML_MAIN_TEMPLATE_FILE,
      );

      expect(mockEjs.renderFile).toHaveBeenCalledWith(
        expectedTemplatePath,
        expect.objectContaining({
          ...mockPreparedData,
          inlineCss: expect.any(String),
          jsonIconSvg: expect.any(String),
        }),
      );
    });

    it("should pass through all prepared data to template", async () => {
      const htmlFilePath = "/output/test-report.html";

      await htmlReportWriter.writeHTMLReportFile(mockPreparedData, htmlFilePath);

      expect(mockEjs.renderFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          ...mockPreparedData,
          inlineCss: expect.any(String),
          jsonIconSvg: expect.any(String),
        }),
      );

      // Verify the exact data structure is passed through
      const passedData = (mockEjs.renderFile as jest.Mock).mock.calls[0][1];
      expect(passedData).toHaveProperty("inlineCss");
      expect(typeof passedData.inlineCss).toBe("string");
      expect(passedData.inlineCss).toBe("/* test css */");
      expect(passedData).toHaveProperty("jsonIconSvg");
      expect(passedData.jsonIconSvg).toBe("<svg>test</svg>");
      expect(passedData).toHaveProperty("appStats");
      expect(passedData).toHaveProperty("categorizedData");
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
        await htmlReportWriter.writeHTMLReportFile(mockPreparedData, htmlFilePath);

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
      await htmlReportWriter.writeHTMLReportFile(mockPreparedData, htmlFilePath);

      expect(mockWriteFile).toHaveBeenCalledWith(htmlFilePath, customTemplate);
    });
  });

  describe("edge cases", () => {
    it("should handle empty prepared data", async () => {
      const emptyData = {
        inlineCss: "/* css */",
        jsonIconSvg: "<svg></svg>",
      } as PreparedHtmlReportData;
      const htmlFilePath = "/output/empty-report.html";

      await htmlReportWriter.writeHTMLReportFile(emptyData, htmlFilePath);

      expect(mockEjs.renderFile).toHaveBeenCalledWith(expect.any(String), emptyData);
      expect(mockWriteFile).toHaveBeenCalled();
    });

    it("should handle very long file paths", async () => {
      const longPath =
        "/very/long/path/with/many/nested/directories/and/a/very/long/filename/that/exceeds/normal/length/expectations/report.html";

      await htmlReportWriter.writeHTMLReportFile(mockPreparedData, longPath);

      expect(mockWriteFile).toHaveBeenCalledWith(longPath, expect.any(String));
      expect(mockConsoleLog).toHaveBeenCalledWith(
        `View generated report in a browser: file://${path.resolve(longPath)}`,
      );
    });

    it("should handle special characters in file paths", async () => {
      const specialCharPath = "/output/report with spaces & symbols (test).html";

      await htmlReportWriter.writeHTMLReportFile(mockPreparedData, specialCharPath);

      expect(mockWriteFile).toHaveBeenCalledWith(specialCharPath, expect.any(String));
    });
  });
});
