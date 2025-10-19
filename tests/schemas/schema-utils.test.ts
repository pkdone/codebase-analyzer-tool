import {
  normalizeEnumValue,
  normalizeEnumArray,
  normalizeOptionalEnumValue,
  DEFAULT_INVALID_VALUE,
} from "../../src/common/schema/schema-utils";

const ALLOWED = ["ONE", "TWO", "THREE"] as const;
const INVALID = DEFAULT_INVALID_VALUE;

describe("schema-utils normalization", () => {
  test("normalizeEnumValue returns uppercased valid value", () => {
  expect(normalizeEnumValue("one", ALLOWED)).toBe("ONE");
  });

  test("normalizeEnumValue returns INVALID for unknown", () => {
  expect(normalizeEnumValue("four", ALLOWED)).toBe(INVALID);
  });

  test("normalizeEnumArray handles string input", () => {
  expect(normalizeEnumArray("two", ALLOWED)).toEqual(["TWO"]);
  });

  test("normalizeEnumArray handles array with mix of valid/invalid", () => {
  expect(normalizeEnumArray(["three", "bad"], ALLOWED)).toEqual(["THREE", INVALID]);
  });

  test("normalizeOptionalEnumValue trims and invalidates", () => {
  expect(normalizeOptionalEnumValue(" one ", ALLOWED)).toBe("ONE");
  expect(normalizeOptionalEnumValue("  ", ALLOWED)).toBeUndefined();
  expect(normalizeOptionalEnumValue("unknown", ALLOWED)).toBe(INVALID);
  });
});
