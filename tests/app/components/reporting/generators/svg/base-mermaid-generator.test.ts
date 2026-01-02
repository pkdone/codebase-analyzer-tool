import "reflect-metadata";
import {
  BaseDiagramGenerator,
  type BaseDiagramOptions,
  type DimensionConfig,
  type CalculatedDimensions,
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

  testCalculateDimensions(nodeCount: number, config: DimensionConfig): CalculatedDimensions {
    return this.calculateDimensions(nodeCount, config);
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

  describe("calculateDimensions", () => {
    it("should use minimum dimensions when node count is low", () => {
      const result = generator.testCalculateDimensions(1, {
        minWidth: 800,
        minHeight: 600,
        widthPerNode: 50,
        heightPerNode: 40,
      });

      expect(result.width).toBe(800);
      expect(result.height).toBe(600);
    });

    it("should scale dimensions based on node count", () => {
      const result = generator.testCalculateDimensions(20, {
        minWidth: 800,
        minHeight: 600,
        widthPerNode: 50,
        heightPerNode: 40,
      });

      expect(result.width).toBe(1000); // 20 * 50
      expect(result.height).toBe(800); // 20 * 40
    });

    it("should respect maximum width constraint", () => {
      const result = generator.testCalculateDimensions(100, {
        minWidth: 800,
        minHeight: 600,
        widthPerNode: 50,
        heightPerNode: 40,
        maxWidth: 2000,
      });

      expect(result.width).toBe(2000); // Capped at maxWidth
      expect(result.height).toBe(4000); // 100 * 40
    });

    it("should respect maximum height constraint", () => {
      const result = generator.testCalculateDimensions(100, {
        minWidth: 800,
        minHeight: 600,
        widthPerNode: 50,
        heightPerNode: 40,
        maxHeight: 1500,
      });

      expect(result.width).toBe(5000); // 100 * 50
      expect(result.height).toBe(1500); // Capped at maxHeight
    });

    it("should respect both max width and height constraints", () => {
      const result = generator.testCalculateDimensions(100, {
        minWidth: 800,
        minHeight: 600,
        widthPerNode: 50,
        heightPerNode: 40,
        maxWidth: 2000,
        maxHeight: 1500,
      });

      expect(result.width).toBe(2000);
      expect(result.height).toBe(1500);
    });

    it("should handle zero node count", () => {
      const result = generator.testCalculateDimensions(0, {
        minWidth: 800,
        minHeight: 600,
        widthPerNode: 50,
        heightPerNode: 40,
      });

      expect(result.width).toBe(800);
      expect(result.height).toBe(600);
    });

    it("should work without widthPerNode", () => {
      const result = generator.testCalculateDimensions(10, {
        minWidth: 800,
        minHeight: 600,
        heightPerNode: 40,
      });

      expect(result.width).toBe(800); // Only minWidth applies
      expect(result.height).toBe(600); // 10 * 40 = 400, but min is 600
    });

    it("should work without heightPerNode", () => {
      const result = generator.testCalculateDimensions(10, {
        minWidth: 800,
        minHeight: 600,
        widthPerNode: 100,
      });

      expect(result.width).toBe(1000); // 10 * 100
      expect(result.height).toBe(600); // Only minHeight applies
    });

    it("should handle only minimum dimensions specified", () => {
      const result = generator.testCalculateDimensions(50, {
        minWidth: 800,
        minHeight: 600,
      });

      expect(result.width).toBe(800);
      expect(result.height).toBe(600);
    });
  });
});
