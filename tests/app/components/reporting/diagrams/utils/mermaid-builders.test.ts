/**
 * Tests for app-specific Mermaid diagram builder utilities.
 *
 * Core Mermaid utilities (escapeMermaidLabel, generateNodeId, buildArrow) are
 * tested in tests/common/diagrams/mermaid/mermaid-utils.test.ts.
 * This file tests only the app-specific functions.
 */

import {
  buildMermaidInitDirective,
  buildArchitectureInitDirective,
  generateEmptyDiagramSvg,
  // These are re-exported from common - verify they're accessible
  escapeMermaidLabel,
  generateNodeId,
  buildArrow,
} from "../../../../../../src/app/components/reporting/diagrams/utils/mermaid-builders";

describe("mermaid-builders (app-specific)", () => {
  describe("buildMermaidInitDirective", () => {
    it("should return a valid Mermaid init directive", () => {
      const directive = buildMermaidInitDirective();

      expect(directive).toMatch(/^%%\{init:/);
      expect(directive).toMatch(/\}%%$/);
      expect(directive).toContain("flowchart");
      expect(directive).toContain("diagramPadding");
    });

    it("should include numeric padding value", () => {
      const directive = buildMermaidInitDirective();

      // Should contain a numeric padding value
      expect(directive).toMatch(/diagramPadding.*\d+/);
    });
  });

  describe("buildArchitectureInitDirective", () => {
    it("should return a valid Mermaid init directive", () => {
      const directive = buildArchitectureInitDirective();

      expect(directive).toMatch(/^%%\{init:/);
      expect(directive).toMatch(/\}%%$/);
      expect(directive).toContain("flowchart");
    });

    it("should include architecture-specific spacing configuration", () => {
      const directive = buildArchitectureInitDirective();

      expect(directive).toContain("diagramPadding");
      expect(directive).toContain("nodeSpacing");
      expect(directive).toContain("rankSpacing");
    });
  });

  describe("generateEmptyDiagramSvg", () => {
    it("should return a valid SVG element", () => {
      const svg = generateEmptyDiagramSvg("Test message");

      expect(svg).toMatch(/^<svg/);
      expect(svg).toMatch(/<\/svg>$/);
    });

    it("should include the provided message", () => {
      const message = "No data available";
      const svg = generateEmptyDiagramSvg(message);

      expect(svg).toContain(message);
    });

    it("should include width and height attributes", () => {
      const svg = generateEmptyDiagramSvg("Test");

      expect(svg).toContain('width="');
      expect(svg).toContain('height="');
    });

    it("should include styling attributes", () => {
      const svg = generateEmptyDiagramSvg("Test");

      expect(svg).toContain("background-color:");
      expect(svg).toContain("border-radius:");
    });

    it("should contain a text element", () => {
      const svg = generateEmptyDiagramSvg("Test message");

      expect(svg).toContain("<text");
      expect(svg).toContain("</text>");
    });
  });

  describe("re-exported common utilities", () => {
    it("should re-export escapeMermaidLabel", () => {
      expect(typeof escapeMermaidLabel).toBe("function");
      expect(escapeMermaidLabel("test")).toBe("test");
      expect(escapeMermaidLabel("<test>")).toBe("#lt;test#gt;");
    });

    it("should re-export generateNodeId", () => {
      expect(typeof generateNodeId).toBe("function");
      expect(generateNodeId("Service", 0)).toBe("service_0");
    });

    it("should re-export buildArrow", () => {
      expect(typeof buildArrow).toBe("function");
      expect(buildArrow("a", "b")).toContain("-->");
    });
  });
});
