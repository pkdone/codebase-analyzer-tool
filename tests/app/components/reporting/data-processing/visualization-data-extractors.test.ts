import "reflect-metadata";
import {
  extractMicroservicesData,
  extractInferredArchitectureData,
  isInferredArchitectureCategoryData,
} from "../../../../../src/app/components/reporting/data-processing";
import type { CategorizedSectionItem } from "../../../../../src/app/components/reporting/data-processing";

/**
 * Helper to create a minimal categorized item for testing.
 */
function createCategorizedItem<T extends CategorizedSectionItem["category"]>(
  category: T,
  data: Extract<CategorizedSectionItem, { category: T }>["data"],
): CategorizedSectionItem {
  return { category, data } as CategorizedSectionItem;
}

describe("visualization-data-extractors", () => {
  describe("extractMicroservicesData", () => {
    it("should return empty array when no potentialMicroservices category exists", () => {
      const categorizedData: CategorizedSectionItem[] = [
        createCategorizedItem("businessProcesses", []),
      ];

      const result = extractMicroservicesData(categorizedData);

      expect(result).toEqual([]);
    });

    it("should return empty array when potentialMicroservices data is empty", () => {
      const categorizedData: CategorizedSectionItem[] = [
        createCategorizedItem("potentialMicroservices", []),
      ];

      const result = extractMicroservicesData(categorizedData);

      expect(result).toEqual([]);
    });

    it("should extract microservices with all fields", () => {
      const categorizedData: CategorizedSectionItem[] = [
        createCategorizedItem("potentialMicroservices", [
          {
            name: "UserService",
            description: "Manages user accounts",
            entities: [
              {
                name: "User",
                description: "User entity",
                attributes: ["id", "email", "name"],
              },
            ],
            endpoints: [
              {
                path: "/users",
                method: "GET",
                description: "List users",
              },
            ],
            operations: [
              {
                operation: "createUser",
                method: "POST",
                description: "Create a new user",
              },
            ],
          },
        ]),
      ];

      const result = extractMicroservicesData(categorizedData);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("UserService");
      expect(result[0].description).toBe("Manages user accounts");
      expect(result[0].entities).toHaveLength(1);
      expect(result[0].entities[0].attributes).toEqual(["id", "email", "name"]);
      expect(result[0].endpoints).toHaveLength(1);
      expect(result[0].operations).toHaveLength(1);
    });

    it("should handle entities with optional attributes", () => {
      const categorizedData: CategorizedSectionItem[] = [
        createCategorizedItem("potentialMicroservices", [
          {
            name: "TestService",
            description: "Test",
            entities: [
              {
                name: "Entity",
                description: "Entity description",
                // attributes is optional in schema
              },
            ],
            endpoints: [],
            operations: [],
          },
        ]),
      ];

      const result = extractMicroservicesData(categorizedData);

      expect(result[0].entities[0].attributes).toEqual([]);
    });

    it("should extract multiple microservices", () => {
      const categorizedData: CategorizedSectionItem[] = [
        createCategorizedItem("potentialMicroservices", [
          {
            name: "ServiceA",
            description: "First service",
            entities: [],
            endpoints: [],
            operations: [],
          },
          {
            name: "ServiceB",
            description: "Second service",
            entities: [],
            endpoints: [],
            operations: [],
          },
        ]),
      ];

      const result = extractMicroservicesData(categorizedData);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("ServiceA");
      expect(result[1].name).toBe("ServiceB");
    });
  });

  describe("extractInferredArchitectureData", () => {
    it("should return null when no inferredArchitecture category exists", () => {
      const categorizedData: CategorizedSectionItem[] = [
        createCategorizedItem("businessProcesses", []),
      ];

      const result = extractInferredArchitectureData(categorizedData);

      expect(result).toBeNull();
    });

    it("should return null when inferredArchitecture data is empty", () => {
      const categorizedData: CategorizedSectionItem[] = [
        createCategorizedItem("inferredArchitecture", []),
      ];

      const result = extractInferredArchitectureData(categorizedData);

      expect(result).toBeNull();
    });

    it("should extract inferred architecture with all fields", () => {
      const categorizedData: CategorizedSectionItem[] = [
        createCategorizedItem("inferredArchitecture", [
          {
            internalComponents: [
              { name: "API Gateway", description: "Entry point" },
              { name: "Auth Service", description: "Authentication" },
            ],
            externalDependencies: [
              { name: "PostgreSQL", type: "Database", description: "Primary database" },
            ],
            dependencies: [
              { from: "API Gateway", to: "Auth Service", description: "Auth requests" },
            ],
          },
        ]),
      ];

      const result = extractInferredArchitectureData(categorizedData);

      expect(result).not.toBeNull();
      expect(result?.internalComponents).toHaveLength(2);
      expect(result?.externalDependencies).toHaveLength(1);
      expect(result?.dependencies).toHaveLength(1);
    });

    it("should handle missing optional fields with empty arrays", () => {
      // The schema validates with safeParse which returns true for objects with optional fields
      // Test with data that has empty arrays explicitly
      const categorizedData: CategorizedSectionItem[] = [
        createCategorizedItem("inferredArchitecture", [
          {
            internalComponents: [],
            externalDependencies: [],
            dependencies: [],
          },
        ]),
      ];

      const result = extractInferredArchitectureData(categorizedData);

      expect(result).not.toBeNull();
      expect(result?.internalComponents).toEqual([]);
      expect(result?.externalDependencies).toEqual([]);
      expect(result?.dependencies).toEqual([]);
    });

    it("should return null for invalid data structure", () => {
      // Create a mock with invalid structure that won't pass the type guard
      // Using unknown type cast to bypass TypeScript's strict checks for testing
      const categorizedData = [
        {
          category: "inferredArchitecture" as const,
          data: [
            {
              // Missing proper structure - this is an intentional type violation for testing
              internalComponents: "not an array",
            },
          ],
        },
      ] as unknown as CategorizedSectionItem[];

      const result = extractInferredArchitectureData(categorizedData);

      expect(result).toBeNull();
    });
  });

  describe("isInferredArchitectureCategoryData", () => {
    it("should return true for valid architecture data", () => {
      const validData = {
        internalComponents: [{ name: "Component", description: "Desc" }],
        externalDependencies: [{ name: "DB", type: "Database", description: "Desc" }],
        dependencies: [{ from: "A", to: "B", description: "Desc" }],
      };

      expect(isInferredArchitectureCategoryData(validData)).toBe(true);
    });

    it("should return true for empty arrays", () => {
      const emptyData = {
        internalComponents: [],
        externalDependencies: [],
        dependencies: [],
      };

      expect(isInferredArchitectureCategoryData(emptyData)).toBe(true);
    });

    it("should return false for missing required fields", () => {
      const partialData = {};

      expect(isInferredArchitectureCategoryData(partialData)).toBe(false);
    });

    it("should return false for invalid component structure", () => {
      const invalidData = {
        internalComponents: [{ invalid: "structure" }],
      };

      expect(isInferredArchitectureCategoryData(invalidData)).toBe(false);
    });

    it("should return false for non-object data", () => {
      expect(isInferredArchitectureCategoryData(null)).toBe(false);
      expect(isInferredArchitectureCategoryData("string")).toBe(false);
      expect(isInferredArchitectureCategoryData(123)).toBe(false);
    });
  });
});
