import "reflect-metadata";
import { ServerSideUiDataProvider } from "../../../../../src/app/components/reporting/sections/ui-analysis/server-side-ui-data-provider";
import type { SourcesRepository } from "../../../../../src/app/repositories/sources/sources.repository.interface";
import type { ProjectedSourceSummaryFields } from "../../../../../src/app/repositories/sources/sources.model";

/**
 * Helper function to create mock source file with UI framework data.
 */
function createMockFrameworkFile(
  filepath: string,
  framework: { name: string; version?: string; configFile: string },
): ProjectedSourceSummaryFields {
  return {
    filepath,
    summary: {
      purpose: "Configuration file",
      implementation: "XML configuration",
      uiFramework: framework,
    } as ProjectedSourceSummaryFields["summary"],
  };
}

/**
 * Helper function to create mock JSP file with metrics.
 */
function createMockJspFile(
  filepath: string,
  metrics: {
    scriptletCount: number;
    expressionCount: number;
    declarationCount: number;
    customTags?: { prefix: string; uri: string }[];
  },
): ProjectedSourceSummaryFields {
  return {
    filepath,
    summary: {
      purpose: "JSP page",
      implementation: "JSP",
      jspMetrics: metrics,
    } as ProjectedSourceSummaryFields["summary"],
  };
}

