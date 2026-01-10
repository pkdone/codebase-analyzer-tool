import "reflect-metadata";
import { ArchitectureAndDomainSection } from "../../../../../src/app/components/reporting/sections/visualizations/architecture-and-domain-section";
import { DomainModelDataProvider } from "../../../../../src/app/components/reporting/sections/visualizations/domain-model-data-provider";
import {
  FlowchartDiagramGenerator,
  DomainModelDiagramGenerator,
  ArchitectureDiagramGenerator,
  CurrentArchitectureDiagramGenerator,
} from "../../../../../src/app/components/reporting/diagrams";
import type { ReportData } from "../../../../../src/app/components/reporting/report-data.types";
import type { AppSummaryNameDescArray } from "../../../../../src/app/repositories/app-summaries/app-summaries.model";
import { AppSummaryCategories } from "../../../../../src/app/schemas/app-summaries.schema";

describe("ArchitectureAndDomainSection", () => {
  let section: ArchitectureAndDomainSection;
  let mockDomainModelDataProvider: jest.Mocked<DomainModelDataProvider>;
  let mockFlowchartDiagramGenerator: jest.Mocked<FlowchartDiagramGenerator>;
  let mockDomainModelDiagramGenerator: jest.Mocked<DomainModelDiagramGenerator>;
  let mockArchitectureDiagramGenerator: jest.Mocked<ArchitectureDiagramGenerator>;
  let mockCurrentArchitectureDiagramGenerator: jest.Mocked<CurrentArchitectureDiagramGenerator>;

  beforeEach(() => {
    mockDomainModelDataProvider = {
      getDomainModelData: jest.fn().mockReturnValue({
        boundedContexts: [],
        aggregates: [],
        entities: [],
        repositories: [],
      }),
    } as unknown as jest.Mocked<DomainModelDataProvider>;

    mockFlowchartDiagramGenerator = {
      generateMultipleFlowchartDiagrams: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<FlowchartDiagramGenerator>;

    mockDomainModelDiagramGenerator = {
      generateMultipleContextDiagrams: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<DomainModelDiagramGenerator>;

    mockArchitectureDiagramGenerator = {
      generateArchitectureDiagram: jest.fn().mockResolvedValue("<svg>architecture</svg>"),
    } as unknown as jest.Mocked<ArchitectureDiagramGenerator>;

    mockCurrentArchitectureDiagramGenerator = {
      generateCurrentArchitectureDiagram: jest
        .fn()
        .mockResolvedValue("<svg>current architecture</svg>"),
    } as unknown as jest.Mocked<CurrentArchitectureDiagramGenerator>;

    section = new ArchitectureAndDomainSection(
      mockDomainModelDataProvider,
      mockFlowchartDiagramGenerator,
      mockDomainModelDiagramGenerator,
      mockArchitectureDiagramGenerator,
      mockCurrentArchitectureDiagramGenerator,
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
        billOfMaterials: [],
        codeQualitySummary: null,
        scheduledJobsSummary: null,
        moduleCoupling: null,
        uiTechnologyAnalysis: null,
      };

      const result = await section.prepareHtmlData(baseData, {}, "/output");

      expect(
        mockCurrentArchitectureDiagramGenerator.generateCurrentArchitectureDiagram,
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
        billOfMaterials: [],
        codeQualitySummary: null,
        scheduledJobsSummary: null,
        moduleCoupling: null,
        uiTechnologyAnalysis: null,
      };

      const result = await section.prepareHtmlData(baseData, {}, "/output");

      expect(result?.inferredArchitectureData).toBeNull();
      expect(
        mockCurrentArchitectureDiagramGenerator.generateCurrentArchitectureDiagram,
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

  describe("category lookups using AppSummaryCategories enum", () => {
    it("should find business processes using enum value", async () => {
      const businessProcesses = [
        {
          name: "Order Processing",
          description: "Handles order creation",
          keyBusinessActivities: [{ activity: "Create Order", description: "Creates new order" }],
        },
      ];

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
            category: AppSummaryCategories.enum.businessProcesses,
            label: "Business Processes",
            data: businessProcesses as AppSummaryNameDescArray,
          },
        ],
        integrationPoints: [],
        dbInteractions: [],
        procsAndTriggers: {
          procs: { total: 0, low: 0, medium: 0, high: 0, list: [] },
          trigs: { total: 0, low: 0, medium: 0, high: 0, list: [] },
        },
        billOfMaterials: [],
        codeQualitySummary: null,
        scheduledJobsSummary: null,
        moduleCoupling: null,
        uiTechnologyAnalysis: null,
      };

      await section.prepareHtmlData(baseData, {}, "/output");

      expect(mockFlowchartDiagramGenerator.generateMultipleFlowchartDiagrams).toHaveBeenCalled();
    });

    it("should find potential microservices using enum value", async () => {
      const microservices = [
        {
          name: "User Service",
          description: "Handles user management",
          entities: [],
          endpoints: [],
          operations: [],
        },
      ];

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
            category: AppSummaryCategories.enum.potentialMicroservices,
            label: "Potential Microservices",
            data: microservices as AppSummaryNameDescArray,
          },
        ],
        integrationPoints: [],
        dbInteractions: [],
        procsAndTriggers: {
          procs: { total: 0, low: 0, medium: 0, high: 0, list: [] },
          trigs: { total: 0, low: 0, medium: 0, high: 0, list: [] },
        },
        billOfMaterials: [],
        codeQualitySummary: null,
        scheduledJobsSummary: null,
        moduleCoupling: null,
        uiTechnologyAnalysis: null,
      };

      const result = await section.prepareHtmlData(baseData, {}, "/output");

      expect(result?.microservicesData).toHaveLength(1);
      expect(result?.microservicesData?.[0]?.name).toBe("User Service");
    });

    it("should find inferred architecture using enum value", async () => {
      const inferredArchData = {
        internalComponents: [{ name: "Payment Service", description: "Handles payments" }],
        externalDependencies: [
          { name: "Stripe", type: "External API", description: "Payment gateway" },
        ],
        dependencies: [
          { from: "Payment Service", to: "Stripe", description: "Payment processing" },
        ],
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
            category: AppSummaryCategories.enum.inferredArchitecture,
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
        billOfMaterials: [],
        codeQualitySummary: null,
        scheduledJobsSummary: null,
        moduleCoupling: null,
        uiTechnologyAnalysis: null,
      };

      const result = await section.prepareHtmlData(baseData, {}, "/output");

      expect(result?.inferredArchitectureData).not.toBeNull();
      expect(result?.inferredArchitectureData?.internalComponents).toHaveLength(1);
    });

    it("should verify AppSummaryCategories enum values match expected strings", () => {
      // These tests ensure the enum values match what the code expects
      expect(AppSummaryCategories.enum.businessProcesses).toBe("businessProcesses");
      expect(AppSummaryCategories.enum.potentialMicroservices).toBe("potentialMicroservices");
      expect(AppSummaryCategories.enum.inferredArchitecture).toBe("inferredArchitecture");
    });
  });
});
