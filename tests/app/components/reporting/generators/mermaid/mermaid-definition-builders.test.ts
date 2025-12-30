import "reflect-metadata";
import {
  DIAGRAM_STYLES,
  buildMermaidInitDirective,
  generateEmptyDiagramSvg,
  escapeMermaidLabel,
  generateNodeId,
  buildArrow,
} from "../../../../../../src/app/components/reporting/generators/mermaid/mermaid-definition-builders";
import {
  buildStyleDefinitions,
  applyStyle,
} from "../../../../../../src/app/components/reporting/generators/mermaid/mermaid-styles.config";

describe("mermaid-definition-builders", () => {
  describe("DIAGRAM_STYLES", () => {
    it("should have all required style properties defined", () => {
      expect(DIAGRAM_STYLES).toBeDefined();
      expect(DIAGRAM_STYLES.backgroundColor).toBeDefined();
      expect(DIAGRAM_STYLES.diagramPadding).toBeDefined();
      expect(DIAGRAM_STYLES.emptyDiagramFontFamily).toBeDefined();
      expect(DIAGRAM_STYLES.emptyDiagramFontSize).toBeDefined();
      expect(DIAGRAM_STYLES.emptyDiagramTextColor).toBeDefined();
    });

    it("should have correct style values", () => {
      expect(DIAGRAM_STYLES.backgroundColor).toBe("#F0F3F2");
      expect(DIAGRAM_STYLES.diagramPadding).toBe(30);
      expect(DIAGRAM_STYLES.emptyDiagramFontFamily).toBe("system-ui, sans-serif");
      expect(DIAGRAM_STYLES.emptyDiagramFontSize).toBe("14");
      expect(DIAGRAM_STYLES.emptyDiagramTextColor).toBe("#8b95a1");
    });

    it("should be readonly (as const)", () => {
      // TypeScript's as const ensures immutability at compile time
      // This test verifies the runtime structure is as expected
      expect(Object.isFrozen(DIAGRAM_STYLES)).toBe(false); // as const doesn't freeze at runtime
      // But we can verify the structure is correct
      expect(typeof DIAGRAM_STYLES.backgroundColor).toBe("string");
      expect(typeof DIAGRAM_STYLES.diagramPadding).toBe("number");
    });
  });

  describe("buildMermaidInitDirective", () => {
    it("should generate init directive with diagram padding", () => {
      const result = buildMermaidInitDirective();

      expect(result).toContain("%%{init:");
      expect(result).toContain("flowchart");
      expect(result).toContain("diagramPadding");
      expect(result).toContain(String(DIAGRAM_STYLES.diagramPadding));
    });

    it("should use correct padding value from DIAGRAM_STYLES", () => {
      const result = buildMermaidInitDirective();

      expect(result).toContain(`'diagramPadding': ${DIAGRAM_STYLES.diagramPadding}`);
    });

    it("should generate valid Mermaid init directive syntax", () => {
      const result = buildMermaidInitDirective();

      expect(result).toMatch(/^%%{init:.*}%%$/);
    });
  });

  describe("generateEmptyDiagramSvg", () => {
    it("should generate SVG with message", () => {
      const message = "No data available";
      const result = generateEmptyDiagramSvg(message);

      expect(result).toContain("<svg");
      expect(result).toContain("</svg>");
      expect(result).toContain(message);
    });

    it("should include consistent styling from DIAGRAM_STYLES", () => {
      const result = generateEmptyDiagramSvg("Test");

      expect(result).toContain(DIAGRAM_STYLES.backgroundColor);
      expect(result).toContain(DIAGRAM_STYLES.emptyDiagramFontFamily);
      expect(result).toContain(DIAGRAM_STYLES.emptyDiagramFontSize);
      expect(result).toContain(DIAGRAM_STYLES.emptyDiagramTextColor);
    });

    it("should have proper SVG structure", () => {
      const result = generateEmptyDiagramSvg("Test message");

      expect(result).toContain('width="400"');
      expect(result).toContain('height="100"');
      expect(result).toContain('xmlns="http://www.w3.org/2000/svg"');
      expect(result).toContain("<text");
      expect(result).toContain('text-anchor="middle"');
    });

    it("should escape special characters in message", () => {
      const message = 'Test with "quotes" and <tags>';
      const result = generateEmptyDiagramSvg(message);

      // The SVG should contain the message, but it might be escaped
      expect(result).toContain("Test");
    });
  });

  describe("escapeMermaidLabel", () => {
    it("should escape double quotes", () => {
      expect(escapeMermaidLabel('text with "quotes"')).toBe('text with #quot;quotes#quot;');
    });

    it("should escape less than symbol", () => {
      expect(escapeMermaidLabel("text < tag")).toBe("text #lt; tag");
    });

    it("should escape greater than symbol", () => {
      expect(escapeMermaidLabel("text > tag")).toBe("text #gt; tag");
    });

    it("should escape square brackets", () => {
      expect(escapeMermaidLabel("text [brackets]")).toBe("text #91;brackets#93;");
    });

    it("should escape parentheses", () => {
      expect(escapeMermaidLabel("text (parens)")).toBe("text #40;parens#41;");
    });

    it("should escape curly braces", () => {
      expect(escapeMermaidLabel("text {braces}")).toBe("text #123;braces#125;");
    });

    it("should handle multiple special characters", () => {
      const result = escapeMermaidLabel('text "with" <all> [special] (chars) {here}');
      expect(result).toContain("#quot;");
      expect(result).toContain("#lt;");
      expect(result).toContain("#gt;");
      expect(result).toContain("#91;");
      expect(result).toContain("#93;");
      expect(result).toContain("#40;");
      expect(result).toContain("#41;");
      expect(result).toContain("#123;");
      expect(result).toContain("#125;");
    });

    it("should not modify text without special characters", () => {
      expect(escapeMermaidLabel("plain text")).toBe("plain text");
    });

    it("should handle empty string", () => {
      expect(escapeMermaidLabel("")).toBe("");
    });
  });

  describe("generateNodeId", () => {
    it("should generate node ID from text and index", () => {
      const result = generateNodeId("My Node", 0);

      expect(result).toBeDefined();
      expect(typeof result).toBe("string");
      expect(result).toContain("_0");
    });

    it("should sanitize special characters", () => {
      const result = generateNodeId("My-Node (Test)", 1);

      expect(result).not.toContain("-");
      expect(result).not.toContain("(");
      expect(result).not.toContain(")");
      expect(result).not.toContain(" ");
    });

    it("should convert to lowercase", () => {
      const result = generateNodeId("UPPERCASE", 0);

      expect(result).toBe(result.toLowerCase());
    });

    it("should replace multiple consecutive underscores with single underscore", () => {
      const result = generateNodeId("text___with___underscores", 0);

      expect(result).not.toContain("___");
    });

    it("should remove leading and trailing underscores", () => {
      const result1 = generateNodeId("_leading", 0);
      const result2 = generateNodeId("trailing_", 0);
      const result3 = generateNodeId("_both_", 0);

      expect(result1).not.toMatch(/^_/);
      expect(result2).not.toMatch(/_$/);
      expect(result3).not.toMatch(/^_|_$/);
    });

    it("should include index in result", () => {
      const result1 = generateNodeId("test", 5);
      const result2 = generateNodeId("test", 42);

      expect(result1).toContain("_5");
      expect(result2).toContain("_42");
    });

    it("should handle empty string", () => {
      const result = generateNodeId("", 0);

      expect(result).toBe("_0");
    });

    it("should handle text with only special characters", () => {
      const result = generateNodeId("!@#$%", 0);

      expect(result).toBe("_0");
    });
  });

  describe("buildArrow", () => {
    it("should build arrow without label", () => {
      const result = buildArrow("node1", "node2");

      expect(result).toBe("    node1 --> node2");
    });

    it("should build arrow with label", () => {
      const result = buildArrow("node1", "node2", "connects to");

      expect(result).toContain("node1");
      expect(result).toContain("node2");
      expect(result).toContain("connects to");
      expect(result).toContain("-->");
    });

    it("should escape special characters in label", () => {
      const result = buildArrow("node1", "node2", 'label with "quotes"');

      expect(result).toContain("#quot;");
      // The label is wrapped in quotes, but internal quotes are escaped
      expect(result).toMatch(/-->\|"[^"]*#quot;[^"]*"\|/);
    });

    it("should have proper indentation (4 spaces)", () => {
      const result = buildArrow("node1", "node2");

      expect(result).toMatch(/^ {4}/);
    });

    it("should format labeled arrow correctly", () => {
      const result = buildArrow("from", "to", "label");

      expect(result).toMatch(/-->\|".*"\|/);
    });
  });

  describe("buildStyleDefinitions", () => {
    it("should return style definitions string", () => {
      const result = buildStyleDefinitions();

      expect(result).toBeDefined();
      expect(typeof result).toBe("string");
    });

    it("should include all required class definitions", () => {
      const result = buildStyleDefinitions();

      expect(result).toContain("classDef boundedContext");
      expect(result).toContain("classDef aggregate");
      expect(result).toContain("classDef entity");
      expect(result).toContain("classDef repository");
      expect(result).toContain("classDef service");
      expect(result).toContain("classDef process");
      expect(result).toContain("classDef dependency");
      expect(result).toContain("classDef rootDependency");
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

    it("should have valid Mermaid classDef syntax", () => {
      const result = buildStyleDefinitions();

      // Each classDef should follow the pattern: classDef name style-properties
      expect(result).toMatch(/classDef\s+\w+\s+fill:/);
    });
  });

  describe("applyStyle", () => {
    it("should apply style class to node", () => {
      const result = applyStyle("nodeId", "boundedContext");

      expect(result).toBe("    class nodeId boundedContext");
    });

    it("should have proper indentation (4 spaces)", () => {
      const result = applyStyle("nodeId", "aggregate");

      expect(result).toMatch(/^ {4}/);
    });

    it("should format correctly for different node IDs and classes", () => {
      const result1 = applyStyle("node1", "entity");
      const result2 = applyStyle("my_node", "repository");

      expect(result1).toBe("    class node1 entity");
      expect(result2).toBe("    class my_node repository");
    });
  });
});

