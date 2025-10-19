import {
  normalizeEnumValue,
  normalizeEnumArray,
  normalizeOptionalEnumValue,
} from "../../src/common/schema/schema-utils";

const ALLOWED = ["ONE", "TWO", "THREE"] as const;
const INVALID = "INVALID";

describe("schema-utils normalization", () => {
  test("normalizeEnumValue returns uppercased valid value", () => {
    expect(normalizeEnumValue("one", ALLOWED, INVALID)).toBe("ONE");
  });

  test("normalizeEnumValue returns INVALID for unknown", () => {
    expect(normalizeEnumValue("four", ALLOWED, INVALID)).toBe(INVALID);
  });

  test("normalizeEnumArray handles string input", () => {
    expect(normalizeEnumArray("two", ALLOWED, INVALID)).toEqual(["TWO"]);
  });

  test("normalizeEnumArray handles array with mix of valid/invalid", () => {
    expect(normalizeEnumArray(["three", "bad"], ALLOWED, INVALID)).toEqual(["THREE", INVALID]);
  });

  test("normalizeOptionalEnumValue trims and invalidates", () => {
    expect(normalizeOptionalEnumValue(" one ", ALLOWED, INVALID)).toBe("ONE");
    expect(normalizeOptionalEnumValue("  ", ALLOWED, INVALID)).toBeUndefined();
    expect(normalizeOptionalEnumValue("unknown", ALLOWED, INVALID)).toBe(INVALID);
  });
});
