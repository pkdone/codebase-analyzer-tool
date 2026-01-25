import "reflect-metadata";
import { JavaFrameworkAnalyzer } from "../../../../../../../src/app/components/reporting/sections/ui-analysis/analyzers/java-framework-analyzer";
import type { ProjectedSourceSummaryFields } from "../../../../../../../src/app/repositories/sources/sources.model";

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
 * Helper function to create mock source file without UI framework data.
 */
function createMockNonFrameworkFile(filepath: string): ProjectedSourceSummaryFields {
  return {
    filepath,
    summary: {
      purpose: "Source file",
      implementation: "Java",
    } as ProjectedSourceSummaryFields["summary"],
  };
}

describe("JavaFrameworkAnalyzer", () => {
  let analyzer: JavaFrameworkAnalyzer;

  beforeEach(() => {
    analyzer = new JavaFrameworkAnalyzer();
  });

  describe("analyzeFrameworks", () => {
    it("should return empty array when no source files provided", () => {
      const result = analyzer.analyzeFrameworks([]);

      expect(result).toEqual([]);
    });

    it("should return empty array when no files have UI framework data", () => {
      const sourceFiles = [
        createMockNonFrameworkFile("src/Main.java"),
        createMockNonFrameworkFile("src/Service.java"),
      ];

      const result = analyzer.analyzeFrameworks(sourceFiles);

      expect(result).toEqual([]);
    });

    it("should detect a single framework from configuration file", () => {
      const sourceFiles = [
        createMockFrameworkFile("struts-config.xml", {
          name: "Struts",
          version: "1.3.10",
          configFile: "struts-config.xml",
        }),
      ];

      const result = analyzer.analyzeFrameworks(sourceFiles);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        name: "Struts",
        version: "1.3.10",
        configFiles: ["struts-config.xml"],
      });
    });

    it("should aggregate multiple frameworks from different configuration files", () => {
      const sourceFiles = [
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
      ];

      const result = analyzer.analyzeFrameworks(sourceFiles);

      expect(result).toHaveLength(2);
      expect(result.map((f) => f.name)).toContain("Struts");
      expect(result.map((f) => f.name)).toContain("JSF");
    });

    it("should aggregate same framework from multiple config files", () => {
      const sourceFiles = [
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
      ];

      const result = analyzer.analyzeFrameworks(sourceFiles);

      expect(result).toHaveLength(1);
      expect(result[0].configFiles).toHaveLength(2);
      expect(result[0].configFiles).toContain("module1/struts-config.xml");
      expect(result[0].configFiles).toContain("module2/struts-config.xml");
    });

    it("should treat frameworks with different versions as separate entries", () => {
      const sourceFiles = [
        createMockFrameworkFile("old/struts-config.xml", {
          name: "Struts",
          version: "1.2.9",
          configFile: "old/struts-config.xml",
        }),
        createMockFrameworkFile("new/struts-config.xml", {
          name: "Struts",
          version: "1.3.10",
          configFile: "new/struts-config.xml",
        }),
      ];

      const result = analyzer.analyzeFrameworks(sourceFiles);

      expect(result).toHaveLength(2);
    });

    it("should handle framework with undefined version", () => {
      const sourceFiles = [
        createMockFrameworkFile("config.xml", {
          name: "Unknown Framework",
          version: undefined,
          configFile: "config.xml",
        }),
      ];

      const result = analyzer.analyzeFrameworks(sourceFiles);

      expect(result).toHaveLength(1);
      expect(result[0].version).toBeUndefined();
    });

    it("should sort frameworks alphabetically by name", () => {
      const sourceFiles = [
        createMockFrameworkFile("spring.xml", {
          name: "Spring MVC",
          version: "5.0",
          configFile: "spring.xml",
        }),
        createMockFrameworkFile("faces.xml", {
          name: "JSF",
          version: "2.0",
          configFile: "faces.xml",
        }),
        createMockFrameworkFile("struts.xml", {
          name: "Struts",
          version: "1.3",
          configFile: "struts.xml",
        }),
      ];

      const result = analyzer.analyzeFrameworks(sourceFiles);

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe("JSF");
      expect(result[1].name).toBe("Spring MVC");
      expect(result[2].name).toBe("Struts");
    });

    it("should filter out files without uiFramework data in summary", () => {
      const sourceFiles = [
        createMockFrameworkFile("struts-config.xml", {
          name: "Struts",
          version: "1.3",
          configFile: "struts-config.xml",
        }),
        createMockNonFrameworkFile("src/Main.java"),
        { filepath: "empty.xml", summary: undefined },
      ];

      const result = analyzer.analyzeFrameworks(sourceFiles);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Struts");
    });
  });
});
