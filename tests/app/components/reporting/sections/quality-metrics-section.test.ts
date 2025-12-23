import "reflect-metadata";
import { QualityMetricsSection } from "../../../../../src/app/components/reporting/sections/quality-metrics/quality-metrics-section";
import { BomDataProvider } from "../../../../../src/app/components/reporting/sections/quality-metrics/bom-data-provider";
import { CodeQualityDataProvider } from "../../../../../src/app/components/reporting/sections/quality-metrics/code-quality-data-provider";
import { JobDataProvider } from "../../../../../src/app/components/reporting/sections/quality-metrics/job-data-provider";
import { ModuleCouplingDataProvider } from "../../../../../src/app/components/reporting/sections/quality-metrics/module-coupling-data-provider";
import { UiDataProvider } from "../../../../../src/app/components/reporting/sections/quality-metrics/ui-data-provider";
import type { ReportData } from "../../../../../src/app/components/reporting/report-gen.types";

describe("QualityMetricsSection", () => {
  let section: QualityMetricsSection;
  let mockBomDataProvider: jest.Mocked<BomDataProvider>;
  let mockCodeQualityDataProvider: jest.Mocked<CodeQualityDataProvider>;
  let mockJobDataProvider: jest.Mocked<JobDataProvider>;
  let mockModuleCouplingDataProvider: jest.Mocked<ModuleCouplingDataProvider>;
  let mockUiDataProvider: jest.Mocked<UiDataProvider>;

  beforeEach(() => {
    mockBomDataProvider = {
      getBillOfMaterials: jest.fn(),
    } as unknown as jest.Mocked<BomDataProvider>;

    mockCodeQualityDataProvider = {
      getCodeQualitySummary: jest.fn(),
    } as unknown as jest.Mocked<CodeQualityDataProvider>;

    mockJobDataProvider = {
      getScheduledJobsSummary: jest.fn(),
    } as unknown as jest.Mocked<JobDataProvider>;

    mockModuleCouplingDataProvider = {
      getModuleCoupling: jest.fn(),
    } as unknown as jest.Mocked<ModuleCouplingDataProvider>;

    mockUiDataProvider = {
      getUiTechnologyAnalysis: jest.fn(),
    } as unknown as jest.Mocked<UiDataProvider>;

    section = new QualityMetricsSection(
      mockBomDataProvider,
      mockCodeQualityDataProvider,
      mockJobDataProvider,
      mockModuleCouplingDataProvider,
      mockUiDataProvider,
    );
  });

  describe("getName", () => {
    it("should return the correct section name", () => {
      expect(section.getName()).toBe("quality-metrics");
    });
  });

  describe("getData", () => {
    it("should fetch all quality metrics data fields", async () => {
      const mockBillOfMaterials = {
        dependencies: [{ name: "lib", versions: ["1.0"], hasConflict: false, locations: [] }],
        totalDependencies: 1,
        conflictCount: 0,
        buildFiles: [],
      };
      const mockCodeQualitySummary = {
        topComplexFunctions: [],
        commonCodeSmells: [],
        overallStatistics: {
          totalFunctions: 0,
          averageComplexity: 0,
          highComplexityCount: 0,
          veryHighComplexityCount: 0,
          averageFunctionLength: 0,
          longFunctionCount: 0,
        },
      };
      const mockScheduledJobsSummary = {
        jobs: [],
        totalJobs: 0,
        triggerTypes: [],
        jobFiles: [],
      };
      const mockModuleCoupling = {
        couplings: [],
        totalModules: 0,
        totalCouplings: 0,
        highestCouplingCount: 0,
        moduleDepth: 0,
      };
      const mockUiTechnologyAnalysis = {
        frameworks: [],
        totalJspFiles: 0,
        totalScriptlets: 0,
        totalExpressions: 0,
        totalDeclarations: 0,
        averageScriptletsPerFile: 0,
        filesWithHighScriptletCount: 0,
        customTagLibraries: [],
        topScriptletFiles: [],
      };

      mockBomDataProvider.getBillOfMaterials.mockResolvedValue(mockBillOfMaterials);
      mockCodeQualityDataProvider.getCodeQualitySummary.mockResolvedValue(mockCodeQualitySummary);
      mockJobDataProvider.getScheduledJobsSummary.mockResolvedValue(mockScheduledJobsSummary);
      mockModuleCouplingDataProvider.getModuleCoupling.mockResolvedValue(mockModuleCoupling);
      mockUiDataProvider.getUiTechnologyAnalysis.mockResolvedValue(mockUiTechnologyAnalysis);

      const result = await section.getData("test-project");

      expect(result).toEqual({
        billOfMaterials: mockBillOfMaterials.dependencies,
        codeQualitySummary: mockCodeQualitySummary,
        scheduledJobsSummary: mockScheduledJobsSummary,
        moduleCoupling: mockModuleCoupling,
        uiTechnologyAnalysis: mockUiTechnologyAnalysis,
      });
    });
  });

  describe("prepareHtmlData", () => {
    it("should calculate statistics for BOM, jobs, and coupling", async () => {
      const mockSectionData = {
        billOfMaterials: [
          { name: "lib1", versions: ["1.0"], hasConflict: false, locations: ["file1"] },
          { name: "lib2", versions: ["2.0"], hasConflict: true, locations: ["file2"] },
        ],
        codeQualitySummary: null,
        scheduledJobsSummary: {
          jobs: [],
          totalJobs: 5,
          triggerTypes: ["cron", "manual"],
          jobFiles: ["job1.java"],
        },
        moduleCoupling: {
          couplings: [],
          totalModules: 10,
          totalCouplings: 15,
          highestCouplingCount: 5,
          moduleDepth: 3,
        },
        uiTechnologyAnalysis: null,
      };

      const mockReportData: Partial<ReportData> = {} as ReportData;

      const result = await section.prepareHtmlData(
        mockReportData as ReportData,
        mockSectionData,
        "/output",
      );

      expect(result).toBeDefined();
      expect(result?.bomStatistics?.total).toBe(2);
      expect(result?.bomStatistics?.conflicts).toBe(1);
      expect(result?.jobsStatistics?.total).toBe(5);
      expect(result?.couplingStatistics?.totalModules).toBe(10);
    });
  });

  describe("prepareJsonData", () => {
    it("should prepare JSON data for all quality metrics sections", () => {
      const mockSectionData = {
        billOfMaterials: [],
        codeQualitySummary: null,
        scheduledJobsSummary: null,
        moduleCoupling: null,
        uiTechnologyAnalysis: null,
      };

      const mockReportData: Partial<ReportData> = {} as ReportData;

      const result = section.prepareJsonData(mockReportData as ReportData, mockSectionData);

      expect(result).toHaveLength(5);
      expect(result[0].filename).toBe("bill-of-materials.json");
      expect(result[1].filename).toBe("code-quality-summary.json");
      expect(result[2].filename).toBe("scheduled-jobs-summary.json");
      expect(result[3].filename).toBe("module-coupling.json");
      expect(result[4].filename).toBe("ui-technology-analysis.json");
    });

    it("should return empty array when billOfMaterials is missing", () => {
      const mockSectionData: Partial<ReportData> = {};

      const mockReportData: Partial<ReportData> = {} as ReportData;

      const result = section.prepareJsonData(mockReportData as ReportData, mockSectionData);

      expect(result).toHaveLength(0);
    });

    it("should return null when billOfMaterials is missing in prepareHtmlData", async () => {
      const mockSectionData: Partial<ReportData> = {};

      const mockReportData: Partial<ReportData> = {} as ReportData;

      const result = await section.prepareHtmlData(
        mockReportData as ReportData,
        mockSectionData,
        "/output",
      );

      expect(result).toBeNull();
    });
  });
});
