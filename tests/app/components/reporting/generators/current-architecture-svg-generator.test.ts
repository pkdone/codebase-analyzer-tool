import "reflect-metadata";
import {
  CurrentArchitectureDiagramGenerator,
  type InferredArchitectureData,
} from "../../../../../src/app/components/reporting/sections/inferred-architecture";

describe("CurrentArchitectureDiagramGenerator", () => {
  let generator: CurrentArchitectureDiagramGenerator;

  beforeEach(() => {
    generator = new CurrentArchitectureDiagramGenerator();
  });

  describe("generateCurrentArchitectureDiagram", () => {
    it("should generate empty diagram when data is null", () => {
      const result = generator.generateCurrentArchitectureDiagram(null);

      expect(result).toContain("No inferred architecture data available");
      expect(result).toContain("<svg");
    });

    it("should generate empty diagram when internalComponents is empty", () => {
      const data: InferredArchitectureData = {
        internalComponents: [],
        externalDependencies: [],
        dependencies: [],
      };

      const result = generator.generateCurrentArchitectureDiagram(data);

      expect(result).toContain("No inferred architecture data available");
    });

    it("should wrap mermaid definition for client-side rendering", () => {
      const data: InferredArchitectureData = {
        internalComponents: [{ name: "Order Manager", description: "Handles orders" }],
        externalDependencies: [],
        dependencies: [],
      };

      const result = generator.generateCurrentArchitectureDiagram(data);

      expect(result).toContain('<pre class="mermaid mermaid-diagram">');
      expect(result).toContain("</pre>");
    });

    it("should generate Mermaid definition with internal components", () => {
      const data: InferredArchitectureData = {
        internalComponents: [
          { name: "Order Manager", description: "Handles order operations" },
          { name: "Customer Manager", description: "Handles customer data" },
        ],
        externalDependencies: [],
        dependencies: [],
      };

      const result = generator.generateCurrentArchitectureDiagram(data);

      expect(result).toContain("flowchart TB");
      expect(result).toContain("Order Manager");
      expect(result).toContain("Customer Manager");
      expect(result).toContain("class");
      expect(result).toContain("internalComponent");
    });

    it("should generate Mermaid definition with external dependencies", () => {
      const data: InferredArchitectureData = {
        internalComponents: [{ name: "Order Manager", description: "Handles orders" }],
        externalDependencies: [
          { name: "PostgreSQL", type: "Database", description: "Primary database" },
          { name: "RabbitMQ", type: "Queue", description: "Message broker" },
        ],
        dependencies: [],
      };

      const result = generator.generateCurrentArchitectureDiagram(data);

      expect(result).toContain("PostgreSQL");
      expect(result).toContain("Database");
      expect(result).toContain("RabbitMQ");
      expect(result).toContain("Queue");
      expect(result).toContain("externalComponent");
    });

    it("should generate dependency arrows between components", () => {
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

      const result = generator.generateCurrentArchitectureDiagram(data);

      // Check for arrow syntax
      expect(result).toContain("-->");
    });

    it("should apply internalComponent style class to internal components", () => {
      const data: InferredArchitectureData = {
        internalComponents: [{ name: "Order Manager", description: "Handles orders" }],
        externalDependencies: [],
        dependencies: [],
      };

      const result = generator.generateCurrentArchitectureDiagram(data);

      expect(result).toMatch(/class\s+\w+\s+internalComponent/);
    });

    it("should apply externalComponent style class to external dependencies", () => {
      const data: InferredArchitectureData = {
        internalComponents: [{ name: "Order Manager", description: "Handles orders" }],
        externalDependencies: [{ name: "PostgreSQL", type: "Database", description: "Database" }],
        dependencies: [],
      };

      const result = generator.generateCurrentArchitectureDiagram(data);

      expect(result).toMatch(/class\s+\w+\s+externalComponent/);
    });

    it("should handle components with special characters in names", () => {
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

      // Should not throw
      const result = generator.generateCurrentArchitectureDiagram(data);
      expect(result).toContain('<pre class="mermaid mermaid-diagram">');
    });
  });
});
