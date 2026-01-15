import {
  isAppSummaryNameDescArray,
  isCategorizedDataNameDescArray,
  isCategorizedDataInferredArchitecture,
  isPotentialMicroservicesArray,
  isBoundedContextsArray,
  isBusinessProcessesArray,
  parseInferredArchitectureData,
  wrapInferredArchitectureAsArray,
  type CategorizedSectionItem,
  type PotentialMicroservicesArray,
  type BoundedContextsArray,
  type BusinessProcessesArray,
  type InferredArchitectureInner,
} from "../../../../../../src/app/components/reporting/sections/overview/category-data-type-guards";
import type { AppSummaryNameDescArray } from "../../../../../../src/app/repositories/app-summaries/app-summaries.model";

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
      const data: AppSummaryNameDescArray = [{ name: "Tech", description: "Technology item" }];
      expect(isCategorizedDataNameDescArray(data)).toBe(true);
    });

    it("should return false for inferred architecture data", () => {
      const archData: InferredArchitectureInner[] = [
        {
          internalComponents: [{ name: "Component", description: "Desc" }],
          externalDependencies: [],
          dependencies: [],
        },
      ];
      expect(isCategorizedDataNameDescArray(archData)).toBe(false);
    });

    it("should return false for non-array values", () => {
      expect(isCategorizedDataNameDescArray(null)).toBe(false);
      expect(isCategorizedDataNameDescArray(undefined)).toBe(false);
      expect(isCategorizedDataNameDescArray("string")).toBe(false);
      expect(isCategorizedDataNameDescArray(123)).toBe(false);
    });
  });

  describe("isCategorizedDataInferredArchitecture", () => {
    it("should return true for valid inferred architecture array", () => {
      const archData: InferredArchitectureInner[] = [
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
      const data: AppSummaryNameDescArray = [{ name: "Tech", description: "Technology item" }];
      expect(isCategorizedDataInferredArchitecture(data)).toBe(false);
    });

    it("should return false for non-array values", () => {
      expect(isCategorizedDataInferredArchitecture(null)).toBe(false);
      expect(isCategorizedDataInferredArchitecture(undefined)).toBe(false);
      expect(isCategorizedDataInferredArchitecture("string")).toBe(false);
      expect(isCategorizedDataInferredArchitecture(123)).toBe(false);
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

  describe("isPotentialMicroservicesArray", () => {
    it("should return true for valid microservices array", () => {
      const validData: PotentialMicroservicesArray = [
        {
          name: "UserService",
          description: "Handles user operations",
          entities: [{ name: "User", description: "User entity" }],
          endpoints: [{ path: "/api/users", method: "GET", description: "Get users" }],
          operations: [{ operation: "CreateUser", method: "POST", description: "Create user" }],
        },
      ];
      expect(isPotentialMicroservicesArray(validData)).toBe(true);
    });

    it("should return true for empty array", () => {
      expect(isPotentialMicroservicesArray([])).toBe(true);
    });

    it("should return false for plain name-description array without microservice fields", () => {
      const data = [{ name: "Item", description: "Description" }];
      // Should fail because it's missing required microservice fields
      expect(isPotentialMicroservicesArray(data)).toBe(false);
    });

    it("should return false for non-array", () => {
      expect(isPotentialMicroservicesArray("not an array")).toBe(false);
      expect(isPotentialMicroservicesArray(null)).toBe(false);
      expect(isPotentialMicroservicesArray(123)).toBe(false);
    });
  });

  describe("isBoundedContextsArray", () => {
    it("should return true for valid bounded contexts array", () => {
      const validData: BoundedContextsArray = [
        {
          name: "OrderContext",
          description: "Order bounded context",
          aggregates: [
            {
              name: "OrderAggregate",
              description: "Order aggregate",
              repository: { name: "OrderRepository", description: "Order repository" },
              entities: [{ name: "OrderItem", description: "Order item entity" }],
            },
          ],
        },
      ];
      expect(isBoundedContextsArray(validData)).toBe(true);
    });

    it("should return true for empty array", () => {
      expect(isBoundedContextsArray([])).toBe(true);
    });

    it("should return false for plain name-description array without bounded context fields", () => {
      const data = [{ name: "Item", description: "Description" }];
      // Should fail because it's missing required aggregates field
      expect(isBoundedContextsArray(data)).toBe(false);
    });

    it("should return false for non-array", () => {
      expect(isBoundedContextsArray("not an array")).toBe(false);
      expect(isBoundedContextsArray(null)).toBe(false);
    });
  });

  describe("isBusinessProcessesArray", () => {
    it("should return true for valid business processes array", () => {
      const validData: BusinessProcessesArray = [
        {
          name: "OrderProcess",
          description: "Order processing workflow",
          keyBusinessActivities: [
            { activity: "ValidateOrder", description: "Validates the order" },
            { activity: "ProcessPayment", description: "Processes payment" },
          ],
        },
      ];
      expect(isBusinessProcessesArray(validData)).toBe(true);
    });

    it("should return true for empty array", () => {
      expect(isBusinessProcessesArray([])).toBe(true);
    });

    it("should return false for plain name-description array without business process fields", () => {
      const data = [{ name: "Item", description: "Description" }];
      // Should fail because it's missing required keyBusinessActivities field
      expect(isBusinessProcessesArray(data)).toBe(false);
    });

    it("should return false for non-array", () => {
      expect(isBusinessProcessesArray("not an array")).toBe(false);
      expect(isBusinessProcessesArray(null)).toBe(false);
    });
  });

  describe("CategorizedSectionItem discriminated union", () => {
    it("should properly type technologies data", () => {
      const technologiesItem: CategorizedSectionItem = {
        category: "technologies",
        label: "Technologies",
        data: [{ name: "Java", description: "Programming language" }],
      };
      expect(technologiesItem.category).toBe("technologies");
      expect(technologiesItem.data).toHaveLength(1);
    });

    it("should properly type businessProcesses data with keyBusinessActivities", () => {
      const businessProcessesItem: CategorizedSectionItem = {
        category: "businessProcesses",
        label: "Business Processes",
        data: [
          {
            name: "OrderProcess",
            description: "Order workflow",
            keyBusinessActivities: [{ activity: "Step1", description: "First step" }],
          },
        ],
      };
      expect(businessProcessesItem.category).toBe("businessProcesses");
      // When category is 'businessProcesses', data has keyBusinessActivities
      expect(businessProcessesItem.data[0].keyBusinessActivities).toBeDefined();
    });

    it("should properly type potentialMicroservices data with entities and endpoints", () => {
      const microservicesItem: CategorizedSectionItem = {
        category: "potentialMicroservices",
        label: "Potential Microservices",
        data: [
          {
            name: "UserService",
            description: "User service",
            entities: [{ name: "User", description: "User entity" }],
            endpoints: [{ path: "/users", method: "GET", description: "Get users" }],
            operations: [{ operation: "CreateUser", method: "POST", description: "Create user" }],
          },
        ],
      };
      expect(microservicesItem.category).toBe("potentialMicroservices");
      // When category is 'potentialMicroservices', data has entities and endpoints
      expect(microservicesItem.data[0].entities).toBeDefined();
      expect(microservicesItem.data[0].endpoints).toBeDefined();
    });

    it("should properly type boundedContexts data with aggregates", () => {
      const boundedContextsItem: CategorizedSectionItem = {
        category: "boundedContexts",
        label: "Bounded Contexts",
        data: [
          {
            name: "OrderContext",
            description: "Order context",
            aggregates: [
              {
                name: "OrderAggregate",
                description: "Order aggregate",
                repository: { name: "OrderRepo", description: "Repository" },
                entities: [{ name: "Order", description: "Order entity" }],
              },
            ],
          },
        ],
      };
      expect(boundedContextsItem.category).toBe("boundedContexts");
      // When category is 'boundedContexts', data has aggregates
      expect(boundedContextsItem.data[0].aggregates).toBeDefined();
    });

    it("should properly type inferredArchitecture data", () => {
      const archItem: CategorizedSectionItem = {
        category: "inferredArchitecture",
        label: "Inferred Architecture",
        data: [
          {
            internalComponents: [{ name: "Service", description: "Main service" }],
            externalDependencies: [{ name: "DB", type: "Database", description: "Main DB" }],
            dependencies: [{ from: "Service", to: "DB", description: "Uses" }],
          },
        ],
      };
      expect(archItem.category).toBe("inferredArchitecture");
      // When category is 'inferredArchitecture', data has architecture structure
      expect(archItem.data[0].internalComponents).toBeDefined();
    });
  });
});
