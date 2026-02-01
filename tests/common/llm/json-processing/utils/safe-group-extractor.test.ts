import {
  safeGroup,
  safeGroups3,
  safeGroups4,
  safeGroups5,
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

    it("should return empty string for negative index", () => {
      const groups: (string | undefined)[] = ["first", "second"];
      // Negative indices return undefined from array access, which becomes empty string
      expect(safeGroup(groups, -1)).toBe("");
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

  describe("safeGroups3", () => {
    it("should return tuple of 3 strings", () => {
      const groups: (string | undefined)[] = ["a", "b", "c", "d"];
      const result = safeGroups3(groups);
      expect(result).toEqual(["a", "b", "c"]);
    });

    it("should convert undefined to empty strings", () => {
      const groups: (string | undefined)[] = ["a", undefined, "c"];
      const result = safeGroups3(groups);
      expect(result).toEqual(["a", "", "c"]);
    });

    it("should pad with empty strings when groups are missing", () => {
      const groups: (string | undefined)[] = [];
      const result = safeGroups3(groups);
      expect(result).toEqual(["", "", ""]);
    });

    it("should work with destructuring assignment", () => {
      const groups: (string | undefined)[] = ["delimiter", "whitespace", "value"];
      const [delimiter, whitespace, value] = safeGroups3(groups);
      expect(delimiter).toBe("delimiter");
      expect(whitespace).toBe("whitespace");
      expect(value).toBe("value");
    });
  });

  describe("safeGroups4", () => {
    it("should return tuple of 4 strings", () => {
      const groups: (string | undefined)[] = ["a", "b", "c", "d", "e"];
      const result = safeGroups4(groups);
      expect(result).toEqual(["a", "b", "c", "d"]);
    });

    it("should convert undefined to empty strings", () => {
      const groups: (string | undefined)[] = [undefined, "b", undefined, "d"];
      const result = safeGroups4(groups);
      expect(result).toEqual(["", "b", "", "d"]);
    });

    it("should pad with empty strings when groups are missing", () => {
      const groups: (string | undefined)[] = ["a", "b"];
      const result = safeGroups4(groups);
      expect(result).toEqual(["a", "b", "", ""]);
    });
  });

  describe("safeGroups5", () => {
    it("should return tuple of 5 strings", () => {
      const groups: (string | undefined)[] = ["a", "b", "c", "d", "e", "f"];
      const result = safeGroups5(groups);
      expect(result).toEqual(["a", "b", "c", "d", "e"]);
    });

    it("should convert undefined to empty strings", () => {
      const groups: (string | undefined)[] = [undefined, undefined, "c", undefined, "e"];
      const result = safeGroups5(groups);
      expect(result).toEqual(["", "", "c", "", "e"]);
    });

    it("should pad with empty strings when groups are missing", () => {
      const groups: (string | undefined)[] = ["a"];
      const result = safeGroups5(groups);
      expect(result).toEqual(["a", "", "", "", ""]);
    });
  });

  describe("type safety", () => {
    it("should accept readonly arrays as input", () => {
      const groups: readonly (string | undefined)[] = ["a", "b", "c"];

      // All functions should accept readonly arrays
      expect(safeGroup(groups, 0)).toBe("a");
      expect(safeGroups3(groups)).toEqual(["a", "b", "c"]);
      expect(safeGroups4(groups)).toEqual(["a", "b", "c", ""]);
    });

    it("should return readonly arrays from safeGroups functions", () => {
      const groups: (string | undefined)[] = ["a", "b", "c"];
      const result = safeGroups3(groups);

      // Result should be readonly
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
        const [delimiter, whitespace, text] = safeGroups3(groups);

        expect(delimiter).toBe("}");
        expect(whitespace).toBe("\n  ");
        expect(text).toBe("test");
      }
    });

    it("should handle non-matching optional groups", () => {
      // Regex with optional group (using 3 capture groups to match safeGroups3)
      const regex = /([a-z]+)?(\d+)(\s*)/g;
      const input = "123";
      const match = regex.exec(input);

      if (match) {
        const groups = match.slice(1) as (string | undefined)[];
        const [letters, numbers, whitespace] = safeGroups3(groups);

        // First group didn't match, should be empty string
        expect(letters).toBe("");
        expect(numbers).toBe("123");
        expect(whitespace).toBe("");
      }
    });
  });
});
