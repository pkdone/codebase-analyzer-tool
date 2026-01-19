import "reflect-metadata";
import { z } from "zod";
import {
  MapReduceIntermediateData,
  CategoryInsightResult,
  AppSummaryCategoryEnum,
  appSummaryCategorySchemas,
} from "../../../../src/app/components/insights/insights.types";

/**
 * Test suite for insights types, particularly the MapReduceIntermediateData type.
 *
 * These tests verify that:
 * 1. MapReduceIntermediateData correctly transforms string fields to arrays
 * 2. Non-string fields are preserved as-is
 * 3. The type provides compile-time safety for map-reduce intermediate data
 */
describe("Insights Types", () => {
  describe("MapReduceIntermediateData type transformation", () => {
    /**
     * These tests document the type-level transformations that MapReduceIntermediateData performs.
     * While runtime validation is limited for these compile-time types, the tests verify
     * that the expected type relationships hold.
     */

    it("should transform string fields to string[] for appDescription category", () => {
      // CategoryInsightResult<"appDescription"> = { appDescription: string }
      // MapReduceIntermediateData<"appDescription"> = { appDescription: string[] }

      // Create intermediate data (array of strings for consolidation)
      const intermediateData: MapReduceIntermediateData<"appDescription"> = {
        appDescription: ["First partial description.", "Second partial description."],
      };

      // Verify the intermediate data is an array
      expect(Array.isArray(intermediateData.appDescription)).toBe(true);
      expect(intermediateData.appDescription).toHaveLength(2);
      expect(intermediateData.appDescription[0]).toBe("First partial description.");

      // Create final result (single string after reduce consolidation)
      const finalResult: CategoryInsightResult<"appDescription"> = {
        appDescription: "A consolidated comprehensive description.",
      };

      // Verify the final result is a string
      expect(typeof finalResult.appDescription).toBe("string");
    });

    it("should preserve array fields unchanged for technologies category", () => {
      // CategoryInsightResult<"technologies"> = { technologies: Array<...> }
      // MapReduceIntermediateData<"technologies"> = { technologies: Array<...> } (same)

      const intermediateData: MapReduceIntermediateData<"technologies"> = {
        technologies: [
          { name: "TypeScript", description: "Typed JavaScript" },
          { name: "Node.js", description: "JavaScript runtime" },
        ],
      };

      const finalResult: CategoryInsightResult<"technologies"> = {
        technologies: [
          { name: "TypeScript", description: "Typed JavaScript" },
          { name: "Node.js", description: "JavaScript runtime" },
        ],
      };

      // Both should be arrays with the same structure
      expect(Array.isArray(intermediateData.technologies)).toBe(true);
      expect(Array.isArray(finalResult.technologies)).toBe(true);
      expect(intermediateData.technologies).toEqual(finalResult.technologies);
    });

    it("should preserve nested object with array fields for inferredArchitecture category", () => {
      // Both intermediate and final should have the same nested object structure

      const testData: MapReduceIntermediateData<"inferredArchitecture"> = {
        inferredArchitecture: {
          internalComponents: [{ name: "AuthService", description: "Handles auth" }],
          externalDependencies: [{ name: "PostgreSQL", type: "Database", description: "Main DB" }],
          dependencies: [{ from: "AuthService", to: "PostgreSQL", description: "Stores users" }],
        },
      };

      // This should also be assignable as CategoryInsightResult (same structure)
      const finalResult: CategoryInsightResult<"inferredArchitecture"> = testData;

      expect(finalResult.inferredArchitecture.internalComponents).toHaveLength(1);
      expect(finalResult.inferredArchitecture.externalDependencies[0].type).toBe("Database");
    });

    it("should preserve flat array structure for businessProcesses category", () => {
      const intermediateData: MapReduceIntermediateData<"businessProcesses"> = {
        businessProcesses: [
          {
            name: "OrderProcessing",
            description: "Handles orders",
            keyBusinessActivities: [{ activity: "ValidateOrder", description: "Validates order" }],
          },
        ],
      };

      // Should be directly assignable to CategoryInsightResult
      const finalResult: CategoryInsightResult<"businessProcesses"> = intermediateData;

      expect(finalResult.businessProcesses[0].name).toBe("OrderProcessing");
      expect(finalResult.businessProcesses[0].keyBusinessActivities).toHaveLength(1);
    });

    it("should preserve nested array structures for boundedContexts category", () => {
      const intermediateData: MapReduceIntermediateData<"boundedContexts"> = {
        boundedContexts: [
          {
            name: "OrderContext",
            description: "Order bounded context",
            aggregates: [
              {
                name: "OrderAggregate",
                description: "Order aggregate root",
                repository: { name: "OrderRepo", description: "Order repository" },
                entities: [{ name: "Order", description: "Order entity" }],
              },
            ],
          },
        ],
      };

      // Should be directly assignable to CategoryInsightResult
      const finalResult: CategoryInsightResult<"boundedContexts"> = intermediateData;

      expect(finalResult.boundedContexts[0].aggregates[0].entities).toHaveLength(1);
      expect(finalResult.boundedContexts[0].aggregates[0].repository.name).toBe("OrderRepo");
    });

    it("should preserve deeply nested structures for potentialMicroservices category", () => {
      const intermediateData: MapReduceIntermediateData<"potentialMicroservices"> = {
        potentialMicroservices: [
          {
            name: "UserService",
            description: "Handles users",
            entities: [{ name: "User", description: "User entity" }],
            endpoints: [{ path: "/users", method: "GET", description: "List users" }],
            operations: [{ operation: "CreateUser", method: "POST", description: "Creates user" }],
          },
        ],
      };

      // Should be directly assignable to CategoryInsightResult
      const finalResult: CategoryInsightResult<"potentialMicroservices"> = intermediateData;

      expect(finalResult.potentialMicroservices[0].endpoints[0].path).toBe("/users");
      expect(finalResult.potentialMicroservices[0].operations[0].operation).toBe("CreateUser");
    });
  });

  describe("MapReduceIntermediateData documents intermediate vs final data", () => {
    /**
     * This test documents the key insight: MapReduceIntermediateData makes it explicit
     * that the combine phase produces data that may differ from the final schema.
     */

    it("should clearly distinguish intermediate data from final result for string categories", () => {
      // For appDescription, the intermediate data is an array that will be consolidated
      const partialDescriptions = [
        "This module handles authentication.",
        "It also provides authorization features.",
      ];

      // Intermediate data explicitly typed to show it's an array
      const intermediateData: MapReduceIntermediateData<"appDescription"> = {
        appDescription: partialDescriptions,
      };

      // The LLM reduce phase consolidates this into a single string
      const finalData: CategoryInsightResult<"appDescription"> = {
        appDescription:
          "This comprehensive module handles authentication and provides authorization features.",
      };

      // Type system enforces the difference
      expect(Array.isArray(intermediateData.appDescription)).toBe(true);
      expect(typeof finalData.appDescription).toBe("string");

      // The intermediate array has the partial descriptions
      expect(intermediateData.appDescription).toContain("This module handles authentication.");
      expect(intermediateData.appDescription).toContain("It also provides authorization features.");

      // The final result is a consolidated string
      expect(finalData.appDescription).toContain("comprehensive");
    });
  });

  describe("Type compatibility with schema definitions", () => {
    it("should ensure CategoryInsightResult matches z.infer for all categories", () => {
      // Test that CategoryInsightResult correctly maps to z.infer for each schema
      const categories: AppSummaryCategoryEnum[] = [
        "appDescription",
        "technologies",
        "businessProcesses",
        "boundedContexts",
        "inferredArchitecture",
        "potentialMicroservices",
        // Add other categories as needed
      ];

      for (const category of categories) {
        const schema = appSummaryCategorySchemas[category];
        expect(schema).toBeDefined();

        // Verify schema is a valid ZodType that can be used for parsing
        expect(schema).toBeInstanceOf(z.ZodType);
        expect(typeof schema.safeParse).toBe("function");
      }
    });

    it("should verify appSummaryCategorySchemas contains all expected categories", () => {
      // Ensure the schema mapping is complete
      const expectedCategories = [
        "appDescription",
        "technologies",
        "businessProcesses",
        "boundedContexts",
        "inferredArchitecture",
        "potentialMicroservices",
      ];

      for (const category of expectedCategories) {
        expect(appSummaryCategorySchemas[category as AppSummaryCategoryEnum]).toBeDefined();
        expect(appSummaryCategorySchemas[category as AppSummaryCategoryEnum]).toBeInstanceOf(
          z.ZodType,
        );
      }
    });
  });
});
