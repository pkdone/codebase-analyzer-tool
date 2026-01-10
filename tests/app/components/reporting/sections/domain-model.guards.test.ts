/**
 * Tests for domain model type guards.
 */

import { isHierarchicalBoundedContextDataArray } from "../../../../../src/app/components/reporting/sections/visualizations/domain-model.guards";
import type { HierarchicalBoundedContextData } from "../../../../../src/app/components/reporting/sections/visualizations/domain-model.types";
import type { AppSummaryNameDescArray } from "../../../../../src/app/repositories/app-summaries/app-summaries.model";

describe("domain-model.guards", () => {
  describe("isHierarchicalBoundedContextDataArray", () => {
    it("should return false for non-array input", () => {
      expect(isHierarchicalBoundedContextDataArray({} as any)).toBe(false);
      expect(isHierarchicalBoundedContextDataArray("string" as any)).toBe(false);
      expect(isHierarchicalBoundedContextDataArray(null as any)).toBe(false);
      expect(isHierarchicalBoundedContextDataArray(undefined as any)).toBe(false);
    });

    it("should return true for empty array", () => {
      expect(isHierarchicalBoundedContextDataArray([])).toBe(true);
    });

    it("should return true for valid bounded context data", () => {
      const validData = [
        {
          name: "User Context",
          description: "Handles user management",
          aggregates: [
            {
              name: "User",
              description: "User aggregate",
              entities: [{ name: "User", description: "User entity" }],
              repository: { name: "UserRepository", description: "User repo" },
            },
          ],
        },
      ];
      expect(isHierarchicalBoundedContextDataArray(validData)).toBe(true);
    });

    it("should return true for data with missing aggregates (lenient check)", () => {
      const dataWithoutAggregates = [
        {
          name: "User Context",
          description: "Handles user management",
        },
      ];
      expect(isHierarchicalBoundedContextDataArray(dataWithoutAggregates)).toBe(true);
    });

    it("should return false when name is missing", () => {
      const invalidData = [
        {
          description: "Missing name",
          aggregates: [],
        },
      ];
      expect(isHierarchicalBoundedContextDataArray(invalidData as any)).toBe(false);
    });

    it("should return false when description is missing", () => {
      const invalidData = [
        {
          name: "Context",
          aggregates: [],
        },
      ];
      expect(isHierarchicalBoundedContextDataArray(invalidData as any)).toBe(false);
    });

    it("should return false when name is not a string", () => {
      const invalidData = [
        {
          name: 123,
          description: "Description",
          aggregates: [],
        },
      ];
      expect(isHierarchicalBoundedContextDataArray(invalidData as any)).toBe(false);
    });

    it("should return false when description is not a string", () => {
      const invalidData = [
        {
          name: "Context",
          description: 456,
          aggregates: [],
        },
      ];
      expect(isHierarchicalBoundedContextDataArray(invalidData as any)).toBe(false);
    });

    it("should return false when aggregates is present but not an array", () => {
      const invalidData = [
        {
          name: "Context",
          description: "Description",
          aggregates: "not an array",
        },
      ];
      expect(isHierarchicalBoundedContextDataArray(invalidData as any)).toBe(false);
    });

    it("should return true for multiple valid bounded contexts", () => {
      const validData = [
        { name: "Context 1", description: "Description 1", aggregates: [] },
        { name: "Context 2", description: "Description 2" },
        { name: "Context 3", description: "Description 3", aggregates: [] },
      ];
      expect(isHierarchicalBoundedContextDataArray(validData)).toBe(true);
    });

    it("should return false if any item in array is invalid", () => {
      const mixedData = [
        { name: "Valid", description: "Valid description" },
        { name: 123, description: "Invalid name" },
      ];
      expect(isHierarchicalBoundedContextDataArray(mixedData as any)).toBe(false);
    });

    describe("type predicate behavior", () => {
      it("should narrow type from AppSummaryNameDescArray to HierarchicalBoundedContextData[]", () => {
        // Start with the more general type
        const data: AppSummaryNameDescArray = [
          {
            name: "Order Context",
            description: "Handles orders",
            aggregates: [
              {
                name: "OrderAggregate",
                description: "Order aggregate",
                entities: [{ name: "Order", description: "Order entity" }],
                repository: { name: "OrderRepository", description: "Order repo" },
              },
            ],
          },
        ];

        // Before the guard, we can't access hierarchical properties without casting
        if (isHierarchicalBoundedContextDataArray(data)) {
          // After the guard, TypeScript knows data is HierarchicalBoundedContextData[]
          const contexts: HierarchicalBoundedContextData[] = data;
          expect(contexts[0].name).toBe("Order Context");
          expect(contexts[0].aggregates).toBeDefined();
          // Access the aggregates property without casting
          expect(contexts[0].aggregates?.[0]?.name).toBe("OrderAggregate");
        }
      });

      it("should allow safe property access after type narrowing", () => {
        const data: AppSummaryNameDescArray = [
          { name: "Test Context", description: "Test description" },
        ];

        if (isHierarchicalBoundedContextDataArray(data)) {
          // The type guard narrows the type, allowing typed access
          const firstContext = data[0];
          expect(firstContext.name).toBe("Test Context");
          expect(firstContext.description).toBe("Test description");
          // aggregates is optional in HierarchicalBoundedContextData
          expect(firstContext.aggregates).toBeUndefined();
        }
      });

      it("should enable type-safe iteration after guard check", () => {
        const data: AppSummaryNameDescArray = [
          { name: "Context A", description: "Description A" },
          { name: "Context B", description: "Description B" },
        ];

        if (isHierarchicalBoundedContextDataArray(data)) {
          // Can safely iterate with proper typing
          const names = data.map((context) => context.name);
          expect(names).toEqual(["Context A", "Context B"]);
        }
      });
    });
  });
});
