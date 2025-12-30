import {
  isBusinessProcessData,
  extractKeyBusinessActivities,
  isMicroserviceData,
  extractMicroserviceFields,
  isInferredArchitectureCategoryData,
  parseInferredArchitectureData,
} from "../../../../../src/app/components/reporting/sections/visualizations/visualizations-type-guards";

describe("visualizations-type-guards", () => {
  describe("isBusinessProcessData", () => {
    it("should return true for valid business process data with keyBusinessActivities", () => {
      const data = {
        name: "Order Processing",
        description: "Handles order workflow",
        keyBusinessActivities: [
          { activity: "Validate Order", description: "Check order validity" },
          { activity: "Process Payment", description: "Handle payment" },
        ],
      };
      expect(isBusinessProcessData(data)).toBe(true);
    });

    it("should return true for valid business process data without keyBusinessActivities", () => {
      const data = {
        name: "Simple Process",
        description: "A simple business process",
      };
      expect(isBusinessProcessData(data)).toBe(true);
    });

    it("should return false for invalid data missing name", () => {
      const data = {
        description: "Missing name field",
        keyBusinessActivities: [],
      } as unknown;
      expect(isBusinessProcessData(data as any)).toBe(false);
    });

    it("should return false for invalid data with wrong activity structure", () => {
      const data = {
        name: "Bad Process",
        description: "Has invalid activities",
        keyBusinessActivities: [{ step: "Wrong key", info: "Wrong structure" }],
      };
      expect(isBusinessProcessData(data)).toBe(false);
    });
  });

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

  describe("isMicroserviceData", () => {
    it("should return true for valid microservice data with all fields", () => {
      const data = {
        name: "User Service",
        description: "Manages users",
        entities: [{ name: "User", description: "User entity", attributes: ["id", "name"] }],
        endpoints: [{ path: "/users", method: "GET", description: "Get users" }],
        operations: [{ operation: "Create User", method: "POST", description: "Create a user" }],
      };
      expect(isMicroserviceData(data)).toBe(true);
    });

    it("should return true for microservice data with only name and description", () => {
      const data = {
        name: "Simple Service",
        description: "A simple microservice",
      };
      expect(isMicroserviceData(data)).toBe(true);
    });

    it("should return false for invalid data missing name", () => {
      const data = {
        description: "Missing name",
        entities: [],
      } as unknown;
      expect(isMicroserviceData(data as any)).toBe(false);
    });

    it("should return false for data with invalid entity structure", () => {
      const data = {
        name: "Bad Service",
        description: "Has bad entities",
        entities: [{ invalidKey: "wrong" }],
      };
      expect(isMicroserviceData(data)).toBe(false);
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

  describe("parseInferredArchitectureData", () => {
    it("should return parsed data for valid input", () => {
      const data = {
        internalComponents: [{ name: "Component", description: "Desc" }],
        externalDependencies: [{ name: "DB", type: "Database", description: "Storage" }],
        dependencies: [{ from: "Component", to: "DB", description: "Uses" }],
      };
      const result = parseInferredArchitectureData(data);
      expect(result).toEqual(data);
    });

    it("should return null for invalid input", () => {
      const data = {
        internalComponents: [{ invalidStructure: true }],
      };
      const result = parseInferredArchitectureData(data);
      expect(result).toBeNull();
    });

    it("should return null for null input", () => {
      expect(parseInferredArchitectureData(null)).toBeNull();
    });

    it("should return parsed data with defaults for missing optional fields", () => {
      const data = {};
      const result = parseInferredArchitectureData(data);
      expect(result).toEqual({});
    });
  });
});
