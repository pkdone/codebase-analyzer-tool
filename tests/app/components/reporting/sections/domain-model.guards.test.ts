/**
 * Tests for domain model type guards.
 */

import { isHierarchicalBoundedContextDataArray } from "../../../../../src/app/components/reporting/sections/visualizations/domain-model.guards";

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
  });
});
