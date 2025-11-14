import {
  isJsonObject,
  isJsonArray,
  isString,
  isFiniteNumber,
  isBoolean,
  isNull,
  isJsonPrimitive,
  isJsonValue,
} from "../../../src/llm/json-processing/types/type-guards";

describe("Type Guards", () => {
  describe("isJsonObject", () => {
    it("returns true for plain objects", () => {
      expect(isJsonObject({})).toBe(true);
      expect(isJsonObject({ key: "value" })).toBe(true);
      expect(isJsonObject({ nested: { object: true } })).toBe(true);
    });

    it("returns false for null", () => {
      expect(isJsonObject(null)).toBe(false);
    });

    it("returns false for arrays", () => {
      expect(isJsonObject([])).toBe(false);
      expect(isJsonObject([1, 2, 3])).toBe(false);
    });

    it("returns false for primitives", () => {
      expect(isJsonObject("string")).toBe(false);
      expect(isJsonObject(123)).toBe(false);
      expect(isJsonObject(true)).toBe(false);
      expect(isJsonObject(undefined)).toBe(false);
    });

    it("returns true for object with unknown properties", () => {
      const obj: unknown = { a: 1, b: "test", c: null };
      expect(isJsonObject(obj)).toBe(true);
    });
  });

  describe("isJsonArray", () => {
    it("returns true for arrays", () => {
      expect(isJsonArray([])).toBe(true);
      expect(isJsonArray([1, 2, 3])).toBe(true);
      expect(isJsonArray(["a", "b", "c"])).toBe(true);
      expect(isJsonArray([{ key: "value" }])).toBe(true);
    });

    it("returns false for non-arrays", () => {
      expect(isJsonArray({})).toBe(false);
      expect(isJsonArray("string")).toBe(false);
      expect(isJsonArray(123)).toBe(false);
      expect(isJsonArray(null)).toBe(false);
      expect(isJsonArray(undefined)).toBe(false);
    });

    it("returns true for array with unknown elements", () => {
      const arr: unknown = [1, "test", null, { key: "value" }];
      expect(isJsonArray(arr)).toBe(true);
    });
  });

  describe("isString", () => {
    it("returns true for strings", () => {
      expect(isString("")).toBe(true);
      expect(isString("hello")).toBe(true);
      expect(isString("123")).toBe(true);
      expect(isString("test")).toBe(true);
    });

    it("returns false for non-strings", () => {
      expect(isString(123)).toBe(false);
      expect(isString(true)).toBe(false);
      expect(isString(null)).toBe(false);
      expect(isString(undefined)).toBe(false);
      expect(isString({})).toBe(false);
      expect(isString([])).toBe(false);
    });

    it("narrows type correctly", () => {
      const value: unknown = "test";
      if (isString(value)) {
        // TypeScript should allow string methods here
        const upper: string = value.toUpperCase();
        expect(upper).toBe("TEST");
      }
    });
  });

  describe("isFiniteNumber", () => {
    it("returns true for finite numbers", () => {
      expect(isFiniteNumber(0)).toBe(true);
      expect(isFiniteNumber(123)).toBe(true);
      expect(isFiniteNumber(-456)).toBe(true);
      expect(isFiniteNumber(3.14)).toBe(true);
      expect(isFiniteNumber(-0.5)).toBe(true);
    });

    it("returns false for NaN", () => {
      expect(isFiniteNumber(NaN)).toBe(false);
    });

    it("returns false for Infinity", () => {
      expect(isFiniteNumber(Infinity)).toBe(false);
      expect(isFiniteNumber(-Infinity)).toBe(false);
    });

    it("returns false for non-numbers", () => {
      expect(isFiniteNumber("123")).toBe(false);
      expect(isFiniteNumber(null)).toBe(false);
      expect(isFiniteNumber(undefined)).toBe(false);
      expect(isFiniteNumber(true)).toBe(false);
    });
  });

  describe("isBoolean", () => {
    it("returns true for booleans", () => {
      expect(isBoolean(true)).toBe(true);
      expect(isBoolean(false)).toBe(true);
      expect(isBoolean(Boolean(1))).toBe(true);
    });

    it("returns false for non-booleans", () => {
      expect(isBoolean(0)).toBe(false);
      expect(isBoolean(1)).toBe(false);
      expect(isBoolean("true")).toBe(false);
      expect(isBoolean(null)).toBe(false);
      expect(isBoolean(undefined)).toBe(false);
    });
  });

  describe("isNull", () => {
    it("returns true for null", () => {
      expect(isNull(null)).toBe(true);
    });

    it("returns false for non-null values", () => {
      expect(isNull(undefined)).toBe(false);
      expect(isNull(0)).toBe(false);
      expect(isNull("")).toBe(false);
      expect(isNull(false)).toBe(false);
      expect(isNull({})).toBe(false);
      expect(isNull([])).toBe(false);
    });
  });

  describe("isJsonPrimitive", () => {
    it("returns true for JSON primitives", () => {
      expect(isJsonPrimitive("string")).toBe(true);
      expect(isJsonPrimitive(123)).toBe(true);
      expect(isJsonPrimitive(true)).toBe(true);
      expect(isJsonPrimitive(false)).toBe(true);
      expect(isJsonPrimitive(null)).toBe(true);
    });

    it("returns false for non-primitives", () => {
      expect(isJsonPrimitive({})).toBe(false);
      expect(isJsonPrimitive([])).toBe(false);
      expect(isJsonPrimitive(undefined)).toBe(false);
    });

    it("returns false for NaN and Infinity", () => {
      expect(isJsonPrimitive(NaN)).toBe(false);
      expect(isJsonPrimitive(Infinity)).toBe(false);
      expect(isJsonPrimitive(-Infinity)).toBe(false);
    });
  });

  describe("isJsonValue", () => {
    it("returns true for all JSON value types", () => {
      // Primitives
      expect(isJsonValue("string")).toBe(true);
      expect(isJsonValue(123)).toBe(true);
      expect(isJsonValue(true)).toBe(true);
      expect(isJsonValue(null)).toBe(true);

      // Objects
      expect(isJsonValue({})).toBe(true);
      expect(isJsonValue({ key: "value" })).toBe(true);

      // Arrays
      expect(isJsonValue([])).toBe(true);
      expect(isJsonValue([1, 2, 3])).toBe(true);
    });

    it("returns false for undefined", () => {
      expect(isJsonValue(undefined)).toBe(false);
    });

    it("returns false for functions", () => {
      expect(isJsonValue(() => {})).toBe(false);
    });

    it("returns false for symbols", () => {
      expect(isJsonValue(Symbol("test"))).toBe(false);
    });

    it("returns false for NaN and Infinity", () => {
      expect(isJsonValue(NaN)).toBe(false);
      expect(isJsonValue(Infinity)).toBe(false);
    });

    it("handles complex nested structures", () => {
      const complex = {
        string: "value",
        number: 42,
        boolean: true,
        null: null,
        array: [1, 2, 3],
        nested: { key: "value" },
      };
      expect(isJsonValue(complex)).toBe(true);
    });
  });

  describe("Type narrowing in practice", () => {
    it("allows safe property access after type guard", () => {
      const data: unknown = { name: "test", count: 42 };

      if (isJsonObject(data)) {
        expect(data.name).toBe("test");
        expect(data.count).toBe(42);
      } else {
        fail("Expected data to be a JSON object");
      }
    });

    it("allows safe array access after type guard", () => {
      const data: unknown = [1, 2, 3];

      if (isJsonArray(data)) {
        expect(data[0]).toBe(1);
        expect(data.length).toBe(3);
      } else {
        fail("Expected data to be an array");
      }
    });

    it("allows safe string operations after type guard", () => {
      const data: unknown = "hello world";

      if (isString(data)) {
        expect(data.toUpperCase()).toBe("HELLO WORLD");
        expect(data.split(" ")).toEqual(["hello", "world"]);
      } else {
        fail("Expected data to be a string");
      }
    });
  });
});
