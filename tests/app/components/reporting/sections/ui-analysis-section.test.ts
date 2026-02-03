import "reflect-metadata";
import { UiAnalysisSection } from "../../../../../src/app/components/reporting/sections/ui-analysis/ui-analysis-section";
import { JavaUiTechnologyDataProvider } from "../../../../../src/app/components/reporting/sections/ui-analysis/java-ui-technology-data-provider";
import type { ReportData } from "../../../../../src/app/components/reporting/report-data.types";
import type { UiTechnologyAnalysisData } from "../../../../../src/app/components/reporting/sections/ui-analysis/ui-analysis.types";
import { UNKNOWN_VALUE_PLACEHOLDER } from "../../../../../src/app/components/reporting/config/placeholders.config";

/**
 * Creates mock raw UI technology analysis data (without presentation fields).
 */
function createMockUiAnalysisData(
  overrides: Partial<UiTechnologyAnalysisData> = {},
): UiTechnologyAnalysisData {
  return {
    frameworks: [],
    totalJspFiles: 0,
    totalScriptlets: 0,
    totalExpressions: 0,
    totalDeclarations: 0,
    averageScriptletsPerFile: 0,
    filesWithHighScriptletCount: 0,
    detectedTagLibraries: [],
    topScriptletFiles: [],
    ...overrides,
  };
}

