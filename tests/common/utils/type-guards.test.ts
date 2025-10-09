import { isDefined } from "../../../src/common/utils/type-guards";

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
});
