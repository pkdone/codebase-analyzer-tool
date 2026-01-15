import "reflect-metadata";
import {
  BaseDiagramGenerator,
  type BaseDiagramOptions,
  type DiagramInitDirectiveType,
  DIAGRAM_STYLES,
} from "../../../../../../src/app/components/reporting/diagrams";

interface TestDiagramOptions extends BaseDiagramOptions {
  customOption?: string;
}

// Concrete implementation for testing the abstract class
class TestDiagramGeneratorImpl extends BaseDiagramGenerator<TestDiagramOptions> {
  protected readonly defaultOptions: Required<TestDiagramOptions> = {
    width: 800,
    height: 600,
    customOption: "default",
  };

  // Expose protected methods for testing
  testGenerateEmptyDiagram(message: string): string {
    return this.generateEmptyDiagram(message);
  }

  testWrapForClientRendering(definition: string): string {
    return this.wrapForClientRendering(definition);
  }

  testMergeOptions(options: TestDiagramOptions): Required<TestDiagramOptions> {
    return this.mergeOptions(options);
  }

  testInitializeDiagram(
    graphDeclaration: string,
    directiveType?: DiagramInitDirectiveType,
  ): string[] {
    return this.initializeDiagram(graphDeclaration, directiveType);
  }

  getDefaultOptions(): Required<TestDiagramOptions> {
    return this.defaultOptions;
  }
}

describe("BaseDiagramGenerator", () => {
  let generator: TestDiagramGeneratorImpl;

  beforeEach(() => {
    generator = new TestDiagramGeneratorImpl();
  });

  describe("constructor", () => {
    it("should create an instance", () => {
      expect(generator).toBeDefined();
    });
  });

  describe("defaultOptions", () => {
    it("should have default width and height defined", () => {
      const defaults = generator.getDefaultOptions();

      expect(defaults.width).toBeDefined();
      expect(defaults.height).toBeDefined();
      expect(defaults.width).toBe(800);
      expect(defaults.height).toBe(600);
    });
  });

  describe("generateEmptyDiagram", () => {
    it("should return SVG string with message", () => {
      const result = generator.testGenerateEmptyDiagram("No data available");

      expect(result).toContain("<svg");
      expect(result).toContain("</svg>");
      expect(result).toContain("No data available");
    });

    it("should include consistent styling from DIAGRAM_STYLES", () => {
      const result = generator.testGenerateEmptyDiagram("Test message");

      expect(result).toContain(DIAGRAM_STYLES.backgroundColor);
    });
  });

  describe("wrapForClientRendering", () => {
    it("should wrap definition in pre tag with mermaid and mermaid-diagram classes", () => {
      const definition = "flowchart TB\n    A --> B";
      const result = generator.testWrapForClientRendering(definition);

      expect(result).toContain('<pre class="mermaid mermaid-diagram">');
      expect(result).toContain(definition);
      expect(result).toContain("</pre>");
    });

    it("should use CSS class for styling instead of inline styles", () => {
      const definition = "flowchart TB";
      const result = generator.testWrapForClientRendering(definition);

      // Styling is now handled via .mermaid-diagram CSS class in style.css
      expect(result).toContain("mermaid-diagram");
      // Should NOT contain inline styles - they're in the CSS file
      expect(result).not.toContain("style=");
    });
  });

  describe("mergeOptions", () => {
    it("should use defaults when no options provided", () => {
      const result = generator.testMergeOptions({});

      expect(result.width).toBe(800);
      expect(result.height).toBe(600);
      expect(result.customOption).toBe("default");
    });

    it("should override defaults with provided options", () => {
      const result = generator.testMergeOptions({
        width: 1200,
        height: 800,
      });

      expect(result.width).toBe(1200);
      expect(result.height).toBe(800);
      expect(result.customOption).toBe("default"); // Not overridden
    });

    it("should handle partial options", () => {
      const result = generator.testMergeOptions({
        width: 1000,
      });

      expect(result.width).toBe(1000);
      expect(result.height).toBe(600); // Default
      expect(result.customOption).toBe("default"); // Default
    });

    it("should handle custom options", () => {
      const result = generator.testMergeOptions({
        customOption: "custom value",
      });

      expect(result.customOption).toBe("custom value");
      expect(result.width).toBe(800); // Default
    });
  });

  describe("initializeDiagram", () => {
    it("should return array with init directive, graph declaration, and styles", () => {
      const result = generator.testInitializeDiagram("flowchart TB");

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(3);
      expect(result[0]).toContain("%%{init:"); // Mermaid init directive
      expect(result[1]).toBe("flowchart TB"); // Graph declaration
      expect(result[2]).toContain("classDef"); // Style definitions
    });

    it("should use standard init directive by default", () => {
      const result = generator.testInitializeDiagram("flowchart LR");

      expect(result[0]).toContain("%%{init:");
    });

    it("should use architecture init directive when specified", () => {
      const result = generator.testInitializeDiagram("flowchart TB", "architecture");

      expect(result[0]).toContain("%%{init:");
      // Architecture directive should have specific padding settings
    });

    it("should preserve graph declaration exactly as provided", () => {
      const graphDeclaration = "graph LR";
      const result = generator.testInitializeDiagram(graphDeclaration);

      expect(result[1]).toBe(graphDeclaration);
    });

    it("should work with different graph types", () => {
      const tbResult = generator.testInitializeDiagram("flowchart TB");
      const lrResult = generator.testInitializeDiagram("flowchart LR");
      const graphResult = generator.testInitializeDiagram("graph TD");

      expect(tbResult[1]).toBe("flowchart TB");
      expect(lrResult[1]).toBe("flowchart LR");
      expect(graphResult[1]).toBe("graph TD");
    });

    it("should include style definitions for styling nodes", () => {
      const result = generator.testInitializeDiagram("flowchart TB");

      // Style definitions should include common styles
      expect(result[2]).toContain("classDef");
    });
  });
});
