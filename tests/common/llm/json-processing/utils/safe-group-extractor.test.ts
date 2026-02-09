import {
  safeGroup,
  getSafeGroups,
} from "../../../../../src/common/llm/json-processing/utils/safe-group-extractor";

describe("safe-group-extractor", () => {
  describe("safeGroup", () => {
    it("should return the group value when present", () => {
      const groups: (string | undefined)[] = ["first", "second", "third"];
      expect(safeGroup(groups, 0)).toBe("first");
      expect(safeGroup(groups, 1)).toBe("second");
      expect(safeGroup(groups, 2)).toBe("third");
    });

    it("should return empty string for undefined groups", () => {
      const groups: (string | undefined)[] = ["first", undefined, "third"];
      expect(safeGroup(groups, 1)).toBe("");
    });

    it("should return empty string for out of bounds index", () => {
      const groups: (string | undefined)[] = ["first"];
      expect(safeGroup(groups, 5)).toBe("");
      expect(safeGroup(groups, 100)).toBe("");
    });

    it("should return last element for negative index using .at() semantics", () => {
      const groups: (string | undefined)[] = ["first", "second"];
      // .at(-1) returns the last element (counts from end of array)
      expect(safeGroup(groups, -1)).toBe("second");
      expect(safeGroup(groups, -2)).toBe("first");
    });

    it("should handle empty array", () => {
      const groups: (string | undefined)[] = [];
      expect(safeGroup(groups, 0)).toBe("");
      expect(safeGroup(groups, 1)).toBe("");
    });

    it("should handle empty string values", () => {
      const groups: (string | undefined)[] = ["", "value", ""];
      expect(safeGroup(groups, 0)).toBe("");
      expect(safeGroup(groups, 1)).toBe("value");
      expect(safeGroup(groups, 2)).toBe("");
    });
  });

  describe("getSafeGroups", () => {
    it("should extract 3 groups", () => {
      const groups: (string | undefined)[] = ["a", "b", "c", "d"];
      const result = getSafeGroups(groups, 3);
      expect(result).toEqual(["a", "b", "c"]);
    });

    it("should extract 4 groups", () => {
      const groups: (string | undefined)[] = ["a", "b", "c", "d", "e"];
      const result = getSafeGroups(groups, 4);
      expect(result).toEqual(["a", "b", "c", "d"]);
    });

    it("should extract 5 groups", () => {
      const groups: (string | undefined)[] = ["a", "b", "c", "d", "e", "f"];
      const result = getSafeGroups(groups, 5);
      expect(result).toEqual(["a", "b", "c", "d", "e"]);
    });

    it("should convert undefined to empty strings", () => {
      const groups: (string | undefined)[] = ["a", undefined, "c"];
      const result = getSafeGroups(groups, 3);
      expect(result).toEqual(["a", "", "c"]);
    });

    it("should pad with empty strings when groups are missing", () => {
      const groups: (string | undefined)[] = [];
      const result = getSafeGroups(groups, 3);
      expect(result).toEqual(["", "", ""]);
    });

    it("should pad with empty strings for 4 groups when input is short", () => {
      const groups: (string | undefined)[] = ["a", "b"];
      const result = getSafeGroups(groups, 4);
      expect(result).toEqual(["a", "b", "", ""]);
    });

    it("should pad with empty strings for 5 groups when input is short", () => {
      const groups: (string | undefined)[] = ["a"];
      const result = getSafeGroups(groups, 5);
      expect(result).toEqual(["a", "", "", "", ""]);
    });

    it("should work with destructuring assignment", () => {
      const groups: (string | undefined)[] = ["delimiter", "whitespace", "value"];
      const [delimiter, whitespace, value] = getSafeGroups(groups, 3);
      expect(delimiter).toBe("delimiter");
      expect(whitespace).toBe("whitespace");
      expect(value).toBe("value");
    });

    it("should handle count of 1", () => {
      const groups: (string | undefined)[] = ["only"];
      const result = getSafeGroups(groups, 1);
      expect(result).toEqual(["only"]);
    });

    it("should handle count of 0", () => {
      const groups: (string | undefined)[] = ["a", "b"];
      const result = getSafeGroups(groups, 0);
      expect(result).toEqual([]);
    });
  });

  describe("type safety", () => {
    it("should accept readonly arrays as input", () => {
      const groups: readonly (string | undefined)[] = ["a", "b", "c"];

      // All functions should accept readonly arrays
      expect(safeGroup(groups, 0)).toBe("a");
      expect(getSafeGroups(groups, 3)).toEqual(["a", "b", "c"]);
      expect(getSafeGroups(groups, 4)).toEqual(["a", "b", "c", ""]);
    });

    it("should return arrays from getSafeGroups", () => {
      const groups: (string | undefined)[] = ["a", "b", "c"];
      const result = getSafeGroups(groups, 3);

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("integration with regex match groups", () => {
    it("should work with real regex match groups", () => {
      // Simple test case: match delimiter, whitespace, and text
      const regex = /([}\],])(\s+)([a-z]+)/g;
      const input = "}\n  test";
      const match = regex.exec(input);

      expect(match).not.toBeNull();
      if (match) {
        // Groups are in match.slice(1)
        const groups = match.slice(1) as (string | undefined)[];
        const [delimiter, whitespace, text] = getSafeGroups(groups, 3);

        expect(delimiter).toBe("}");
        expect(whitespace).toBe("\n  ");
        expect(text).toBe("test");
      }
    });

    it("should handle non-matching optional groups", () => {
      // Regex with optional group (using 3 capture groups to match getSafeGroups)
      const regex = /([a-z]+)?(\d+)(\s*)/g;
      const input = "123";
      const match = regex.exec(input);

      if (match) {
        const groups = match.slice(1) as (string | undefined)[];
        const [letters, numbers, whitespace] = getSafeGroups(groups, 3);

        // First group didn't match, should be empty string
        expect(letters).toBe("");
        expect(numbers).toBe("123");
        expect(whitespace).toBe("");
      }
    });
  });
});
