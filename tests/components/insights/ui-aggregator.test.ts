import "reflect-metadata";
import { UiAggregator } from "../../../src/components/insights/ui-aggregator";
import { SourcesRepository } from "../../../src/repositories/source/sources.repository.interface";

describe("UiAggregator", () => {
  let aggregator: UiAggregator;
  let mockSourcesRepository: jest.Mocked<SourcesRepository>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSourcesRepository = {
      getProjectSourcesSummaries: jest.fn(),
    } as unknown as jest.Mocked<SourcesRepository>;

    aggregator = new UiAggregator(mockSourcesRepository);
  });

  describe("aggregateUiAnalysis", () => {
    it("should aggregate JSP metrics from multiple files", async () => {
      const mockSourceFiles = [
        {
          filepath: "webapp/pages/home.jsp",
          summary: {
            jspMetrics: {
              scriptletCount: 5,
              expressionCount: 10,
              declarationCount: 2,
              customTags: [
                { prefix: "c", uri: "http://java.sun.com/jsp/jstl/core" },
                { prefix: "fmt", uri: "http://java.sun.com/jsp/jstl/fmt" },
              ],
            },
          },
        },
        {
          filepath: "webapp/pages/login.jsp",
          summary: {
            jspMetrics: {
              scriptletCount: 8,
              expressionCount: 3,
              declarationCount: 1,
              customTags: [{ prefix: "c", uri: "http://java.sun.com/jsp/jstl/core" }],
            },
          },
        },
      ];

      mockSourcesRepository.getProjectSourcesSummaries.mockResolvedValue(mockSourceFiles as any);

      const result = await aggregator.aggregateUiAnalysis("test-project");

      expect(result.totalJspFiles).toBe(2);
      expect(result.totalScriptlets).toBe(13); // 5 + 8
      expect(result.totalExpressions).toBe(13); // 10 + 3
      expect(result.totalDeclarations).toBe(3); // 2 + 1
      expect(result.averageScriptletsPerFile).toBeCloseTo(6.5); // 13 / 2
      expect(result.filesWithHighScriptletCount).toBe(2); // Both files have >10 total blocks (home: 17, login: 12)
    });

    it("should detect and aggregate UI frameworks", async () => {
      const mockSourceFiles = [
        {
          filepath: "WEB-INF/web.xml",
          summary: {
            uiFramework: {
              name: "Struts",
              version: "1.3",
              configFile: "WEB-INF/web.xml",
            },
          },
        },
        {
          filepath: "WEB-INF/struts-config.xml",
          summary: {
            uiFramework: {
              name: "Struts",
              version: "1.3",
              configFile: "WEB-INF/struts-config.xml",
            },
          },
        },
      ];

      mockSourcesRepository.getProjectSourcesSummaries.mockResolvedValue(mockSourceFiles as any);

      const result = await aggregator.aggregateUiAnalysis("test-project");

      expect(result.frameworks).toHaveLength(1);
      expect(result.frameworks[0].name).toBe("Struts");
      expect(result.frameworks[0].version).toBe("1.3");
      expect(result.frameworks[0].configFiles).toHaveLength(2);
      expect(result.frameworks[0].configFiles).toContain("WEB-INF/web.xml");
      expect(result.frameworks[0].configFiles).toContain("WEB-INF/struts-config.xml");
    });

    it("should de-duplicate custom tag libraries and count usage", async () => {
      const mockSourceFiles = [
        {
          filepath: "page1.jsp",
          summary: {
            jspMetrics: {
              scriptletCount: 1,
              expressionCount: 1,
              declarationCount: 0,
              customTags: [
                { prefix: "c", uri: "http://java.sun.com/jsp/jstl/core" },
                { prefix: "fmt", uri: "http://java.sun.com/jsp/jstl/fmt" },
              ],
            },
          },
        },
        {
          filepath: "page2.jsp",
          summary: {
            jspMetrics: {
              scriptletCount: 2,
              expressionCount: 0,
              declarationCount: 0,
              customTags: [
                { prefix: "c", uri: "http://java.sun.com/jsp/jstl/core" },
                { prefix: "custom", uri: "/WEB-INF/custom.tld" },
              ],
            },
          },
        },
        {
          filepath: "page3.jsp",
          summary: {
            jspMetrics: {
              scriptletCount: 0,
              expressionCount: 0,
              declarationCount: 0,
              customTags: [{ prefix: "c", uri: "http://java.sun.com/jsp/jstl/core" }],
            },
          },
        },
      ];

      mockSourcesRepository.getProjectSourcesSummaries.mockResolvedValue(mockSourceFiles as any);

      const result = await aggregator.aggregateUiAnalysis("test-project");

      expect(result.customTagLibraries).toHaveLength(3);

      // JSTL core should be most used (3 files)
      const coreTag = result.customTagLibraries.find((t) => t.prefix === "c");
      expect(coreTag).toBeDefined();
      expect(coreTag?.usageCount).toBe(3);

      // JSTL fmt should be used once
      const fmtTag = result.customTagLibraries.find((t) => t.prefix === "fmt");
      expect(fmtTag).toBeDefined();
      expect(fmtTag?.usageCount).toBe(1);

      // Custom tag should be used once
      const customTag = result.customTagLibraries.find((t) => t.prefix === "custom");
      expect(customTag).toBeDefined();
      expect(customTag?.usageCount).toBe(1);
    });

    it("should identify top scriptlet files and sort correctly", async () => {
      const mockSourceFiles = [
        {
          filepath: "low-scriptlet.jsp",
          summary: {
            jspMetrics: {
              scriptletCount: 2,
              expressionCount: 1,
              declarationCount: 0,
              customTags: [],
            },
          },
        },
        {
          filepath: "high-scriptlet.jsp",
          summary: {
            jspMetrics: {
              scriptletCount: 20,
              expressionCount: 15,
              declarationCount: 5,
              customTags: [],
            },
          },
        },
        {
          filepath: "medium-scriptlet.jsp",
          summary: {
            jspMetrics: {
              scriptletCount: 10,
              expressionCount: 5,
              declarationCount: 2,
              customTags: [],
            },
          },
        },
      ];

      mockSourcesRepository.getProjectSourcesSummaries.mockResolvedValue(mockSourceFiles as any);

      const result = await aggregator.aggregateUiAnalysis("test-project");

      expect(result.topScriptletFiles).toHaveLength(3);
      // Should be sorted by total blocks descending
      expect(result.topScriptletFiles[0].filePath).toBe("high-scriptlet.jsp");
      expect(result.topScriptletFiles[0].totalScriptletBlocks).toBe(40); // 20 + 15 + 5
      expect(result.topScriptletFiles[1].filePath).toBe("medium-scriptlet.jsp");
      expect(result.topScriptletFiles[1].totalScriptletBlocks).toBe(17); // 10 + 5 + 2
      expect(result.topScriptletFiles[2].filePath).toBe("low-scriptlet.jsp");
      expect(result.topScriptletFiles[2].totalScriptletBlocks).toBe(3); // 2 + 1 + 0
    });

    it("should count files with high scriptlet count correctly", async () => {
      const mockSourceFiles = [
        {
          filepath: "file1.jsp",
          summary: {
            jspMetrics: {
              scriptletCount: 5,
              expressionCount: 3,
              declarationCount: 1,
              customTags: [],
            },
          },
        },
        {
          filepath: "file2.jsp",
          summary: {
            jspMetrics: {
              scriptletCount: 8,
              expressionCount: 3,
              declarationCount: 0,
              customTags: [],
            },
          },
        },
        {
          filepath: "file3.jsp",
          summary: {
            jspMetrics: {
              scriptletCount: 10,
              expressionCount: 5,
              declarationCount: 2,
              customTags: [],
            },
          },
        },
      ];

      mockSourcesRepository.getProjectSourcesSummaries.mockResolvedValue(mockSourceFiles as any);

      const result = await aggregator.aggregateUiAnalysis("test-project");

      // Only file2 (11 total) and file3 (17 total) have >10 scriptlet blocks
      expect(result.filesWithHighScriptletCount).toBe(2);
    });

    it("should handle empty project", async () => {
      mockSourcesRepository.getProjectSourcesSummaries.mockResolvedValue([]);

      const result = await aggregator.aggregateUiAnalysis("test-project");

      expect(result.frameworks).toHaveLength(0);
      expect(result.totalJspFiles).toBe(0);
      expect(result.totalScriptlets).toBe(0);
      expect(result.totalExpressions).toBe(0);
      expect(result.totalDeclarations).toBe(0);
      expect(result.averageScriptletsPerFile).toBe(0);
      expect(result.filesWithHighScriptletCount).toBe(0);
      expect(result.customTagLibraries).toHaveLength(0);
      expect(result.topScriptletFiles).toHaveLength(0);
    });

    it("should handle files without UI data", async () => {
      const mockSourceFiles = [
        {
          filepath: "src/Main.java",
          summary: {
            purpose: "Main application class",
          },
        },
        {
          filepath: "pom.xml",
          summary: {
            purpose: "Maven build file",
          },
        },
      ];

      mockSourcesRepository.getProjectSourcesSummaries.mockResolvedValue(mockSourceFiles as any);

      const result = await aggregator.aggregateUiAnalysis("test-project");

      expect(result.frameworks).toHaveLength(0);
      expect(result.totalJspFiles).toBe(0);
      expect(result.customTagLibraries).toHaveLength(0);
    });

    it("should handle multiple different frameworks", async () => {
      const mockSourceFiles = [
        {
          filepath: "WEB-INF/web.xml",
          summary: {
            uiFramework: {
              name: "Struts",
              version: "2.5",
              configFile: "WEB-INF/web.xml",
            },
          },
        },
        {
          filepath: "WEB-INF/faces-config.xml",
          summary: {
            uiFramework: {
              name: "JSF",
              version: "2.2",
              configFile: "WEB-INF/faces-config.xml",
            },
          },
        },
      ];

      mockSourcesRepository.getProjectSourcesSummaries.mockResolvedValue(mockSourceFiles as any);

      const result = await aggregator.aggregateUiAnalysis("test-project");

      expect(result.frameworks).toHaveLength(2);
      expect(result.frameworks.find((f) => f.name === "Struts")).toBeDefined();
      expect(result.frameworks.find((f) => f.name === "JSF")).toBeDefined();
    });

    it("should handle framework without version", async () => {
      const mockSourceFiles = [
        {
          filepath: "WEB-INF/web.xml",
          summary: {
            uiFramework: {
              name: "Spring MVC",
              configFile: "WEB-INF/web.xml",
            },
          },
        },
      ];

      mockSourcesRepository.getProjectSourcesSummaries.mockResolvedValue(mockSourceFiles as any);

      const result = await aggregator.aggregateUiAnalysis("test-project");

      expect(result.frameworks).toHaveLength(1);
      expect(result.frameworks[0].name).toBe("Spring MVC");
      expect(result.frameworks[0].version).toBeUndefined();
    });

    it("should limit top scriptlet files to top 10", async () => {
      const mockSourceFiles = Array.from({ length: 15 }, (_, i) => ({
        filepath: `file${i}.jsp`,
        summary: {
          jspMetrics: {
            scriptletCount: 15 - i, // Decreasing order
            expressionCount: 0,
            declarationCount: 0,
            customTags: [],
          },
        },
      }));

      mockSourcesRepository.getProjectSourcesSummaries.mockResolvedValue(mockSourceFiles as any);

      const result = await aggregator.aggregateUiAnalysis("test-project");

      expect(result.totalJspFiles).toBe(15);
      expect(result.topScriptletFiles).toHaveLength(10); // Should be limited to 10
      expect(result.topScriptletFiles[0].scriptletCount).toBe(15); // Highest
      expect(result.topScriptletFiles[9].scriptletCount).toBe(6); // 10th highest
    });

    it("should calculate average scriptlets per file correctly", async () => {
      const mockSourceFiles = [
        {
          filepath: "file1.jsp",
          summary: {
            jspMetrics: {
              scriptletCount: 10,
              expressionCount: 0,
              declarationCount: 0,
              customTags: [],
            },
          },
        },
        {
          filepath: "file2.jsp",
          summary: {
            jspMetrics: {
              scriptletCount: 20,
              expressionCount: 0,
              declarationCount: 0,
              customTags: [],
            },
          },
        },
        {
          filepath: "file3.jsp",
          summary: {
            jspMetrics: {
              scriptletCount: 30,
              expressionCount: 0,
              declarationCount: 0,
              customTags: [],
            },
          },
        },
      ];

      mockSourcesRepository.getProjectSourcesSummaries.mockResolvedValue(mockSourceFiles as any);

      const result = await aggregator.aggregateUiAnalysis("test-project");

      expect(result.totalScriptlets).toBe(60);
      expect(result.totalJspFiles).toBe(3);
      expect(result.averageScriptletsPerFile).toBeCloseTo(20); // 60 / 3
    });

    it("should sort custom tag libraries by usage count descending", async () => {
      const mockSourceFiles = [
        {
          filepath: "file1.jsp",
          summary: {
            jspMetrics: {
              scriptletCount: 0,
              expressionCount: 0,
              declarationCount: 0,
              customTags: [
                { prefix: "a", uri: "uri-a" }, // Used 1 time
                { prefix: "b", uri: "uri-b" }, // Used 3 times
                { prefix: "c", uri: "uri-c" }, // Used 2 times
              ],
            },
          },
        },
        {
          filepath: "file2.jsp",
          summary: {
            jspMetrics: {
              scriptletCount: 0,
              expressionCount: 0,
              declarationCount: 0,
              customTags: [
                { prefix: "b", uri: "uri-b" },
                { prefix: "c", uri: "uri-c" },
              ],
            },
          },
        },
        {
          filepath: "file3.jsp",
          summary: {
            jspMetrics: {
              scriptletCount: 0,
              expressionCount: 0,
              declarationCount: 0,
              customTags: [{ prefix: "b", uri: "uri-b" }],
            },
          },
        },
      ];

      mockSourcesRepository.getProjectSourcesSummaries.mockResolvedValue(mockSourceFiles as any);

      const result = await aggregator.aggregateUiAnalysis("test-project");

      expect(result.customTagLibraries).toHaveLength(3);
      expect(result.customTagLibraries[0].prefix).toBe("b"); // Most used (3)
      expect(result.customTagLibraries[0].usageCount).toBe(3);
      expect(result.customTagLibraries[1].prefix).toBe("c"); // Second (2)
      expect(result.customTagLibraries[1].usageCount).toBe(2);
      expect(result.customTagLibraries[2].prefix).toBe("a"); // Least (1)
      expect(result.customTagLibraries[2].usageCount).toBe(1);
    });
  });
});
