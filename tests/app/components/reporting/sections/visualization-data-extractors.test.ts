import {
  extractKeyBusinessActivities,
  extractMicroserviceFields,
  isInferredArchitectureCategoryData,
} from "../../../../../src/app/components/reporting/sections/visualizations/visualization-data-extractors";

describe("visualization-data-extractors", () => {
  describe("extractKeyBusinessActivities", () => {
    it("should extract activities from valid business process data", () => {
      const data = {
        name: "Order Processing",
        description: "Handles order workflow",
        keyBusinessActivities: [
          { activity: "Validate Order", description: "Check order validity" },
        ],
      };
      const result = extractKeyBusinessActivities(data);
      expect(result).toEqual([{ activity: "Validate Order", description: "Check order validity" }]);
    });

    it("should return empty array for data without keyBusinessActivities", () => {
      const data = {
        name: "Simple Process",
        description: "No activities",
      };
      const result = extractKeyBusinessActivities(data);
      expect(result).toEqual([]);
    });

    it("should return empty array for invalid data", () => {
      const data = {
        invalidField: "not a business process",
      };
      const result = extractKeyBusinessActivities(data as any);
      expect(result).toEqual([]);
    });
  });

  describe("extractMicroserviceFields", () => {
    it("should extract all microservice fields with defaults for missing attributes", () => {
      const data = {
        name: "User Service",
        description: "Manages users",
        entities: [{ name: "User", description: "User entity" }],
        endpoints: [{ path: "/users", method: "GET", description: "Get users" }],
        operations: [{ operation: "Create User", method: "POST", description: "Create" }],
      };
      const result = extractMicroserviceFields(data);
      expect(result.entities).toEqual([
        { name: "User", description: "User entity", attributes: [] },
      ]);
      expect(result.endpoints).toEqual([
        { path: "/users", method: "GET", description: "Get users" },
      ]);
      expect(result.operations).toEqual([
        { operation: "Create User", method: "POST", description: "Create" },
      ]);
    });

    it("should preserve entity attributes when present", () => {
      const data = {
        name: "Service",
        description: "With attributes",
        entities: [{ name: "Entity", description: "Desc", attributes: ["id", "name"] }],
      };
      const result = extractMicroserviceFields(data);
      expect(result.entities[0].attributes).toEqual(["id", "name"]);
    });

    it("should return empty arrays for invalid data", () => {
      const data = { invalid: "data" };
      const result = extractMicroserviceFields(data as any);
      expect(result).toEqual({ entities: [], endpoints: [], operations: [] });
    });

    it("should return empty arrays for data without optional fields", () => {
      const data = {
        name: "Minimal Service",
        description: "No optional fields",
      };
      const result = extractMicroserviceFields(data);
      expect(result).toEqual({ entities: [], endpoints: [], operations: [] });
    });
  });

  describe("isInferredArchitectureCategoryData", () => {
    it("should return true for valid inferred architecture data", () => {
      const data = {
        internalComponents: [{ name: "Order Manager", description: "Handles orders" }],
        externalDependencies: [{ name: "PostgreSQL", type: "Database", description: "Main DB" }],
        dependencies: [{ from: "Order Manager", to: "PostgreSQL", description: "Stores data" }],
      };
      expect(isInferredArchitectureCategoryData(data)).toBe(true);
    });

    it("should return true for empty architecture data", () => {
      const data = {
        internalComponents: [],
        externalDependencies: [],
        dependencies: [],
      };
      expect(isInferredArchitectureCategoryData(data)).toBe(true);
    });

    it("should return true for partial architecture data", () => {
      const data = {
        internalComponents: [{ name: "Component", description: "Desc" }],
      };
      expect(isInferredArchitectureCategoryData(data)).toBe(true);
    });

    it("should return false for invalid internal component structure", () => {
      const data = {
        internalComponents: [{ wrongKey: "value" }],
      };
      expect(isInferredArchitectureCategoryData(data)).toBe(false);
    });

    it("should return false for invalid external dependency structure", () => {
      const data = {
        externalDependencies: [{ name: "DB", missing_type: "missing" }],
      };
      expect(isInferredArchitectureCategoryData(data)).toBe(false);
    });

    it("should return false for non-object data", () => {
      expect(isInferredArchitectureCategoryData(null)).toBe(false);
      expect(isInferredArchitectureCategoryData(undefined)).toBe(false);
      expect(isInferredArchitectureCategoryData("string")).toBe(false);
      expect(isInferredArchitectureCategoryData(123)).toBe(false);
    });
  });
});
