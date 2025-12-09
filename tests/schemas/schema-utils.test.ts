import {
  createCaseInsensitiveEnumSchema,
  normalizeEnumArray,
  DEFAULT_INVALID_VALUE,
} from "../../src/common/schema/schema-utils";

const ALLOWED = ["ONE", "TWO", "THREE"] as const;
const INVALID = DEFAULT_INVALID_VALUE;

describe("schema-utils normalization", () => {
  describe("createCaseInsensitiveEnumSchema", () => {
    const schema = createCaseInsensitiveEnumSchema(ALLOWED);

    test("returns uppercased valid value", () => {
      const result = schema.parse("one");
      expect(result).toBe("ONE");
    });

    test("returns INVALID for unknown value", () => {
      const result = schema.parse("four");
      expect(result).toBe(INVALID);
    });

    test("handles already uppercase values", () => {
      const result = schema.parse("TWO");
      expect(result).toBe("TWO");
    });

    test("handles mixed case values", () => {
      const result = schema.parse("ThReE");
      expect(result).toBe("THREE");
    });

    test("rejects non-string values", () => {
      expect(() => schema.parse(123)).toThrow();
      expect(() => schema.parse(null)).toThrow();
      expect(() => schema.parse(undefined)).toThrow();
    });
  });

  describe("normalizeEnumArray", () => {
    test("handles string input", () => {
      expect(normalizeEnumArray("two", ALLOWED)).toEqual(["TWO"]);
    });

    test("handles array with mix of valid/invalid", () => {
      expect(normalizeEnumArray(["three", "bad"], ALLOWED)).toEqual(["THREE", INVALID]);
    });

    test("handles array with all valid values", () => {
      expect(normalizeEnumArray(["one", "two", "three"], ALLOWED)).toEqual(["ONE", "TWO", "THREE"]);
    });

    test("filters out non-string values from array", () => {
      expect(normalizeEnumArray(["one", 123, "two"], ALLOWED)).toEqual(["ONE", "TWO"]);
    });

    test("handles empty array", () => {
      expect(normalizeEnumArray([], ALLOWED)).toEqual([]);
    });

    test("handles non-string, non-array input", () => {
      expect(normalizeEnumArray(123, ALLOWED)).toBe(123);
      expect(normalizeEnumArray(null, ALLOWED)).toBe(null);
    });
  });
});
