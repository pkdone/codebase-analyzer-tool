import "reflect-metadata";
import { JspMetricsAnalyzer } from "../../../../../../../src/app/components/reporting/sections/ui-analysis/analyzers/jsp-metrics-analyzer";
import type { ProjectedSourceSummaryFields } from "../../../../../../../src/app/repositories/sources/sources.model";

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

/**
 * Helper function to create mock source file without JSP metrics.
 */
function createMockNonJspFile(filepath: string): ProjectedSourceSummaryFields {
  return {
    filepath,
    summary: {
      purpose: "Source file",
      implementation: "Java",
    } as ProjectedSourceSummaryFields["summary"],
  };
}

describe("JspMetricsAnalyzer", () => {
  let analyzer: JspMetricsAnalyzer;

  beforeEach(() => {
    analyzer = new JspMetricsAnalyzer();
  });

  describe("analyzeJspMetrics", () => {
    it("should return zero totals when no source files provided", () => {
      const result = analyzer.analyzeJspMetrics([]);

      expect(result.totalScriptlets).toBe(0);
      expect(result.totalExpressions).toBe(0);
      expect(result.totalDeclarations).toBe(0);
      expect(result.filesWithHighScriptletCount).toBe(0);
      expect(result.jspFileMetrics).toEqual([]);
      expect(result.tagLibraryMap.size).toBe(0);
    });

    it("should return zero totals when no files have JSP metrics", () => {
      const sourceFiles = [
        createMockNonJspFile("src/Main.java"),
        createMockNonJspFile("src/Service.java"),
      ];

      const result = analyzer.analyzeJspMetrics(sourceFiles);

      expect(result.totalScriptlets).toBe(0);
      expect(result.jspFileMetrics).toEqual([]);
    });

    it("should calculate JSP metrics totals from single file", () => {
      const sourceFiles = [
        createMockJspFile("page.jsp", {
          scriptletCount: 5,
          expressionCount: 3,
          declarationCount: 1,
        }),
      ];

      const result = analyzer.analyzeJspMetrics(sourceFiles);

      expect(result.totalScriptlets).toBe(5);
      expect(result.totalExpressions).toBe(3);
      expect(result.totalDeclarations).toBe(1);
      expect(result.jspFileMetrics).toHaveLength(1);
    });

    it("should aggregate JSP metrics totals from multiple files", () => {
      const sourceFiles = [
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
      ];

      const result = analyzer.analyzeJspMetrics(sourceFiles);

      expect(result.totalScriptlets).toBe(15);
      expect(result.totalExpressions).toBe(5);
      expect(result.totalDeclarations).toBe(1);
      expect(result.jspFileMetrics).toHaveLength(2);
    });

    it("should calculate total scriptlet blocks per file", () => {
      const sourceFiles = [
        createMockJspFile("page.jsp", {
          scriptletCount: 5,
          expressionCount: 3,
          declarationCount: 2,
        }),
      ];

      const result = analyzer.analyzeJspMetrics(sourceFiles);

      expect(result.jspFileMetrics[0].totalScriptletBlocks).toBe(10);
    });

    it("should count files with high scriptlet count", () => {
      const sourceFiles = [
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
      ];

      const result = analyzer.analyzeJspMetrics(sourceFiles);

      // Files exceeding HIGH_SCRIPTLET_THRESHOLD (default 10) are counted
      expect(result.filesWithHighScriptletCount).toBeGreaterThan(0);
    });

    it("should aggregate custom tag libraries", () => {
      const sourceFiles = [
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
      ];

      const result = analyzer.analyzeJspMetrics(sourceFiles);

      expect(result.tagLibraryMap.size).toBe(2);
      const coreLib = result.tagLibraryMap.get("c:http://java.sun.com/jsp/jstl/core");
      expect(coreLib?.usageCount).toBe(2);
    });

    it("should handle JSP files without custom tags", () => {
      const sourceFiles = [
        createMockJspFile("page.jsp", {
          scriptletCount: 5,
          expressionCount: 0,
          declarationCount: 0,
        }),
      ];

      const result = analyzer.analyzeJspMetrics(sourceFiles);

      expect(result.tagLibraryMap.size).toBe(0);
    });

    it("should handle JSP files with empty custom tags array", () => {
      const sourceFiles = [
        createMockJspFile("page.jsp", {
          scriptletCount: 5,
          expressionCount: 0,
          declarationCount: 0,
          customTags: [],
        }),
      ];

      const result = analyzer.analyzeJspMetrics(sourceFiles);

      expect(result.tagLibraryMap.size).toBe(0);
    });

    it("should deduplicate tag libraries by URI within the same file", () => {
      // A file may have duplicate taglib directives - each should count as one usage
      const sourceFiles = [
        createMockJspFile("page.jsp", {
          scriptletCount: 0,
          expressionCount: 0,
          declarationCount: 0,
          customTags: [
            { prefix: "c", uri: "http://java.sun.com/jsp/jstl/core" },
            { prefix: "c", uri: "http://java.sun.com/jsp/jstl/core" }, // Duplicate
            { prefix: "c", uri: "http://java.sun.com/jsp/jstl/core" }, // Another duplicate
          ],
        }),
      ];

      const result = analyzer.analyzeJspMetrics(sourceFiles);

      expect(result.tagLibraryMap.size).toBe(1);
      const coreLib = result.tagLibraryMap.get("c:http://java.sun.com/jsp/jstl/core");
      // Should count as 1 usage (one file), not 3
      expect(coreLib?.usageCount).toBe(1);
    });

    it("should count separate file usages correctly even with duplicates within files", () => {
      const sourceFiles = [
        createMockJspFile("page1.jsp", {
          scriptletCount: 0,
          expressionCount: 0,
          declarationCount: 0,
          customTags: [
            { prefix: "c", uri: "http://java.sun.com/jsp/jstl/core" },
            { prefix: "c", uri: "http://java.sun.com/jsp/jstl/core" }, // Duplicate in file 1
          ],
        }),
        createMockJspFile("page2.jsp", {
          scriptletCount: 0,
          expressionCount: 0,
          declarationCount: 0,
          customTags: [{ prefix: "c", uri: "http://java.sun.com/jsp/jstl/core" }],
        }),
      ];

      const result = analyzer.analyzeJspMetrics(sourceFiles);

      const coreLib = result.tagLibraryMap.get("c:http://java.sun.com/jsp/jstl/core");
      // Should count as 2 usages (two files), not 3
      expect(coreLib?.usageCount).toBe(2);
    });
  });

  describe("getTopScriptletFiles", () => {
    it("should return empty array when no metrics provided", () => {
      const result = analyzer.getTopScriptletFiles([]);

      expect(result).toEqual([]);
    });

    it("should sort files by total scriptlet blocks descending", () => {
      const metrics = [
        {
          filePath: "low.jsp",
          scriptletCount: 2,
          expressionCount: 1,
          declarationCount: 0,
          totalScriptletBlocks: 3,
        },
        {
          filePath: "high.jsp",
          scriptletCount: 50,
          expressionCount: 20,
          declarationCount: 5,
          totalScriptletBlocks: 75,
        },
        {
          filePath: "medium.jsp",
          scriptletCount: 10,
          expressionCount: 5,
          declarationCount: 2,
          totalScriptletBlocks: 17,
        },
      ];

      const result = analyzer.getTopScriptletFiles(metrics);

      expect(result[0].filePath).toBe("high.jsp");
      expect(result[1].filePath).toBe("medium.jsp");
      expect(result[2].filePath).toBe("low.jsp");
    });

    it("should limit results to configured maximum", () => {
      // Create more files than the limit
      const metrics = Array.from({ length: 100 }, (_, i) => ({
        filePath: `page${i}.jsp`,
        scriptletCount: i,
        expressionCount: 0,
        declarationCount: 0,
        totalScriptletBlocks: i,
      }));

      const result = analyzer.getTopScriptletFiles(metrics);

      // Should be limited (default TOP_FILES_LIMIT is typically 10-20)
      expect(result.length).toBeLessThanOrEqual(20);
    });

    it("should not mutate the input array", () => {
      const metrics = [
        {
          filePath: "b.jsp",
          scriptletCount: 10,
          expressionCount: 0,
          declarationCount: 0,
          totalScriptletBlocks: 10,
        },
        {
          filePath: "a.jsp",
          scriptletCount: 5,
          expressionCount: 0,
          declarationCount: 0,
          totalScriptletBlocks: 5,
        },
      ];

      const originalFirst = metrics[0].filePath;
      analyzer.getTopScriptletFiles(metrics);

      expect(metrics[0].filePath).toBe(originalFirst);
    });
  });

  describe("computeTagLibraries", () => {
    it("should return empty array when tag library map is empty", () => {
      const result = analyzer.computeTagLibraries(new Map());

      expect(result).toEqual([]);
    });

    it("should add type classification to tag libraries", () => {
      const tagLibraryMap = new Map([
        [
          "c:http://java.sun.com/jsp/jstl/core",
          { prefix: "c", uri: "http://java.sun.com/jsp/jstl/core", usageCount: 5 },
        ],
        [
          "spring:http://springframework.org/tags",
          { prefix: "spring", uri: "http://springframework.org/tags", usageCount: 3 },
        ],
      ]);

      const result = analyzer.computeTagLibraries(tagLibraryMap);

      expect(result).toHaveLength(2);
      const jstlLib = result.find((t) => t.prefix === "c");
      expect(jstlLib?.tagType).toBe("JSTL");

      const springLib = result.find((t) => t.prefix === "spring");
      expect(springLib?.tagType).toBe("Spring");
    });

    it("should sort tag libraries by usage count descending", () => {
      const tagLibraryMap = new Map([
        ["a:http://example.com/a", { prefix: "a", uri: "http://example.com/a", usageCount: 1 }],
        ["b:http://example.com/b", { prefix: "b", uri: "http://example.com/b", usageCount: 5 }],
        ["c:http://example.com/c", { prefix: "c", uri: "http://example.com/c", usageCount: 3 }],
      ]);

      const result = analyzer.computeTagLibraries(tagLibraryMap);

      expect(result[0].prefix).toBe("b");
      expect(result[0].usageCount).toBe(5);
      expect(result[1].prefix).toBe("c");
      expect(result[2].prefix).toBe("a");
    });

    it("should sort by prefix alphabetically when usage counts are equal", () => {
      const tagLibraryMap = new Map([
        ["z:http://example.com/z", { prefix: "z", uri: "http://example.com/z", usageCount: 2 }],
        ["a:http://example.com/a", { prefix: "a", uri: "http://example.com/a", usageCount: 2 }],
        ["m:http://example.com/m", { prefix: "m", uri: "http://example.com/m", usageCount: 2 }],
      ]);

      const result = analyzer.computeTagLibraries(tagLibraryMap);

      expect(result[0].prefix).toBe("a");
      expect(result[1].prefix).toBe("m");
      expect(result[2].prefix).toBe("z");
    });
  });
});
