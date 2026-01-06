import { removeIncompleteArrayItems } from "../../../../../src/common/llm/json-processing/transforms/remove-incomplete-array-items";

describe("removeIncompleteArrayItems", () => {
  describe("should remove truncated trailing items from arrays", () => {
    it("should remove last item with significantly fewer properties", () => {
      const input = {
        items: [
          { name: "item1", description: "desc1", value: 1, type: "A" },
          { name: "item2", description: "desc2", value: 2, type: "B" },
          { name: "item3" }, // Truncated - missing description, value, type
        ],
      };

      const result = removeIncompleteArrayItems(input);

      expect(result).toEqual({
        items: [
          { name: "item1", description: "desc1", value: 1, type: "A" },
          { name: "item2", description: "desc2", value: 2, type: "B" },
        ],
      });
    });

    it("should remove last item missing most properties in microservices pattern", () => {
      const input = {
        potentialMicroservices: [
          {
            name: "Service1",
            description: "Full service description",
            entities: [],
            endpoints: [],
            operations: [],
          },
          {
            name: "Service2",
            description: "Another full service",
            entities: [],
            endpoints: [],
            operations: [],
          },
          {
            name: "Service3",
            description: "Truncated service",
            // Missing entities, endpoints, operations
          },
        ],
      };

      const result = removeIncompleteArrayItems(input);

      expect(result).toEqual({
        potentialMicroservices: [
          {
            name: "Service1",
            description: "Full service description",
            entities: [],
            endpoints: [],
            operations: [],
          },
          {
            name: "Service2",
            description: "Another full service",
            entities: [],
            endpoints: [],
            operations: [],
          },
        ],
      });
    });

    it("should handle nested arrays with truncation", () => {
      const input = {
        services: [
          {
            name: "Service1",
            endpoints: [
              { path: "/api/v1", method: "GET", description: "Get all" },
              { path: "/api/v2", method: "POST", description: "Create" },
              { path: "/api/v3" }, // Truncated endpoint
            ],
          },
        ],
      };

      const result = removeIncompleteArrayItems(input);

      expect(result).toEqual({
        services: [
          {
            name: "Service1",
            endpoints: [
              { path: "/api/v1", method: "GET", description: "Get all" },
              { path: "/api/v2", method: "POST", description: "Create" },
            ],
          },
        ],
      });
    });
  });

  describe("should NOT remove items from complete arrays", () => {
    it("should preserve arrays where all items have similar property counts", () => {
      const input = {
        items: [
          { name: "item1", value: 1 },
          { name: "item2", value: 2 },
          { name: "item3", value: 3 },
        ],
      };

      const result = removeIncompleteArrayItems(input);

      expect(result).toEqual(input);
    });

    it("should preserve arrays with uniform objects", () => {
      const input = {
        endpoints: [
          { path: "/api/users", method: "GET" },
          { path: "/api/posts", method: "POST" },
          { path: "/api/comments", method: "DELETE" },
        ],
      };

      const result = removeIncompleteArrayItems(input);

      expect(result).toEqual(input);
    });
  });

  describe("should NOT modify single-item arrays", () => {
    it("should preserve single-item arrays regardless of property count", () => {
      const input = {
        items: [{ name: "only item" }],
      };

      const result = removeIncompleteArrayItems(input);

      expect(result).toEqual(input);
    });
  });

  describe("should NOT modify arrays of primitives", () => {
    it("should preserve string arrays", () => {
      const input = {
        tags: ["tag1", "tag2", "tag3"],
      };

      const result = removeIncompleteArrayItems(input);

      expect(result).toEqual(input);
    });

    it("should preserve number arrays", () => {
      const input = {
        values: [1, 2, 3, 4, 5],
      };

      const result = removeIncompleteArrayItems(input);

      expect(result).toEqual(input);
    });

    it("should preserve mixed arrays", () => {
      const input = {
        mixed: ["string", 42, true, null],
      };

      const result = removeIncompleteArrayItems(input);

      expect(result).toEqual(input);
    });
  });

  describe("should handle edge cases", () => {
    it("should handle null input", () => {
      const result = removeIncompleteArrayItems(null);
      expect(result).toBeNull();
    });

    it("should handle undefined input", () => {
      const result = removeIncompleteArrayItems(undefined);
      expect(result).toBeUndefined();
    });

    it("should handle empty objects", () => {
      const input = {};
      const result = removeIncompleteArrayItems(input);
      expect(result).toEqual({});
    });

    it("should handle empty arrays", () => {
      const input = { items: [] };
      const result = removeIncompleteArrayItems(input);
      expect(result).toEqual({ items: [] });
    });

    it("should handle primitives", () => {
      expect(removeIncompleteArrayItems("string")).toBe("string");
      expect(removeIncompleteArrayItems(42)).toBe(42);
      expect(removeIncompleteArrayItems(true)).toBe(true);
    });
  });

  describe("real-world LLM truncation patterns", () => {
    it("should handle operations array with truncated last item", () => {
      const input = {
        potentialMicroservices: [
          {
            name: "Self Transfer Service",
            operations: [
              {
                operation: "Create Self Transfer",
                method: "POST",
                description: "Creates a self-service transfer",
              },
              {
                operation: "Register Beneficiary",
                method: "POST",
                description: "Registers a new TPT beneficiary",
              },
              {
                operation: "Check Transfer Limits",
                method: "GET",
                description: "Validates transfer amount",
              },
              {
                operation: "Process Payment",
                // Missing method and description - truncated
              },
            ],
          },
        ],
      };

      const result = removeIncompleteArrayItems(input) as typeof input;

      expect(result.potentialMicroservices[0].operations).toHaveLength(3);
      expect(result.potentialMicroservices[0].operations[2].operation).toBe(
        "Check Transfer Limits",
      );
    });

    it("should handle deeply nested truncation in endpoints", () => {
      const input = {
        services: [
          {
            name: "API Service",
            endpoints: [
              { path: "/users", method: "GET", description: "List users" },
              { path: "/users/{id}", method: "GET", description: "Get user" },
              { path: "/users", method: "POST", description: "Create user" },
              { path: "/users/{id}" }, // Truncated - missing method and description
            ],
          },
        ],
      };

      const result = removeIncompleteArrayItems(input) as typeof input;

      expect(result.services[0].endpoints).toHaveLength(3);
    });

    it("should not remove item that is only slightly smaller", () => {
      // Item has 3 properties but siblings have 4 - not significantly smaller
      const input = {
        items: [
          { a: 1, b: 2, c: 3, d: 4 },
          { a: 1, b: 2, c: 3, d: 4 },
          { a: 1, b: 2, c: 3 }, // Only missing 1 property - should be kept
        ],
      };

      const result = removeIncompleteArrayItems(input);

      // Since the last item has 3 properties and average is 4,
      // 3 < 4 * 0.5 is false (3 < 2 is false), so it should not be removed
      // Also MIN_MISSING_PROPERTIES is 2, but only 1 is missing
      expect(result).toEqual(input);
    });
  });

  describe("multiple arrays in same object", () => {
    it("should process multiple arrays independently", () => {
      const input = {
        entities: [
          { name: "Entity1", attributes: ["a", "b"], description: "desc" },
          { name: "Entity2", attributes: ["c"], description: "desc2" },
          { name: "Entity3" }, // Truncated
        ],
        endpoints: [
          { path: "/api", method: "GET", description: "API" },
          { path: "/api2", method: "POST", description: "API2" },
        ],
      };

      const result = removeIncompleteArrayItems(input) as typeof input;

      expect(result.entities).toHaveLength(2);
      expect(result.endpoints).toHaveLength(2); // Unchanged - complete array
    });
  });
});
