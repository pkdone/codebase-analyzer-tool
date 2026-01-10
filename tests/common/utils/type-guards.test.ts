import { isDefined, isNotNull, isJsonObject } from "../../../src/common/utils/type-guards";

describe("type-guards", () => {
  describe("isDefined", () => {
    it("should return true for defined values", () => {
      expect(isDefined("string")).toBe(true);
      expect(isDefined(123)).toBe(true);
      expect(isDefined(0)).toBe(true);
      expect(isDefined(false)).toBe(true);
      expect(isDefined({})).toBe(true);
      expect(isDefined([])).toBe(true);
      expect(isDefined("")).toBe(true);
    });

    it("should return false for null", () => {
      expect(isDefined(null)).toBe(false);
    });

    it("should return false for undefined", () => {
      expect(isDefined(undefined)).toBe(false);
    });

    it("should filter out null and undefined from arrays", () => {
      const arr = ["a", undefined, null, "b", null, "c", undefined].filter(isDefined);
      expect(arr).toEqual(["a", "b", "c"]);
    });

    it("should preserve type information when filtering", () => {
      const mixed: (string | null | undefined)[] = ["hello", null, "world", undefined];
      const filtered: string[] = mixed.filter(isDefined);
      expect(filtered).toEqual(["hello", "world"]);
    });

    it("should work with arrays of objects", () => {
      interface Item {
        id: number;
        name: string;
      }
      const items: (Item | null | undefined)[] = [
        { id: 1, name: "first" },
        null,
        { id: 2, name: "second" },
        undefined,
      ];
      const definedItems: Item[] = items.filter(isDefined);
      expect(definedItems).toEqual([
        { id: 1, name: "first" },
        { id: 2, name: "second" },
      ]);
    });
  });

  describe("isNotNull", () => {
    it("should return true for non-null values", () => {
      expect(isNotNull("string")).toBe(true);
      expect(isNotNull(123)).toBe(true);
      expect(isNotNull(0)).toBe(true);
      expect(isNotNull(false)).toBe(true);
      expect(isNotNull({})).toBe(true);
      expect(isNotNull([])).toBe(true);
      expect(isNotNull("")).toBe(true);
      expect(isNotNull(undefined)).toBe(true); // undefined is NOT null
    });

    it("should return false for null", () => {
      expect(isNotNull(null)).toBe(false);
    });

    it("should filter out null values from arrays while preserving undefined", () => {
      const arr: (string | null | undefined)[] = ["a", undefined, null, "b", null, "c"];
      const filtered = arr.filter(isNotNull);
      expect(filtered).toEqual(["a", undefined, "b", "c"]);
    });

    it("should preserve type information when filtering null from arrays", () => {
      const mixed: (string | null)[] = ["hello", null, "world", null];
      const filtered: string[] = mixed.filter(isNotNull);
      expect(filtered).toEqual(["hello", "world"]);
    });

    it("should work with arrays of objects containing null values", () => {
      interface Item {
        id: number;
        name: string;
      }
      const items: (Item | null)[] = [
        { id: 1, name: "first" },
        null,
        { id: 2, name: "second" },
        null,
      ];
      const nonNullItems: Item[] = items.filter(isNotNull);
      expect(nonNullItems).toEqual([
        { id: 1, name: "first" },
        { id: 2, name: "second" },
      ]);
    });

    it("should work with generic types in Promise.all results", () => {
      // Simulate Promise.all result pattern where some promises resolve to null
      interface InsightResult {
        category: string;
        data: string[];
      }
      const results: (InsightResult | null)[] = [
        { category: "technologies", data: ["TypeScript"] },
        null,
        { category: "processes", data: ["CI/CD"] },
        null,
      ];
      const validResults: InsightResult[] = results.filter(isNotNull);
      expect(validResults).toHaveLength(2);
      expect(validResults[0].category).toBe("technologies");
      expect(validResults[1].category).toBe("processes");
    });
  });

  describe("isJsonObject", () => {
    it("should return true for plain objects", () => {
      expect(isJsonObject({})).toBe(true);
      expect(isJsonObject({ key: "value" })).toBe(true);
      expect(isJsonObject({ nested: { object: true } })).toBe(true);
    });

    it("should return false for null", () => {
      expect(isJsonObject(null)).toBe(false);
    });

    it("should return false for arrays", () => {
      expect(isJsonObject([])).toBe(false);
      expect(isJsonObject([1, 2, 3])).toBe(false);
      expect(isJsonObject([{ key: "value" }])).toBe(false);
    });

    it("should return false for primitives", () => {
      expect(isJsonObject("string")).toBe(false);
      expect(isJsonObject(123)).toBe(false);
      expect(isJsonObject(true)).toBe(false);
      expect(isJsonObject(undefined)).toBe(false);
    });

    it("should allow property access after type narrowing", () => {
      const value: unknown = { name: "test", count: 42 };
      if (isJsonObject(value)) {
        // TypeScript should allow property access after narrowing
        expect(value.name).toBe("test");
        expect(value.count).toBe(42);
      }
    });
  });
});
