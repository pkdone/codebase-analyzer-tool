import "reflect-metadata";
import { AdvancedDataSection } from "../../../../src/components/reporting/sections/advanced-data-section";
import { AppSummariesRepository } from "../../../../src/repositories/app-summaries/app-summaries.repository.interface";
import type { ReportData } from "../../../../src/components/reporting/report-gen.types";

describe("AdvancedDataSection", () => {
  let section: AdvancedDataSection;
  let mockAppSummariesRepository: jest.Mocked<AppSummariesRepository>;

  beforeEach(() => {
    mockAppSummariesRepository = {
      getProjectAppSummaryField: jest.fn(),
    } as unknown as jest.Mocked<AppSummariesRepository>;

    section = new AdvancedDataSection(mockAppSummariesRepository);
  });

  describe("getName", () => {
    it("should return the correct section name", () => {
      expect(section.getName()).toBe("advanced-data");
    });
  });

  describe("getData", () => {
    it("should fetch all advanced data fields", async () => {
      const mockBillOfMaterials = [
        { name: "lib", versions: ["1.0"], hasConflict: false, locations: [] },
      ];
      const mockCodeQualitySummary = {
        topComplexMethods: [],
        commonCodeSmells: [],
        overallStatistics: {
          totalMethods: 0,
          averageComplexity: 0,
          highComplexityCount: 0,
          veryHighComplexityCount: 0,
          averageMethodLength: 0,
          longMethodCount: 0,
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

      mockAppSummariesRepository.getProjectAppSummaryField
        .mockResolvedValueOnce(mockBillOfMaterials)
        .mockResolvedValueOnce(mockCodeQualitySummary)
        .mockResolvedValueOnce(mockScheduledJobsSummary)
        .mockResolvedValueOnce(mockModuleCoupling)
        .mockResolvedValueOnce(mockUiTechnologyAnalysis);

      const result = await section.getData("test-project");

      expect(result).toEqual({
        billOfMaterials: mockBillOfMaterials,
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
    it("should prepare JSON data for all advanced sections", () => {
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
  });
});
