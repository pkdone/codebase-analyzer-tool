import "reflect-metadata";
import {
  BaseDiagramGenerator,
  type BaseDiagramOptions,
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
    it("should wrap definition in pre tag with mermaid class", () => {
      const definition = "flowchart TB\n    A --> B";
      const result = generator.testWrapForClientRendering(definition);

      expect(result).toContain('<pre class="mermaid"');
      expect(result).toContain(definition);
      expect(result).toContain("</pre>");
    });

    it("should include background color styling", () => {
      const definition = "flowchart TB";
      const result = generator.testWrapForClientRendering(definition);

      expect(result).toContain(`background-color: ${DIAGRAM_STYLES.backgroundColor}`);
    });

    it("should include overflow-x auto for horizontal scrolling", () => {
      const definition = "flowchart TB";
      const result = generator.testWrapForClientRendering(definition);

      expect(result).toContain("overflow-x: auto");
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
});
