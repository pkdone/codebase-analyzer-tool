import "reflect-metadata";
import {
  CurrentArchitectureSvgGenerator,
  type InferredArchitectureData,
} from "../../../../../src/app/components/reporting/generators/svg/current-architecture-svg-generator";
import { MermaidRenderer } from "../../../../../src/app/components/reporting/generators/mermaid/mermaid-renderer";

describe("CurrentArchitectureSvgGenerator", () => {
  let generator: CurrentArchitectureSvgGenerator;
  let mockMermaidRenderer: jest.Mocked<MermaidRenderer>;

  beforeEach(() => {
    mockMermaidRenderer = {
      renderToSvg: jest.fn().mockResolvedValue("<svg>mocked svg</svg>"),
    } as unknown as jest.Mocked<MermaidRenderer>;

    generator = new CurrentArchitectureSvgGenerator(mockMermaidRenderer);
  });

  describe("generateCurrentArchitectureDiagramSvg", () => {
    it("should generate empty diagram when data is null", async () => {
      const result = await generator.generateCurrentArchitectureDiagramSvg(null);

      expect(result).toContain("No inferred architecture data available");
      expect(result).toContain("<svg");
      expect(mockMermaidRenderer.renderToSvg).not.toHaveBeenCalled();
    });

    it("should generate empty diagram when internalComponents is empty", async () => {
      const data: InferredArchitectureData = {
        internalComponents: [],
        externalDependencies: [],
        dependencies: [],
      };

      const result = await generator.generateCurrentArchitectureDiagramSvg(data);

      expect(result).toContain("No inferred architecture data available");
      expect(mockMermaidRenderer.renderToSvg).not.toHaveBeenCalled();
    });

    it("should call mermaidRenderer with correct options when data is valid", async () => {
      const data: InferredArchitectureData = {
        internalComponents: [{ name: "Order Manager", description: "Handles orders" }],
        externalDependencies: [],
        dependencies: [],
      };

      await generator.generateCurrentArchitectureDiagramSvg(data);

      expect(mockMermaidRenderer.renderToSvg).toHaveBeenCalledTimes(1);
      expect(mockMermaidRenderer.renderToSvg).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          width: expect.any(Number),
          height: expect.any(Number),
          backgroundColor: expect.any(String),
        }),
      );
    });

    it("should generate Mermaid definition with internal components", async () => {
      const data: InferredArchitectureData = {
        internalComponents: [
          { name: "Order Manager", description: "Handles order operations" },
          { name: "Customer Manager", description: "Handles customer data" },
        ],
        externalDependencies: [],
        dependencies: [],
      };

      await generator.generateCurrentArchitectureDiagramSvg(data);

      const mermaidDefinition = mockMermaidRenderer.renderToSvg.mock.calls[0][0];

      expect(mermaidDefinition).toContain("flowchart TB");
      expect(mermaidDefinition).toContain("Order Manager");
      expect(mermaidDefinition).toContain("Customer Manager");
      expect(mermaidDefinition).toContain("class");
      expect(mermaidDefinition).toContain("internalComponent");
    });

    it("should generate Mermaid definition with external dependencies", async () => {
      const data: InferredArchitectureData = {
        internalComponents: [{ name: "Order Manager", description: "Handles orders" }],
        externalDependencies: [
          { name: "PostgreSQL", type: "Database", description: "Primary database" },
          { name: "RabbitMQ", type: "Queue", description: "Message broker" },
        ],
        dependencies: [],
      };

      await generator.generateCurrentArchitectureDiagramSvg(data);

      const mermaidDefinition = mockMermaidRenderer.renderToSvg.mock.calls[0][0];

      expect(mermaidDefinition).toContain("PostgreSQL");
      expect(mermaidDefinition).toContain("Database");
      expect(mermaidDefinition).toContain("RabbitMQ");
      expect(mermaidDefinition).toContain("Queue");
      expect(mermaidDefinition).toContain("externalComponent");
    });

    it("should generate dependency arrows between components", async () => {
      const data: InferredArchitectureData = {
        internalComponents: [
          { name: "Order Manager", description: "Handles orders" },
          { name: "Customer Manager", description: "Handles customers" },
        ],
        externalDependencies: [{ name: "PostgreSQL", type: "Database", description: "Database" }],
        dependencies: [
          { from: "Order Manager", to: "PostgreSQL", description: "Persists orders" },
          { from: "Order Manager", to: "Customer Manager", description: "Fetches customer data" },
        ],
      };

      await generator.generateCurrentArchitectureDiagramSvg(data);

      const mermaidDefinition = mockMermaidRenderer.renderToSvg.mock.calls[0][0];

      // Check for arrow syntax
      expect(mermaidDefinition).toContain("-->");
    });

    it("should apply internalComponent style class to internal components", async () => {
      const data: InferredArchitectureData = {
        internalComponents: [{ name: "Order Manager", description: "Handles orders" }],
        externalDependencies: [],
        dependencies: [],
      };

      await generator.generateCurrentArchitectureDiagramSvg(data);

      const mermaidDefinition = mockMermaidRenderer.renderToSvg.mock.calls[0][0];

      expect(mermaidDefinition).toMatch(/class\s+\w+\s+internalComponent/);
    });

    it("should apply externalComponent style class to external dependencies", async () => {
      const data: InferredArchitectureData = {
        internalComponents: [{ name: "Order Manager", description: "Handles orders" }],
        externalDependencies: [{ name: "PostgreSQL", type: "Database", description: "Database" }],
        dependencies: [],
      };

      await generator.generateCurrentArchitectureDiagramSvg(data);

      const mermaidDefinition = mockMermaidRenderer.renderToSvg.mock.calls[0][0];

      expect(mermaidDefinition).toMatch(/class\s+\w+\s+externalComponent/);
    });

    it("should return SVG from mermaid renderer", async () => {
      const expectedSvg = "<svg>test architecture diagram</svg>";
      mockMermaidRenderer.renderToSvg.mockResolvedValue(expectedSvg);

      const data: InferredArchitectureData = {
        internalComponents: [{ name: "Order Manager", description: "Handles orders" }],
        externalDependencies: [],
        dependencies: [],
      };

      const result = await generator.generateCurrentArchitectureDiagramSvg(data);

      expect(result).toBe(expectedSvg);
    });

    it("should handle components with special characters in names", async () => {
      const data: InferredArchitectureData = {
        internalComponents: [
          { name: "Order & Invoice Manager", description: "Handles orders" },
          { name: "Customer (VIP)", description: "VIP customer handling" },
        ],
        externalDependencies: [
          { name: "PostgreSQL [Primary]", type: "Database", description: "Database" },
        ],
        dependencies: [],
      };

      await generator.generateCurrentArchitectureDiagramSvg(data);

      // Should not throw and should call the renderer
      expect(mockMermaidRenderer.renderToSvg).toHaveBeenCalledTimes(1);
    });

    it("should adjust dimensions based on number of components", async () => {
      const data: InferredArchitectureData = {
        internalComponents: [
          { name: "Component 1", description: "Desc 1" },
          { name: "Component 2", description: "Desc 2" },
          { name: "Component 3", description: "Desc 3" },
          { name: "Component 4", description: "Desc 4" },
          { name: "Component 5", description: "Desc 5" },
        ],
        externalDependencies: [
          { name: "Ext 1", type: "Database", description: "Desc" },
          { name: "Ext 2", type: "Queue", description: "Desc" },
          { name: "Ext 3", type: "API", description: "Desc" },
        ],
        dependencies: [],
      };

      await generator.generateCurrentArchitectureDiagramSvg(data);

      const options = mockMermaidRenderer.renderToSvg.mock.calls[0][1];
      // With 8 total components, dimensions should be adjusted
      expect(options?.width).toBeGreaterThanOrEqual(1600);
      expect(options?.height).toBeGreaterThanOrEqual(800);
    });
  });
});
