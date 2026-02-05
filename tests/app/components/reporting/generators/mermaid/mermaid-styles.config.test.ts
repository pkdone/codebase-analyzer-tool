import {
  buildStyleDefinitions,
  type DiagramThemeConfig,
} from "../../../../../../src/app/components/reporting/diagrams/utils/mermaid-styles";
import { applyStyleClass } from "../../../../../../src/app/components/reporting/diagrams/utils";
import { BRAND_COLORS } from "../../../../../../src/app/components/reporting/config/brand-theme.config";

describe("mermaid-styles.config", () => {
  describe("buildStyleDefinitions", () => {
    it("should return a non-empty string", () => {
      const result = buildStyleDefinitions();

      expect(result).toBeDefined();
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });

    it("should include all domain model class definitions", () => {
      const result = buildStyleDefinitions();

      expect(result).toContain("classDef boundedContext");
      expect(result).toContain("classDef aggregate");
      expect(result).toContain("classDef entity");
      expect(result).toContain("classDef repository");
    });

    it("should include service and process class definitions", () => {
      const result = buildStyleDefinitions();

      expect(result).toContain("classDef service");
      expect(result).toContain("classDef process");
    });

    it("should include dependency class definitions", () => {
      const result = buildStyleDefinitions();

      expect(result).toContain("classDef dependency");
      expect(result).toContain("classDef rootDependency");
    });

    it("should include component class definitions", () => {
      const result = buildStyleDefinitions();

      expect(result).toContain("classDef internalComponent");
      expect(result).toContain("classDef externalComponent");
    });

    it("should include style properties for each class", () => {
      const result = buildStyleDefinitions();

      expect(result).toContain("fill:");
      expect(result).toContain("stroke:");
      expect(result).toContain("stroke-width:");
      expect(result).toContain("color:");
    });

    it("should use consistent text color from theme config", () => {
      const result = buildStyleDefinitions();

      // All classes should use the MongoDB dark color from the central theme config
      expect(result).toContain(`color:${BRAND_COLORS.black}`);
    });

    it("should have valid Mermaid classDef syntax", () => {
      const result = buildStyleDefinitions();

      // Each classDef should follow the pattern: classDef name style-properties
      expect(result).toMatch(/classDef\s+\w+\s+fill:/);
    });

    it("should use different fill colors for different element types", () => {
      const result = buildStyleDefinitions();

      // Check that different element types have visually distinct colors
      expect(result).toMatch(/boundedContext.*fill:#e8f5e8/);
      expect(result).toMatch(/aggregate.*fill:#e3f2fd/);
      expect(result).toMatch(/entity.*fill:#f3e5f5/);
      expect(result).toMatch(/repository.*fill:#fff5f0/);
    });

    it("should accept custom theme configuration", () => {
      const customConfig: DiagramThemeConfig = {
        brandColors: {
          greenDark: "#123456",
          black: "#000000",
          white: "#ffffff",
        },
      };

      const result = buildStyleDefinitions(customConfig);

      // Should use custom green dark color in strokes
      expect(result).toContain("stroke:#123456");
      // Should use custom black color for text
      expect(result).toContain("color:#000000");
    });

    it("should use default brand colors when no config provided", () => {
      const result = buildStyleDefinitions();

      // Should use default brand colors from BRAND_COLORS
      expect(result).toContain(`stroke:${BRAND_COLORS.greenDark}`);
      expect(result).toContain(`color:${BRAND_COLORS.black}`);
    });

    it("should allow partial theme configuration", () => {
      const partialConfig: DiagramThemeConfig = {
        brandColors: {
          greenDark: "#custom00",
          black: "#111111",
          white: "#eeeeee",
        },
        // elementColors and cssClasses use defaults
      };

      const result = buildStyleDefinitions(partialConfig);

      // Should use custom brand colors
      expect(result).toContain("stroke:#custom00");
      expect(result).toContain("color:#111111");
      // Should still use default element colors
      expect(result).toContain("fill:#e8f5e8"); // boundedContextFill default
    });
  });

  describe("applyStyleClass", () => {
    it("should apply style class to node", () => {
      const result = applyStyleClass("nodeId", "boundedContext");

      expect(result).toBe("    class nodeId boundedContext");
    });

    it("should have proper indentation (4 spaces)", () => {
      const result = applyStyleClass("nodeId", "aggregate");

      expect(result).toMatch(/^ {4}/);
    });

    it("should format correctly for different node IDs and classes", () => {
      expect(applyStyleClass("node1", "entity")).toBe("    class node1 entity");
      expect(applyStyleClass("my_node", "repository")).toBe("    class my_node repository");
      expect(applyStyleClass("service_1", "service")).toBe("    class service_1 service");
    });

    it("should work with all defined style classes", () => {
      const styleClasses = [
        "boundedContext",
        "aggregate",
        "entity",
        "repository",
        "service",
        "process",
        "dependency",
        "rootDependency",
        "internalComponent",
        "externalComponent",
      ];

      for (const styleClass of styleClasses) {
        const result = applyStyleClass("testNode", styleClass);
        expect(result).toBe(`    class testNode ${styleClass}`);
      }
    });

    it("should handle node IDs with underscores", () => {
      const result = applyStyleClass("node_with_underscores_123", "dependency");

      expect(result).toBe("    class node_with_underscores_123 dependency");
    });
  });
});
