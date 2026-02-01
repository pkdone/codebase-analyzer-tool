import "reflect-metadata";
import {
  DomainModelSection,
  DomainModelDiagramGenerator,
} from "../../../../../src/app/components/reporting/sections/domain-model";
import { DomainModelTransformer } from "../../../../../src/app/components/reporting/sections/domain-model/domain-model-transformer";
import {
  InferredArchitectureSection,
  CurrentArchitectureDiagramGenerator,
} from "../../../../../src/app/components/reporting/sections/inferred-architecture";
import {
  PotentialMicroservicesSection,
  ArchitectureDiagramGenerator,
} from "../../../../../src/app/components/reporting/sections/future-architecture";
import type { ReportData } from "../../../../../src/app/components/reporting/report-data.types";
import type {
  CategorizedSectionItem,
  InferredArchitectureInner,
  PotentialMicroservicesArray,
} from "../../../../../src/app/components/reporting/data-processing";
import { AppSummaryCategories } from "../../../../../src/app/schemas/app-summaries.schema";

/**
 * Creates a minimal ReportData object for testing.
 */
function createMinimalReportData(categorizedData: CategorizedSectionItem[] = []): ReportData {
  return {
    appStats: {
      projectName: "test",
      currentDate: "2024-01-01",
      llmModels: "test",
      fileCount: 100,
      linesOfCode: 5000,
      appDescription: "Test app",
    },
    fileTypesData: [],
    categorizedData,
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
}

describe("DomainModelSection", () => {
  let section: DomainModelSection;
  let mockDomainModelTransformer: jest.Mocked<DomainModelTransformer>;
  let mockDomainModelDiagramGenerator: jest.Mocked<DomainModelDiagramGenerator>;

  beforeEach(() => {
    mockDomainModelTransformer = {
      getDomainModelData: jest.fn().mockReturnValue({
        boundedContexts: [],
        aggregates: [],
        entities: [],
        repositories: [],
      }),
    } as unknown as jest.Mocked<DomainModelTransformer>;

    mockDomainModelDiagramGenerator = {
      generateMultipleContextDiagrams: jest.fn().mockReturnValue([]),
    } as unknown as jest.Mocked<DomainModelDiagramGenerator>;

    section = new DomainModelSection(mockDomainModelTransformer, mockDomainModelDiagramGenerator);
  });

  describe("getName", () => {
    it("should return the correct section name", () => {
      expect(section.getName()).toBe("visualizations");
    });
  });

  describe("getRequiredAppSummaryFields", () => {
    it("should return boundedContexts", () => {
      expect(section.getRequiredAppSummaryFields()).toEqual(["boundedContexts"]);
    });
  });

  describe("getData", () => {
    it("should return empty object", async () => {
      const result = await section.getData("test-project");
      expect(result).toEqual({});
    });
  });

  describe("prepareHtmlData", () => {
    it("should call domain model data provider and diagram generator", async () => {
      const baseData = createMinimalReportData();

      const result = await section.prepareHtmlData(baseData, {}, "/output");

      expect(mockDomainModelTransformer.getDomainModelData).toHaveBeenCalledWith(
        baseData.categorizedData,
      );
      expect(mockDomainModelDiagramGenerator.generateMultipleContextDiagrams).toHaveBeenCalled();
      expect(result).toHaveProperty("domainModelData");
      expect(result).toHaveProperty("contextDiagramSvgs");
    });
  });

  describe("prepareJsonData", () => {
    it("should return empty array", () => {
      const baseData = createMinimalReportData();
      const result = section.prepareJsonData(baseData, {});
      expect(result).toEqual([]);
    });
  });
});

describe("PotentialMicroservicesSection", () => {
  let section: PotentialMicroservicesSection;
  let mockArchitectureDiagramGenerator: jest.Mocked<ArchitectureDiagramGenerator>;

  beforeEach(() => {
    mockArchitectureDiagramGenerator = {
      generateArchitectureDiagram: jest.fn().mockReturnValue("<svg>architecture</svg>"),
    } as unknown as jest.Mocked<ArchitectureDiagramGenerator>;

    section = new PotentialMicroservicesSection(mockArchitectureDiagramGenerator);
  });

  describe("getName", () => {
    it("should return the correct section name", () => {
      expect(section.getName()).toBe("visualizations");
    });
  });

  describe("getRequiredAppSummaryFields", () => {
    it("should return potentialMicroservices", () => {
      expect(section.getRequiredAppSummaryFields()).toEqual(["potentialMicroservices"]);
    });
  });

  describe("getData", () => {
    it("should return empty object", async () => {
      const result = await section.getData("test-project");
      expect(result).toEqual({});
    });
  });

  describe("prepareHtmlData", () => {
    it("should extract microservices and generate diagram", async () => {
      const microservices = [
        {
          name: "User Service",
          description: "Handles user management",
          entities: [],
          endpoints: [],
          operations: [],
        },
      ];

      const baseData = createMinimalReportData([
        {
          category: "potentialMicroservices",
          label: "Potential Microservices",
          data: microservices as PotentialMicroservicesArray,
        },
      ]);

      const result = await section.prepareHtmlData(baseData, {}, "/output");

      expect(mockArchitectureDiagramGenerator.generateArchitectureDiagram).toHaveBeenCalled();
      expect(result).toHaveProperty("microservicesData");
      expect(result).toHaveProperty("architectureDiagramSvg");
      expect(result?.microservicesData).toHaveLength(1);
      expect(result?.microservicesData?.[0]?.name).toBe("User Service");
    });

    it("should handle empty microservices data", async () => {
      const baseData = createMinimalReportData([]);

      const result = await section.prepareHtmlData(baseData, {}, "/output");

      expect(result?.microservicesData).toEqual([]);
    });
  });

  describe("prepareJsonData", () => {
    it("should return empty array", () => {
      const baseData = createMinimalReportData();
      const result = section.prepareJsonData(baseData, {});
      expect(result).toEqual([]);
    });
  });
});

describe("InferredArchitectureSection", () => {
  let section: InferredArchitectureSection;
  let mockCurrentArchitectureDiagramGenerator: jest.Mocked<CurrentArchitectureDiagramGenerator>;

  beforeEach(() => {
    mockCurrentArchitectureDiagramGenerator = {
      generateCurrentArchitectureDiagram: jest
        .fn()
        .mockReturnValue("<svg>current architecture</svg>"),
    } as unknown as jest.Mocked<CurrentArchitectureDiagramGenerator>;

    section = new InferredArchitectureSection(mockCurrentArchitectureDiagramGenerator);
  });

  describe("getName", () => {
    it("should return the correct section name", () => {
      expect(section.getName()).toBe("visualizations");
    });
  });

  describe("getRequiredAppSummaryFields", () => {
    it("should return inferredArchitecture", () => {
      expect(section.getRequiredAppSummaryFields()).toEqual(["inferredArchitecture"]);
    });
  });

  describe("getData", () => {
    it("should return empty object", async () => {
      const result = await section.getData("test-project");
      expect(result).toEqual({});
    });
  });

  describe("prepareHtmlData", () => {
    it("should extract inferred architecture data and generate diagram", async () => {
      const inferredArchData = {
        internalComponents: [{ name: "Order Manager", description: "Handles orders" }],
        externalDependencies: [{ name: "PostgreSQL", type: "Database", description: "Primary DB" }],
        dependencies: [{ from: "Order Manager", to: "PostgreSQL", description: "Persists data" }],
      };

      const baseData = createMinimalReportData([
        {
          category: "inferredArchitecture",
          label: "Inferred Architecture",
          data: [inferredArchData] as InferredArchitectureInner[],
        },
      ]);

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

      expect(result).toHaveProperty("inferredArchitectureData");
      expect(result).toHaveProperty("currentArchitectureDiagramSvg");
      expect(result?.inferredArchitectureData).toEqual({
        internalComponents: [{ name: "Order Manager", description: "Handles orders" }],
        externalDependencies: [{ name: "PostgreSQL", type: "Database", description: "Primary DB" }],
        dependencies: [{ from: "Order Manager", to: "PostgreSQL", description: "Persists data" }],
      });
    });

    it("should return null for inferredArchitectureData when not present", async () => {
      const baseData = createMinimalReportData([
        {
          category: "technologies",
          label: "Technologies",
          data: [{ name: "Java", description: "Programming language" }],
        },
      ]);

      const result = await section.prepareHtmlData(baseData, {}, "/output");

      expect(result?.inferredArchitectureData).toBeNull();
      expect(
        mockCurrentArchitectureDiagramGenerator.generateCurrentArchitectureDiagram,
      ).toHaveBeenCalledWith(null);
    });

    it("should handle empty inferredArchitecture data array", async () => {
      const baseData = createMinimalReportData([
        {
          category: "inferredArchitecture",
          label: "Inferred Architecture",
          data: [] as InferredArchitectureInner[],
        },
      ]);

      const result = await section.prepareHtmlData(baseData, {}, "/output");

      expect(result?.inferredArchitectureData).toBeNull();
    });
  });

  describe("prepareJsonData", () => {
    it("should return empty array", () => {
      const baseData = createMinimalReportData();
      const result = section.prepareJsonData(baseData, {});
      expect(result).toEqual([]);
    });
  });
});

describe("AppSummaryCategories enum values", () => {
  it("should verify AppSummaryCategories enum values match expected strings", () => {
    // These tests ensure the enum values match what the code expects
    expect(AppSummaryCategories.enum.businessProcesses).toBe("businessProcesses");
    expect(AppSummaryCategories.enum.potentialMicroservices).toBe("potentialMicroservices");
    expect(AppSummaryCategories.enum.inferredArchitecture).toBe("inferredArchitecture");
  });
});