describe("ServerSideUiDataProvider", () => {
  let provider: ServerSideUiDataProvider;
  let mockSourcesRepository: jest.Mocked<SourcesRepository>;

  beforeEach(() => {
    mockSourcesRepository = {
      getProjectSourcesSummariesByFileType: jest.fn(),
      getProjectSourcesSummariesByCanonicalType: jest.fn(),
      insertSource: jest.fn(),
      deleteSourcesByProject: jest.fn(),
      doesProjectSourceExist: jest.fn(),
      getProjectDatabaseIntegrations: jest.fn(),
      getProjectStoredProceduresAndTriggers: jest.fn(),
      vectorSearchProjectSources: jest.fn(),
      getProjectFilesPaths: jest.fn(),
      getProjectFileAndLineStats: jest.fn(),
      getProjectFileTypesCountAndLines: jest.fn(),
      getProjectIntegrationPoints: jest.fn(),
      getTopComplexFunctions: jest.fn(),
      getCodeSmellStatistics: jest.fn(),
      getCodeQualityStatistics: jest.fn(),
    } as jest.Mocked<SourcesRepository>;

    provider = new ServerSideUiDataProvider(mockSourcesRepository);
  });

  describe("getUiTechnologyAnalysis", () => {
    it("should return empty result when no source files found", async () => {
      mockSourcesRepository.getProjectSourcesSummariesByFileType.mockResolvedValue([]);

      const result = await provider.getUiTechnologyAnalysis("test-project");

      expect(result.frameworks).toEqual([]);
      expect(result.totalJspFiles).toBe(0);
      expect(result.totalScriptlets).toBe(0);
      expect(result.customTagLibraries).toEqual([]);
      expect(result.topScriptletFiles).toEqual([]);
    });

    it("should aggregate frameworks from configuration files", async () => {
      mockSourcesRepository.getProjectSourcesSummariesByFileType.mockResolvedValue([
        createMockFrameworkFile("struts-config.xml", {
          name: "Struts",
          version: "1.3.10",
          configFile: "struts-config.xml",
        }),
        createMockFrameworkFile("faces-config.xml", {
          name: "JSF",
          version: "2.0",
          configFile: "faces-config.xml",
        }),
      ]);

      const result = await provider.getUiTechnologyAnalysis("test-project");

      expect(result.frameworks).toHaveLength(2);
      expect(result.frameworks.map((f) => f.name)).toContain("Struts");
      expect(result.frameworks.map((f) => f.name)).toContain("JSF");
    });

    it("should aggregate same framework from multiple config files", async () => {
      mockSourcesRepository.getProjectSourcesSummariesByFileType.mockResolvedValue([
        createMockFrameworkFile("module1/struts-config.xml", {
          name: "Struts",
          version: "1.3.10",
          configFile: "module1/struts-config.xml",
        }),
        createMockFrameworkFile("module2/struts-config.xml", {
          name: "Struts",
          version: "1.3.10",
          configFile: "module2/struts-config.xml",
        }),
      ]);

      const result = await provider.getUiTechnologyAnalysis("test-project");

      expect(result.frameworks).toHaveLength(1);
      expect(result.frameworks[0].configFiles).toHaveLength(2);
    });

    it("should calculate JSP metrics totals", async () => {
      mockSourcesRepository.getProjectSourcesSummariesByFileType.mockResolvedValue([
        createMockJspFile("page1.jsp", {
          scriptletCount: 5,
          expressionCount: 3,
          declarationCount: 1,
        }),
        createMockJspFile("page2.jsp", {
          scriptletCount: 10,
          expressionCount: 2,
          declarationCount: 0,
        }),
      ]);

      const result = await provider.getUiTechnologyAnalysis("test-project");

      expect(result.totalJspFiles).toBe(2);
      expect(result.totalScriptlets).toBe(15);
      expect(result.totalExpressions).toBe(5);
      expect(result.totalDeclarations).toBe(1);
      expect(result.averageScriptletsPerFile).toBe(7.5);
    });

    it("should aggregate custom tag libraries", async () => {
      mockSourcesRepository.getProjectSourcesSummariesByFileType.mockResolvedValue([
        createMockJspFile("page1.jsp", {
          scriptletCount: 0,
          expressionCount: 0,
          declarationCount: 0,
          customTags: [
            { prefix: "c", uri: "http://java.sun.com/jsp/jstl/core" },
            { prefix: "fmt", uri: "http://java.sun.com/jsp/jstl/fmt" },
          ],
        }),
        createMockJspFile("page2.jsp", {
          scriptletCount: 0,
          expressionCount: 0,
          declarationCount: 0,
          customTags: [{ prefix: "c", uri: "http://java.sun.com/jsp/jstl/core" }],
        }),
      ]);

      const result = await provider.getUiTechnologyAnalysis("test-project");

      expect(result.customTagLibraries).toHaveLength(2);
      const coreLib = result.customTagLibraries.find((t) => t.prefix === "c");
      expect(coreLib?.usageCount).toBe(2);
    });

    it("should sort custom tag libraries by usage count descending", async () => {
      mockSourcesRepository.getProjectSourcesSummariesByFileType.mockResolvedValue([
        createMockJspFile("page.jsp", {
          scriptletCount: 0,
          expressionCount: 0,
          declarationCount: 0,
          customTags: [
            { prefix: "a", uri: "http://example.com/a" },
            { prefix: "b", uri: "http://example.com/b" },
            { prefix: "b", uri: "http://example.com/b" },
            { prefix: "b", uri: "http://example.com/b" },
          ],
        }),
      ]);

      const result = await provider.getUiTechnologyAnalysis("test-project");

      expect(result.customTagLibraries[0].prefix).toBe("b");
      expect(result.customTagLibraries[0].usageCount).toBe(3);
    });

    it("should identify top scriptlet files sorted by total blocks", async () => {
      mockSourcesRepository.getProjectSourcesSummariesByFileType.mockResolvedValue([
        createMockJspFile("low.jsp", {
          scriptletCount: 2,
          expressionCount: 1,
          declarationCount: 0,
        }),
        createMockJspFile("high.jsp", {
          scriptletCount: 50,
          expressionCount: 20,
          declarationCount: 5,
        }),
        createMockJspFile("medium.jsp", {
          scriptletCount: 10,
          expressionCount: 5,
          declarationCount: 2,
        }),
      ]);

      const result = await provider.getUiTechnologyAnalysis("test-project");

      expect(result.topScriptletFiles[0].filePath).toBe("high.jsp");
      expect(result.topScriptletFiles[1].filePath).toBe("medium.jsp");
      expect(result.topScriptletFiles[2].filePath).toBe("low.jsp");
    });

    it("should count files with high scriptlet count", async () => {
      mockSourcesRepository.getProjectSourcesSummariesByFileType.mockResolvedValue([
        createMockJspFile("clean.jsp", {
          scriptletCount: 0,
          expressionCount: 0,
          declarationCount: 0,
        }),
        createMockJspFile("moderate.jsp", {
          scriptletCount: 5,
          expressionCount: 3,
          declarationCount: 1,
        }),
        createMockJspFile("high-debt.jsp", {
          scriptletCount: 50,
          expressionCount: 20,
          declarationCount: 10,
        }),
      ]);

      const result = await provider.getUiTechnologyAnalysis("test-project");

      // Files exceeding HIGH_SCRIPTLET_THRESHOLD (default 10) are counted
      expect(result.filesWithHighScriptletCount).toBeGreaterThan(0);
    });

    it("should return raw data without presentation fields (CSS classes)", async () => {
      mockSourcesRepository.getProjectSourcesSummariesByFileType.mockResolvedValue([
        createMockJspFile("debt.jsp", {
          scriptletCount: 100,
          expressionCount: 50,
          declarationCount: 10,
        }),
      ]);

      const result = await provider.getUiTechnologyAnalysis("test-project");

      // Raw data should NOT have presentation fields
      expect(result).not.toHaveProperty("totalScriptletsCssClass");
      expect(result).not.toHaveProperty("filesWithHighScriptletCountCssClass");
      expect(result).not.toHaveProperty("showHighDebtAlert");

      // Top scriptlet files should NOT have debt level presentation fields
      expect(result.topScriptletFiles[0]).not.toHaveProperty("debtLevel");
      expect(result.topScriptletFiles[0]).not.toHaveProperty("debtLevelClass");

      // But should have raw metrics
      expect(result.topScriptletFiles[0]).toHaveProperty("totalScriptletBlocks");
    });

    it("should include tagType classification for custom tag libraries", async () => {
      mockSourcesRepository.getProjectSourcesSummariesByFileType.mockResolvedValue([
        createMockJspFile("page.jsp", {
          scriptletCount: 0,
          expressionCount: 0,
          declarationCount: 0,
          customTags: [
            { prefix: "c", uri: "http://java.sun.com/jsp/jstl/core" },
            { prefix: "spring", uri: "http://springframework.org/tags" },
          ],
        }),
      ]);

      const result = await provider.getUiTechnologyAnalysis("test-project");

      // Should have tagType (domain classification)
      const jstlLib = result.customTagLibraries.find((t) => t.prefix === "c");
      expect(jstlLib?.tagType).toBe("JSTL");

      const springLib = result.customTagLibraries.find((t) => t.prefix === "spring");
      expect(springLib?.tagType).toBe("Spring");

      // Should NOT have tagTypeClass (presentation field)
      expect(jstlLib).not.toHaveProperty("tagTypeClass");
    });

    it("should handle mixed framework and JSP files", async () => {
      mockSourcesRepository.getProjectSourcesSummariesByFileType.mockResolvedValue([
        createMockFrameworkFile("struts-config.xml", {
          name: "Struts",
          version: "1.3",
          configFile: "struts-config.xml",
        }),
        createMockJspFile("page.jsp", {
          scriptletCount: 5,
          expressionCount: 2,
          declarationCount: 1,
          customTags: [{ prefix: "s", uri: "http://struts.apache.org/tags-html" }],
        }),
      ]);

      const result = await provider.getUiTechnologyAnalysis("test-project");

      expect(result.frameworks).toHaveLength(1);
      expect(result.totalJspFiles).toBe(1);
      expect(result.customTagLibraries).toHaveLength(1);
    });
  });
});