describe("UiAnalysisSection", () => {
  let section: UiAnalysisSection;
  let mockDataProvider: jest.Mocked<JavaUiTechnologyDataProvider>;

  beforeEach(() => {
    mockDataProvider = {
      getUiTechnologyAnalysis: jest.fn(),
    } as unknown as jest.Mocked<JavaUiTechnologyDataProvider>;

    section = new UiAnalysisSection(mockDataProvider);
  });

  describe("prepareHtmlData", () => {
    const mockBaseData = {} as ReportData;

    it("should return null when no UI analysis data is provided", async () => {
      const result = await section.prepareHtmlData(mockBaseData, {}, "/tmp");

      expect(result).toBeNull();
    });

    it("should add totalScriptletsCssClass for high scriptlet counts", async () => {
      const rawData = createMockUiAnalysisData({
        totalScriptlets: 200, // Exceeds HIGH_SCRIPTLET_WARNING_THRESHOLD (100)
      });

      const result = await section.prepareHtmlData(
        mockBaseData,
        { uiTechnologyAnalysis: rawData },
        "/tmp",
      );

      expect(result?.uiTechnologyAnalysis?.totalScriptletsCssClass).toBe("high-scriptlet-warning");
    });

    it("should add empty totalScriptletsCssClass for low scriptlet counts", async () => {
      const rawData = createMockUiAnalysisData({
        totalScriptlets: 50, // Below threshold
      });

      const result = await section.prepareHtmlData(
        mockBaseData,
        { uiTechnologyAnalysis: rawData },
        "/tmp",
      );

      expect(result?.uiTechnologyAnalysis?.totalScriptletsCssClass).toBe("");
    });

    it("should add filesWithHighScriptletCountCssClass when files exceed threshold", async () => {
      const rawData = createMockUiAnalysisData({
        filesWithHighScriptletCount: 5,
      });

      const result = await section.prepareHtmlData(
        mockBaseData,
        { uiTechnologyAnalysis: rawData },
        "/tmp",
      );

      expect(result?.uiTechnologyAnalysis?.filesWithHighScriptletCountCssClass).toBe(
        "warning-text",
      );
    });

    it("should set showHighDebtAlert to true when files have high scriptlet count", async () => {
      const rawData = createMockUiAnalysisData({
        filesWithHighScriptletCount: 3,
      });

      const result = await section.prepareHtmlData(
        mockBaseData,
        { uiTechnologyAnalysis: rawData },
        "/tmp",
      );

      expect(result?.uiTechnologyAnalysis?.showHighDebtAlert).toBe(true);
    });

    it("should set showHighDebtAlert to false when no files have high scriptlet count", async () => {
      const rawData = createMockUiAnalysisData({
        filesWithHighScriptletCount: 0,
      });

      const result = await section.prepareHtmlData(
        mockBaseData,
        { uiTechnologyAnalysis: rawData },
        "/tmp",
      );

      expect(result?.uiTechnologyAnalysis?.showHighDebtAlert).toBe(false);
    });

    it("should add tagTypeClass to custom tag libraries", async () => {
      const rawData = createMockUiAnalysisData({
        detectedTagLibraries: [
          {
            prefix: "c",
            uri: "http://java.sun.com/jsp/jstl/core",
            usageCount: 10,
            tagType: "JSTL",
          },
          {
            prefix: "spring",
            uri: "http://springframework.org/tags",
            usageCount: 5,
            tagType: "Spring",
          },
          { prefix: "custom", uri: "/WEB-INF/custom.tld", usageCount: 3, tagType: "Custom" },
          { prefix: "other", uri: "http://other.com/lib", usageCount: 1, tagType: "Other" },
        ],
      });

      const result = await section.prepareHtmlData(
        mockBaseData,
        { uiTechnologyAnalysis: rawData },
        "/tmp",
      );

      const tagLibs = result?.uiTechnologyAnalysis?.detectedTagLibraries ?? [];
      expect(tagLibs[0].tagTypeClass).toBe("badge-info"); // JSTL
      expect(tagLibs[1].tagTypeClass).toBe("badge-info"); // Spring
      expect(tagLibs[2].tagTypeClass).toBe("badge-warning"); // Custom
      expect(tagLibs[3].tagTypeClass).toBe("badge-secondary"); // Other
    });

    it("should add debtLevel and debtLevelClass to top scriptlet files", async () => {
      const rawData = createMockUiAnalysisData({
        topScriptletFiles: [
          {
            filePath: "high-debt.jsp",
            scriptletCount: 30,
            expressionCount: 10,
            declarationCount: 5,
            totalScriptletBlocks: 45, // > 20 = Very High
          },
          {
            filePath: "moderate-debt.jsp",
            scriptletCount: 8,
            expressionCount: 3,
            declarationCount: 1,
            totalScriptletBlocks: 12, // > 10 = High
          },
          {
            filePath: "low-debt.jsp",
            scriptletCount: 2,
            expressionCount: 1,
            declarationCount: 0,
            totalScriptletBlocks: 3, // <= 5 = Low
          },
        ],
      });

      const result = await section.prepareHtmlData(
        mockBaseData,
        { uiTechnologyAnalysis: rawData },
        "/tmp",
      );

      const files = result?.uiTechnologyAnalysis?.topScriptletFiles ?? [];

      expect(files[0].debtLevel).toBe("Very High");
      expect(files[0].debtLevelClass).toBe("badge-danger");

      expect(files[1].debtLevel).toBe("High");
      expect(files[1].debtLevelClass).toBe("badge-warning");

      expect(files[2].debtLevel).toBe("Low");
      expect(files[2].debtLevelClass).toBe("badge-success");
    });

    it("should preserve all raw data fields in the prepared output", async () => {
      const rawData = createMockUiAnalysisData({
        frameworks: [{ name: "Struts", version: "1.3", configFiles: ["struts-config.xml"] }],
        totalJspFiles: 10,
        totalScriptlets: 50,
        totalExpressions: 20,
        totalDeclarations: 5,
        averageScriptletsPerFile: 5,
        filesWithHighScriptletCount: 2,
      });

      const result = await section.prepareHtmlData(
        mockBaseData,
        { uiTechnologyAnalysis: rawData },
        "/tmp",
      );

      const prepared = result?.uiTechnologyAnalysis;
      expect(prepared?.frameworks).toEqual(rawData.frameworks);
      expect(prepared?.totalJspFiles).toBe(10);
      expect(prepared?.totalScriptlets).toBe(50);
      expect(prepared?.totalExpressions).toBe(20);
      expect(prepared?.totalDeclarations).toBe(5);
      expect(prepared?.averageScriptletsPerFile).toBe(5);
      expect(prepared?.filesWithHighScriptletCount).toBe(2);
    });

    it("should normalize undefined framework versions to placeholder value", async () => {
      const rawData = createMockUiAnalysisData({
        frameworks: [
          { name: "Struts", version: "1.3", configFiles: ["struts-config.xml"] },
          { name: "JSF", version: undefined, configFiles: ["faces-config.xml"] },
          { name: "Spring MVC", configFiles: ["spring-mvc.xml"] }, // version not provided
        ],
      });

      const result = await section.prepareHtmlData(
        mockBaseData,
        { uiTechnologyAnalysis: rawData },
        "/tmp",
      );

      const frameworks = result?.uiTechnologyAnalysis?.frameworks ?? [];
      expect(frameworks).toHaveLength(3);
      // Existing version should be preserved
      expect(frameworks[0].version).toBe("1.3");
      // Undefined versions should use the placeholder
      expect(frameworks[1].version).toBe(UNKNOWN_VALUE_PLACEHOLDER);
      expect(frameworks[2].version).toBe(UNKNOWN_VALUE_PLACEHOLDER);
    });

    it("should ensure all frameworks have a defined version for template rendering", async () => {
      const rawData = createMockUiAnalysisData({
        frameworks: [
          { name: "Framework1", version: undefined, configFiles: ["config1.xml"] },
          { name: "Framework2", configFiles: ["config2.xml"] },
        ],
      });

      const result = await section.prepareHtmlData(
        mockBaseData,
        { uiTechnologyAnalysis: rawData },
        "/tmp",
      );

      const frameworks = result?.uiTechnologyAnalysis?.frameworks ?? [];
      // All frameworks should have a defined version string (no undefined)
      frameworks.forEach((framework) => {
        expect(framework.version).toBeDefined();
        expect(typeof framework.version).toBe("string");
        expect(framework.version?.length).toBeGreaterThan(0);
      });
    });

    it("should add scriptletUsageInsight for no scriptlets", async () => {
      const rawData = createMockUiAnalysisData({
        totalScriptlets: 0,
        averageScriptletsPerFile: 0,
      });

      const result = await section.prepareHtmlData(
        mockBaseData,
        { uiTechnologyAnalysis: rawData },
        "/tmp",
      );

      expect(result?.uiTechnologyAnalysis?.scriptletUsageInsight).toBe(
        "No scriptlets detected - excellent! The codebase follows modern JSP best practices.",
      );
    });

    it("should add scriptletUsageInsight for low scriptlet usage", async () => {
      const rawData = createMockUiAnalysisData({
        totalScriptlets: 10,
        averageScriptletsPerFile: 2.5,
      });

      const result = await section.prepareHtmlData(
        mockBaseData,
        { uiTechnologyAnalysis: rawData },
        "/tmp",
      );

      expect(result?.uiTechnologyAnalysis?.scriptletUsageInsight).toBe(
        "Low scriptlet usage (2.5 per file). Consider further refactoring to eliminate remaining scriptlets.",
      );
    });

    it("should add scriptletUsageInsight for moderate scriptlet usage", async () => {
      const rawData = createMockUiAnalysisData({
        totalScriptlets: 50,
        averageScriptletsPerFile: 7.5,
      });

      const result = await section.prepareHtmlData(
        mockBaseData,
        { uiTechnologyAnalysis: rawData },
        "/tmp",
      );

      expect(result?.uiTechnologyAnalysis?.scriptletUsageInsight).toBe(
        "Moderate scriptlet usage (7.5 per file). Refactoring to tag libraries or modern UI framework recommended.",
      );
    });

    it("should add scriptletUsageInsight for high scriptlet usage", async () => {
      const rawData = createMockUiAnalysisData({
        totalScriptlets: 200,
        averageScriptletsPerFile: 15.0,
      });

      const result = await section.prepareHtmlData(
        mockBaseData,
        { uiTechnologyAnalysis: rawData },
        "/tmp",
      );

      expect(result?.uiTechnologyAnalysis?.scriptletUsageInsight).toBe(
        "High scriptlet usage (15.0 per file). Significant refactoring needed for modernization.",
      );
    });
  });

  describe("prepareJsonData", () => {
    const mockBaseData = {} as ReportData;

    it("should return raw data for JSON output (without CSS classes)", () => {
      const rawData = createMockUiAnalysisData({
        totalScriptlets: 200,
        filesWithHighScriptletCount: 5,
      });

      const result = section.prepareJsonData(mockBaseData, { uiTechnologyAnalysis: rawData });

      expect(result).toHaveLength(1);
      expect(result[0].filename).toBe("ui-technology-analysis.json");
      // JSON output should contain raw data without presentation fields
      const jsonData = result[0].data as UiTechnologyAnalysisData;
      expect(jsonData).not.toHaveProperty("totalScriptletsCssClass");
      expect(jsonData).not.toHaveProperty("showHighDebtAlert");
    });

    it("should return empty array when no UI analysis data", () => {
      const result = section.prepareJsonData(mockBaseData, {});

      expect(result).toEqual([]);
    });
  });
});
