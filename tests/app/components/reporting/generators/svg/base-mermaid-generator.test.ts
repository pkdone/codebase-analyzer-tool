import "reflect-metadata";
import {
  BaseMermaidGenerator,
  type BaseDiagramOptions,
} from "../../../../../../src/app/components/reporting/generators/svg/base-mermaid-generator";
import type { MermaidRenderer } from "../../../../../../src/app/components/reporting/generators/mermaid/mermaid-renderer";
import { DIAGRAM_STYLES } from "../../../../../../src/app/components/reporting/generators/mermaid/mermaid-definition-builders";

interface TestDiagramOptions extends BaseDiagramOptions {
  customOption?: string;
}

// Concrete implementation for testing the abstract class
class TestMermaidGenerator extends BaseMermaidGenerator<TestDiagramOptions> {
  protected readonly defaultOptions: Required<TestDiagramOptions> = {
    width: 800,
    height: 600,
    customOption: "default",
  };

  // Expose protected methods for testing
  testGenerateEmptyDiagram(message: string): string {
    return this.generateEmptyDiagram(message);
  }

  async testRenderDiagram(definition: string, width: number, height: number): Promise<string> {
    return this.renderDiagram(definition, width, height);
  }

  testMergeOptions(options: TestDiagramOptions): Required<TestDiagramOptions> {
    return this.mergeOptions(options);
  }

  getDefaultOptions(): Required<TestDiagramOptions> {
    return this.defaultOptions;
  }
}

describe("BaseMermaidGenerator", () => {
  let mockMermaidRenderer: jest.Mocked<MermaidRenderer>;
  let generator: TestMermaidGenerator;

  beforeEach(() => {
    mockMermaidRenderer = {
      renderToSvg: jest.fn().mockResolvedValue("<svg>test</svg>"),
    } as unknown as jest.Mocked<MermaidRenderer>;

    generator = new TestMermaidGenerator(mockMermaidRenderer);
  });

  describe("constructor", () => {
    it("should accept a MermaidRenderer instance", () => {
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

  describe("renderDiagram", () => {
    it("should call mermaidRenderer.renderToSvg with correct parameters", async () => {
      const definition = "flowchart TB\n    A --> B";
      const width = 1000;
      const height = 500;

      await generator.testRenderDiagram(definition, width, height);

      expect(mockMermaidRenderer.renderToSvg).toHaveBeenCalledWith(definition, {
        width,
        height,
        backgroundColor: DIAGRAM_STYLES.backgroundColor,
      });
    });

    it("should return the SVG from the renderer", async () => {
      const expectedSvg = "<svg>rendered diagram</svg>";
      mockMermaidRenderer.renderToSvg.mockResolvedValue(expectedSvg);

      const result = await generator.testRenderDiagram("flowchart TB", 800, 600);

      expect(result).toBe(expectedSvg);
    });

    it("should use consistent background color", async () => {
      await generator.testRenderDiagram("flowchart TB", 800, 600);

      const callArgs = mockMermaidRenderer.renderToSvg.mock.calls[0][1];
      expect(callArgs?.backgroundColor).toBe(DIAGRAM_STYLES.backgroundColor);
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
