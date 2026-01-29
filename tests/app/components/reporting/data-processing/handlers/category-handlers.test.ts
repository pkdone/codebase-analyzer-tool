import {
  technologiesHandler,
  businessProcessesHandler,
  boundedContextsHandler,
  potentialMicroservicesHandler,
  inferredArchitectureHandler,
} from "../../../../../../src/app/components/reporting/data-processing/handlers";
import type { CategoryDataHandler } from "../../../../../../src/app/components/reporting/data-processing/handlers";

describe("Category Handlers", () => {
  describe("technologiesHandler", () => {
    const handler: CategoryDataHandler = technologiesHandler;

    it("should have correct category", () => {
      expect(handler.category).toBe("technologies");
    });

    it("should process valid technologies data", () => {
      const data = [
        { name: "Java", description: "Programming language" },
        { name: "Spring", description: "Framework" },
      ];
      const result = handler.process("Technologies", data);

      expect(result).toEqual({
        category: "technologies",
        label: "Technologies",
        data,
      });
    });

    it("should return empty array for invalid data", () => {
      const result = handler.process("Technologies", null);

      expect(result).toEqual({
        category: "technologies",
        label: "Technologies",
        data: [],
      });
    });

    it("should return empty array for data without name/description", () => {
      const result = handler.process("Technologies", [{ foo: "bar" }]);

      expect(result).toEqual({
        category: "technologies",
        label: "Technologies",
        data: [],
      });
    });
  });

  describe("businessProcessesHandler", () => {
    const handler: CategoryDataHandler = businessProcessesHandler;

    it("should have correct category", () => {
      expect(handler.category).toBe("businessProcesses");
    });

    it("should process valid business processes data", () => {
      const data = [
        {
          name: "Order Processing",
          description: "Handles orders",
          keyBusinessActivities: [
            { activity: "Receive Order", description: "Initial step" },
          ],
        },
      ];
      const result = handler.process("Business Processes", data);

      expect(result).toEqual({
        category: "businessProcesses",
        label: "Business Processes",
        data,
      });
    });

    it("should return empty array for invalid data", () => {
      const result = handler.process("Business Processes", "invalid");

      expect(result).toEqual({
        category: "businessProcesses",
        label: "Business Processes",
        data: [],
      });
    });
  });

  describe("boundedContextsHandler", () => {
    const handler: CategoryDataHandler = boundedContextsHandler;

    it("should have correct category", () => {
      expect(handler.category).toBe("boundedContexts");
    });

    it("should process valid bounded contexts data", () => {
      const data = [
        {
          name: "User Management",
          description: "Handles users",
          aggregates: [],
        },
      ];
      const result = handler.process("Bounded Contexts", data);

      expect(result).toEqual({
        category: "boundedContexts",
        label: "Bounded Contexts",
        data,
      });
    });

    it("should return empty array for invalid data", () => {
      const result = handler.process("Bounded Contexts", undefined);

      expect(result).toEqual({
        category: "boundedContexts",
        label: "Bounded Contexts",
        data: [],
      });
    });
  });

  describe("potentialMicroservicesHandler", () => {
    const handler: CategoryDataHandler = potentialMicroservicesHandler;

    it("should have correct category", () => {
      expect(handler.category).toBe("potentialMicroservices");
    });

    it("should process valid microservices data", () => {
      const data = [
        {
          name: "User Service",
          description: "Handles users",
          entities: [],
          endpoints: [],
          operations: [],
        },
      ];
      const result = handler.process("Potential Microservices", data);

      expect(result).toEqual({
        category: "potentialMicroservices",
        label: "Potential Microservices",
        data,
      });
    });

    it("should return empty array for invalid data", () => {
      const result = handler.process("Potential Microservices", {});

      expect(result).toEqual({
        category: "potentialMicroservices",
        label: "Potential Microservices",
        data: [],
      });
    });
  });

  describe("inferredArchitectureHandler", () => {
    const handler: CategoryDataHandler = inferredArchitectureHandler;

    it("should have correct category", () => {
      expect(handler.category).toBe("inferredArchitecture");
    });

    it("should process valid inferred architecture data", () => {
      const data = {
        internalComponents: [{ name: "API Gateway", description: "Entry point" }],
        externalDependencies: [{ name: "PostgreSQL", type: "Database", description: "DB" }],
        dependencies: [{ from: "API Gateway", to: "PostgreSQL", description: "Uses" }],
      };
      const result = handler.process("Inferred Architecture", data);

      expect(result).not.toBeNull();
      expect(result?.category).toBe("inferredArchitecture");
      expect(result?.label).toBe("Inferred Architecture");
      expect(result?.data).toHaveLength(1);
    });

    it("should return empty array for invalid data", () => {
      const result = handler.process("Inferred Architecture", null);

      expect(result).toEqual({
        category: "inferredArchitecture",
        label: "Inferred Architecture",
        data: [],
      });
    });

    it("should return empty array for partial data", () => {
      const result = handler.process("Inferred Architecture", {
        internalComponents: [],
        // Missing other required fields
      });

      expect(result).toEqual({
        category: "inferredArchitecture",
        label: "Inferred Architecture",
        data: [],
      });
    });
  });

  describe("Handler Registry Pattern", () => {
    const allHandlers = [
      technologiesHandler,
      businessProcessesHandler,
      boundedContextsHandler,
      potentialMicroservicesHandler,
      inferredArchitectureHandler,
    ];

    it("should have unique categories for all handlers", () => {
      const categories = allHandlers.map((h) => h.category);
      const uniqueCategories = new Set(categories);
      expect(uniqueCategories.size).toBe(categories.length);
    });

    it("all handlers should implement CategoryDataHandler interface", () => {
      allHandlers.forEach((handler) => {
        expect(handler.category).toBeDefined();
        expect(typeof handler.process).toBe("function");
      });
    });

    it("all handlers should return consistent structure", () => {
      allHandlers.forEach((handler) => {
        const result = handler.process("Test Label", []);
        expect(result).toHaveProperty("category");
        expect(result).toHaveProperty("label");
        expect(result).toHaveProperty("data");
      });
    });
  });
});
