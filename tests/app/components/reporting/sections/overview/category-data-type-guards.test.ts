import {
  isAppSummaryNameDescArray,
  isCategorizedDataNameDescArray,
  isCategorizedDataInferredArchitecture,
  parseInferredArchitectureData,
  wrapInferredArchitectureAsArray,
  type CategorizedDataItem,
} from "../../../../../../src/app/components/reporting/sections/overview/category-data-type-guards";

describe("category-data-type-guards", () => {
  describe("isAppSummaryNameDescArray", () => {
    it("should return true for valid name-description array", () => {
      const validData = [
        { name: "Item 1", description: "Description 1" },
        { name: "Item 2", description: "Description 2" },
      ];
      expect(isAppSummaryNameDescArray(validData)).toBe(true);
    });

    it("should return true for empty array", () => {
      expect(isAppSummaryNameDescArray([])).toBe(true);
    });

    it("should return false for non-array", () => {
      expect(isAppSummaryNameDescArray("not an array")).toBe(false);
      expect(isAppSummaryNameDescArray(null)).toBe(false);
      expect(isAppSummaryNameDescArray(undefined)).toBe(false);
      expect(isAppSummaryNameDescArray(123)).toBe(false);
    });

    it("should return false for array with invalid items", () => {
      const invalidData = [{ invalid: "field" }];
      expect(isAppSummaryNameDescArray(invalidData)).toBe(false);
    });

    it("should return false for array with missing required fields", () => {
      const invalidData = [{ name: "Only name" }];
      expect(isAppSummaryNameDescArray(invalidData)).toBe(false);
    });
  });

  describe("isCategorizedDataNameDescArray", () => {
    it("should return true for valid name-description array", () => {
      const data: CategorizedDataItem = [{ name: "Tech", description: "Technology item" }];
      expect(isCategorizedDataNameDescArray(data)).toBe(true);
    });

    it("should return false for inferred architecture data", () => {
      const archData: CategorizedDataItem = [
        {
          internalComponents: [{ name: "Component", description: "Desc" }],
          externalDependencies: [],
          dependencies: [],
        },
      ];
      expect(isCategorizedDataNameDescArray(archData)).toBe(false);
    });
  });

  describe("isCategorizedDataInferredArchitecture", () => {
    it("should return true for valid inferred architecture array", () => {
      const archData: CategorizedDataItem = [
        {
          internalComponents: [{ name: "Component", description: "Desc" }],
          externalDependencies: [{ name: "DB", type: "Database", description: "Main DB" }],
          dependencies: [{ from: "A", to: "B", description: "Connects" }],
        },
      ];
      expect(isCategorizedDataInferredArchitecture(archData)).toBe(true);
    });

    it("should return true for empty array", () => {
      expect(isCategorizedDataInferredArchitecture([])).toBe(true);
    });

    it("should return false for name-description array", () => {
      const data: CategorizedDataItem = [{ name: "Tech", description: "Technology item" }];
      expect(isCategorizedDataInferredArchitecture(data)).toBe(false);
    });
  });

  describe("parseInferredArchitectureData", () => {
    it("should return parsed data for valid inferred architecture object", () => {
      const validData = {
        internalComponents: [{ name: "Service", description: "Main service" }],
        externalDependencies: [{ name: "PostgreSQL", type: "Database", description: "Primary DB" }],
        dependencies: [{ from: "Service", to: "PostgreSQL", description: "Stores data" }],
      };
      const result = parseInferredArchitectureData(validData);
      expect(result).not.toBeNull();
      expect(result?.internalComponents).toHaveLength(1);
      expect(result?.internalComponents[0].name).toBe("Service");
    });

    it("should return null for invalid data", () => {
      const invalidData = { wrongField: "value" };
      expect(parseInferredArchitectureData(invalidData)).toBeNull();
    });

    it("should return null for non-object data", () => {
      expect(parseInferredArchitectureData(null)).toBeNull();
      expect(parseInferredArchitectureData("string")).toBeNull();
      expect(parseInferredArchitectureData(123)).toBeNull();
    });

    it("should return null for partial data missing required fields", () => {
      // The schema requires all three fields: internalComponents, externalDependencies, dependencies
      const partialData = {
        internalComponents: [{ name: "Component", description: "Desc" }],
      };
      const result = parseInferredArchitectureData(partialData);
      // Partial data should fail validation since all fields are required
      expect(result).toBeNull();
    });

    it("should handle complete data with empty arrays", () => {
      const completeData = {
        internalComponents: [{ name: "Component", description: "Desc" }],
        externalDependencies: [],
        dependencies: [],
      };
      const result = parseInferredArchitectureData(completeData);
      expect(result).not.toBeNull();
      expect(result?.internalComponents).toHaveLength(1);
    });
  });

  describe("wrapInferredArchitectureAsArray", () => {
    it("should wrap valid architecture data in an array", () => {
      const archData = {
        internalComponents: [{ name: "Service", description: "Main service" }],
        externalDependencies: [],
        dependencies: [],
      };
      const result = wrapInferredArchitectureAsArray(archData);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(archData);
    });

    it("should wrap empty architecture data in an array", () => {
      const emptyArchData = {
        internalComponents: [],
        externalDependencies: [],
        dependencies: [],
      };
      const result = wrapInferredArchitectureAsArray(emptyArchData);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
    });
  });
});
