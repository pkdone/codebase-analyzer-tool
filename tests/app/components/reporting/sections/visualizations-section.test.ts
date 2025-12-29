import "reflect-metadata";
import { VisualizationsSection } from "../../../../../src/app/components/reporting/sections/visualizations/visualizations-section";
import { DomainModelDataProvider } from "../../../../../src/app/components/reporting/sections/visualizations/domain-model-data-provider";
import { FlowchartSvgGenerator } from "../../../../../src/app/components/reporting/generators/svg/flowchart-svg-generator";
import { DomainModelSvgGenerator } from "../../../../../src/app/components/reporting/generators/svg/domain-model-svg-generator";
import { ArchitectureSvgGenerator } from "../../../../../src/app/components/reporting/generators/svg/architecture-svg-generator";
import { CurrentArchitectureSvgGenerator } from "../../../../../src/app/components/reporting/generators/svg/current-architecture-svg-generator";
import type { ReportData } from "../../../../../src/app/components/reporting/report-gen.types";
import type { AppSummaryNameDescArray } from "../../../../../src/app/repositories/app-summaries/app-summaries.model";

describe("VisualizationsSection", () => {
  let section: VisualizationsSection;
  let mockDomainModelDataProvider: jest.Mocked<DomainModelDataProvider>;
  let mockFlowchartSvgGenerator: jest.Mocked<FlowchartSvgGenerator>;
  let mockDomainModelSvgGenerator: jest.Mocked<DomainModelSvgGenerator>;
  let mockArchitectureSvgGenerator: jest.Mocked<ArchitectureSvgGenerator>;
  let mockCurrentArchitectureSvgGenerator: jest.Mocked<CurrentArchitectureSvgGenerator>;

  beforeEach(() => {
    mockDomainModelDataProvider = {
      getDomainModelData: jest.fn().mockReturnValue({
        boundedContexts: [],
        aggregates: [],
        entities: [],
        repositories: [],
      }),
    } as unknown as jest.Mocked<DomainModelDataProvider>;

    mockFlowchartSvgGenerator = {
      generateMultipleFlowchartsSvg: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<FlowchartSvgGenerator>;

    mockDomainModelSvgGenerator = {
      generateMultipleContextDiagramsSvg: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<DomainModelSvgGenerator>;

    mockArchitectureSvgGenerator = {
      generateArchitectureDiagramSvg: jest.fn().mockResolvedValue("<svg>architecture</svg>"),
    } as unknown as jest.Mocked<ArchitectureSvgGenerator>;

    mockCurrentArchitectureSvgGenerator = {
      generateCurrentArchitectureDiagramSvg: jest
        .fn()
        .mockResolvedValue("<svg>current architecture</svg>"),
    } as unknown as jest.Mocked<CurrentArchitectureSvgGenerator>;

    section = new VisualizationsSection(
      mockDomainModelDataProvider,
      mockFlowchartSvgGenerator,
      mockDomainModelSvgGenerator,
      mockArchitectureSvgGenerator,
      mockCurrentArchitectureSvgGenerator,
    );
  });

  describe("getName", () => {
    it("should return the correct section name", () => {
      expect(section.getName()).toBe("visualizations");
    });
  });

  describe("getData", () => {
    it("should return empty object", async () => {
      const result = await section.getData("test-project");
      expect(result).toEqual({});
    });
  });

  describe("prepareHtmlData", () => {
    it("should call all generators and return prepared data", async () => {
      const baseData: ReportData = {
        appStats: {
          projectName: "test",
          currentDate: "2024-01-01",
          llmProvider: "test",
          fileCount: 100,
          linesOfCode: 5000,
          appDescription: "Test app",
        },
        fileTypesData: [],
        categorizedData: [],
        integrationPoints: [],
        dbInteractions: [],
        procsAndTriggers: {
          procs: { total: 0, low: 0, medium: 0, high: 0, list: [] },
          trigs: { total: 0, low: 0, medium: 0, high: 0, list: [] },
        },
        topLevelJavaClasses: [],
        billOfMaterials: [],
        codeQualitySummary: null,
        scheduledJobsSummary: null,
        moduleCoupling: null,
        uiTechnologyAnalysis: null,
      };

      const result = await section.prepareHtmlData(baseData, {}, "/output");

      expect(result).toHaveProperty("businessProcessesFlowchartSvgs");
      expect(result).toHaveProperty("domainModelData");
      expect(result).toHaveProperty("contextDiagramSvgs");
      expect(result).toHaveProperty("microservicesData");
      expect(result).toHaveProperty("architectureDiagramSvg");
      expect(result).toHaveProperty("inferredArchitectureData");
      expect(result).toHaveProperty("currentArchitectureDiagramSvg");
    });

    it("should extract inferredArchitecture data from categorizedData", async () => {
      const inferredArchData = {
        internalComponents: [{ name: "Order Manager", description: "Handles orders" }],
        externalDependencies: [{ name: "PostgreSQL", type: "Database", description: "Primary DB" }],
        dependencies: [{ from: "Order Manager", to: "PostgreSQL", description: "Persists data" }],
      };

      const baseData: ReportData = {
        appStats: {
          projectName: "test",
          currentDate: "2024-01-01",
          llmProvider: "test",
          fileCount: 100,
          linesOfCode: 5000,
          appDescription: "Test app",
        },
        fileTypesData: [],
        categorizedData: [
          {
            category: "inferredArchitecture",
            label: "Inferred Architecture",
            data: [inferredArchData] as unknown as AppSummaryNameDescArray,
          },
        ],
        integrationPoints: [],
        dbInteractions: [],
        procsAndTriggers: {
          procs: { total: 0, low: 0, medium: 0, high: 0, list: [] },
          trigs: { total: 0, low: 0, medium: 0, high: 0, list: [] },
        },
        topLevelJavaClasses: [],
        billOfMaterials: [],
        codeQualitySummary: null,
        scheduledJobsSummary: null,
        moduleCoupling: null,
        uiTechnologyAnalysis: null,
      };

      const result = await section.prepareHtmlData(baseData, {}, "/output");

      expect(
        mockCurrentArchitectureSvgGenerator.generateCurrentArchitectureDiagramSvg,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          internalComponents: expect.arrayContaining([
            expect.objectContaining({ name: "Order Manager" }),
          ]),
          externalDependencies: expect.arrayContaining([
            expect.objectContaining({ name: "PostgreSQL", type: "Database" }),
          ]),
          dependencies: expect.arrayContaining([
            expect.objectContaining({ from: "Order Manager", to: "PostgreSQL" }),
          ]),
        }),
      );

      expect(result?.inferredArchitectureData).toEqual({
        internalComponents: [{ name: "Order Manager", description: "Handles orders" }],
        externalDependencies: [{ name: "PostgreSQL", type: "Database", description: "Primary DB" }],
        dependencies: [{ from: "Order Manager", to: "PostgreSQL", description: "Persists data" }],
      });
    });

    it("should return null for inferredArchitectureData when not present", async () => {
      const baseData: ReportData = {
        appStats: {
          projectName: "test",
          currentDate: "2024-01-01",
          llmProvider: "test",
          fileCount: 100,
          linesOfCode: 5000,
          appDescription: "Test app",
        },
        fileTypesData: [],
        categorizedData: [
          {
            category: "technologies",
            label: "Technologies",
            data: [
              { name: "Java", description: "Programming language" },
            ] as AppSummaryNameDescArray,
          },
        ],
        integrationPoints: [],
        dbInteractions: [],
        procsAndTriggers: {
          procs: { total: 0, low: 0, medium: 0, high: 0, list: [] },
          trigs: { total: 0, low: 0, medium: 0, high: 0, list: [] },
        },
        topLevelJavaClasses: [],
        billOfMaterials: [],
        codeQualitySummary: null,
        scheduledJobsSummary: null,
        moduleCoupling: null,
        uiTechnologyAnalysis: null,
      };

      const result = await section.prepareHtmlData(baseData, {}, "/output");

      expect(result?.inferredArchitectureData).toBeNull();
      expect(
        mockCurrentArchitectureSvgGenerator.generateCurrentArchitectureDiagramSvg,
      ).toHaveBeenCalledWith(null);
    });

    it("should handle empty inferredArchitecture data array", async () => {
      const baseData: ReportData = {
        appStats: {
          projectName: "test",
          currentDate: "2024-01-01",
          llmProvider: "test",
          fileCount: 100,
          linesOfCode: 5000,
          appDescription: "Test app",
        },
        fileTypesData: [],
        categorizedData: [
          {
            category: "inferredArchitecture",
            label: "Inferred Architecture",
            data: [] as AppSummaryNameDescArray,
          },
        ],
        integrationPoints: [],
        dbInteractions: [],
        procsAndTriggers: {
          procs: { total: 0, low: 0, medium: 0, high: 0, list: [] },
          trigs: { total: 0, low: 0, medium: 0, high: 0, list: [] },
        },
        topLevelJavaClasses: [],
        billOfMaterials: [],
        codeQualitySummary: null,
        scheduledJobsSummary: null,
        moduleCoupling: null,
        uiTechnologyAnalysis: null,
      };

      const result = await section.prepareHtmlData(baseData, {}, "/output");

      expect(result?.inferredArchitectureData).toBeNull();
    });
  });

  describe("prepareJsonData", () => {
    it("should return empty array", () => {
      const baseData: ReportData = {
        appStats: {
          projectName: "test",
          currentDate: "2024-01-01",
          llmProvider: "test",
          fileCount: 100,
          linesOfCode: 5000,
          appDescription: "Test app",
        },
        fileTypesData: [],
        categorizedData: [],
        integrationPoints: [],
        dbInteractions: [],
        procsAndTriggers: {
          procs: { total: 0, low: 0, medium: 0, high: 0, list: [] },
          trigs: { total: 0, low: 0, medium: 0, high: 0, list: [] },
        },
        topLevelJavaClasses: [],
        billOfMaterials: [],
        codeQualitySummary: null,
        scheduledJobsSummary: null,
        moduleCoupling: null,
        uiTechnologyAnalysis: null,
      };

      const result = section.prepareJsonData(baseData, {});

      expect(result).toEqual([]);
    });
  });
});
