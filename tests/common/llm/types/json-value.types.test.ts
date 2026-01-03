import { describe, test, expect } from "@jest/globals";
import {
  isJsonPrimitive,
  isJsonObject,
  isJsonArray,
  isJsonValue,
  type JsonValue,
  type JsonObject,
  type JsonArray,
  type JsonPrimitive,
} from "../../../../src/common/llm/types/json-value.types";

/**
 * Unit tests for JsonValue types and type guards.
 *
 * These tests verify:
 * 1. Type guards correctly identify JSON value types
 * 2. Type narrowing works properly for TypeScript inference
 * 3. Types are compatible with JSON.parse output
 */
describe("JsonValue Types", () => {
  describe("isJsonPrimitive", () => {
    test("should return true for null", () => {
      expect(isJsonPrimitive(null)).toBe(true);
    });

    test("should return true for strings", () => {
      expect(isJsonPrimitive("")).toBe(true);
      expect(isJsonPrimitive("hello")).toBe(true);
      expect(isJsonPrimitive("hello world")).toBe(true);
    });

    test("should return true for numbers", () => {
      expect(isJsonPrimitive(0)).toBe(true);
      expect(isJsonPrimitive(42)).toBe(true);
      expect(isJsonPrimitive(-3.14159)).toBe(true);
      expect(isJsonPrimitive(Number.MAX_SAFE_INTEGER)).toBe(true);
    });

    test("should return true for booleans", () => {
      expect(isJsonPrimitive(true)).toBe(true);
      expect(isJsonPrimitive(false)).toBe(true);
    });

    test("should return false for undefined", () => {
      expect(isJsonPrimitive(undefined)).toBe(false);
    });

    test("should return false for objects", () => {
      expect(isJsonPrimitive({})).toBe(false);
      expect(isJsonPrimitive({ key: "value" })).toBe(false);
    });

    test("should return false for arrays", () => {
      expect(isJsonPrimitive([])).toBe(false);
      expect(isJsonPrimitive([1, 2, 3])).toBe(false);
    });

    test("should return false for functions", () => {
      expect(isJsonPrimitive(() => {})).toBe(false);
    });

    test("should return false for symbols", () => {
      expect(isJsonPrimitive(Symbol("test"))).toBe(false);
    });

    test("should return false for BigInt", () => {
      expect(isJsonPrimitive(BigInt(9007199254740991))).toBe(false);
    });
  });

  describe("isJsonObject", () => {
    test("should return true for empty object literal", () => {
      expect(isJsonObject({})).toBe(true);
    });

    test("should return true for object with properties", () => {
      expect(isJsonObject({ key: "value" })).toBe(true);
      expect(isJsonObject({ nested: { deep: { value: 42 } } })).toBe(true);
    });

    test("should return false for null", () => {
      expect(isJsonObject(null)).toBe(false);
    });

    test("should return false for arrays", () => {
      expect(isJsonObject([])).toBe(false);
      expect(isJsonObject([1, 2, 3])).toBe(false);
      expect(isJsonObject([{ key: "value" }])).toBe(false);
    });

    test("should return false for primitives", () => {
      expect(isJsonObject("string")).toBe(false);
      expect(isJsonObject(42)).toBe(false);
      expect(isJsonObject(true)).toBe(false);
    });

    test("should return false for Date objects", () => {
      expect(isJsonObject(new Date())).toBe(false);
    });

    test("should return false for Map objects", () => {
      expect(isJsonObject(new Map())).toBe(false);
    });

    test("should return false for Set objects", () => {
      expect(isJsonObject(new Set())).toBe(false);
    });

    test("should return false for custom class instances", () => {
      class CustomClass {
        value = 42;
      }
      expect(isJsonObject(new CustomClass())).toBe(false);
    });

    test("should return false for Object.create(null)", () => {
      // Object.create(null) has no constructor
      const obj = Object.create(null);
      obj.key = "value";
      expect(isJsonObject(obj)).toBe(false);
    });
  });

  describe("isJsonArray", () => {
    test("should return true for empty array", () => {
      expect(isJsonArray([])).toBe(true);
    });

    test("should return true for array with primitives", () => {
      expect(isJsonArray([1, 2, 3])).toBe(true);
      expect(isJsonArray(["a", "b", "c"])).toBe(true);
      expect(isJsonArray([true, false])).toBe(true);
    });

    test("should return true for array with objects", () => {
      expect(isJsonArray([{ id: 1 }, { id: 2 }])).toBe(true);
    });

    test("should return true for mixed arrays", () => {
      expect(isJsonArray([1, "two", { three: 3 }, null])).toBe(true);
    });

    test("should return true for nested arrays", () => {
      expect(
        isJsonArray([
          [1, 2],
          [3, 4],
        ]),
      ).toBe(true);
    });

    test("should return false for non-arrays", () => {
      expect(isJsonArray(null)).toBe(false);
      expect(isJsonArray(undefined)).toBe(false);
      expect(isJsonArray({})).toBe(false);
      expect(isJsonArray("not an array")).toBe(false);
      expect(isJsonArray(42)).toBe(false);
    });
  });

  describe("isJsonValue", () => {
    test("should return true for all primitives", () => {
      expect(isJsonValue(null)).toBe(true);
      expect(isJsonValue("string")).toBe(true);
      expect(isJsonValue(42)).toBe(true);
      expect(isJsonValue(true)).toBe(true);
    });

    test("should return true for plain objects", () => {
      expect(isJsonValue({})).toBe(true);
      expect(isJsonValue({ key: "value" })).toBe(true);
    });

    test("should return true for arrays", () => {
      expect(isJsonValue([])).toBe(true);
      expect(isJsonValue([1, 2, 3])).toBe(true);
    });

    test("should return false for undefined", () => {
      expect(isJsonValue(undefined)).toBe(false);
    });

    test("should return false for functions", () => {
      expect(isJsonValue(() => {})).toBe(false);
    });

    test("should return false for symbols", () => {
      expect(isJsonValue(Symbol("test"))).toBe(false);
    });

    test("should return false for built-in objects", () => {
      expect(isJsonValue(new Date())).toBe(false);
      expect(isJsonValue(new Map())).toBe(false);
      expect(isJsonValue(new Set())).toBe(false);
      expect(isJsonValue(/regex/)).toBe(false);
    });

    test("should work with JSON.parse output", () => {
      const parsed = JSON.parse('{"name": "test", "count": 42, "items": [1, 2, 3]}');
      expect(isJsonValue(parsed)).toBe(true);
    });
  });

  describe("Type Assignment Compatibility", () => {
    test("should allow assigning JSON primitives to JsonPrimitive", () => {
      const str: JsonPrimitive = "test";
      const num: JsonPrimitive = 42;
      const bool: JsonPrimitive = true;
      const nul: JsonPrimitive = null;

      expect(str).toBe("test");
      expect(num).toBe(42);
      expect(bool).toBe(true);
      expect(nul).toBeNull();
    });

    test("should allow assigning plain objects to JsonObject", () => {
      const obj: JsonObject = { key: "value", nested: { deep: 42 } };
      expect(obj.key).toBe("value");
    });

    test("should allow assigning arrays to JsonArray", () => {
      const arr: JsonArray = [1, "two", { three: 3 }, null];
      expect(arr.length).toBe(4);
    });

    test("should allow assigning any JSON type to JsonValue", () => {
      const primitiveVal: JsonValue = "string";
      const objectVal: JsonValue = { key: "value" };
      const arrayVal: JsonValue = [1, 2, 3];
      const nullVal: JsonValue = null;

      expect(primitiveVal).toBe("string");
      expect(objectVal).toEqual({ key: "value" });
      expect(arrayVal).toEqual([1, 2, 3]);
      expect(nullVal).toBeNull();
    });

    test("should allow nested structures", () => {
      const complex: JsonValue = {
        users: [
          { id: 1, name: "Alice", metadata: { role: "admin" } },
          { id: 2, name: "Bob", metadata: { role: "user" } },
        ],
        config: {
          enabled: true,
          settings: ["option1", "option2"],
        },
      };

      expect(complex).toBeDefined();
      if (isJsonObject(complex)) {
        expect(complex.users).toBeDefined();
      }
    });
  });

  describe("Type Narrowing", () => {
    test("should narrow type with isJsonPrimitive", () => {
      const value: unknown = "test";
      if (isJsonPrimitive(value)) {
        // TypeScript should allow these operations
        if (typeof value === "string") {
          expect(value.toUpperCase()).toBe("TEST");
        }
      }
    });

    test("should narrow type with isJsonObject", () => {
      const value: unknown = { key: "value" };
      if (isJsonObject(value)) {
        // TypeScript should allow property access
        expect(value.key).toBe("value");
      }
    });

    test("should narrow type with isJsonArray", () => {
      const value: unknown = [1, 2, 3];
      if (isJsonArray(value)) {
        // TypeScript should allow array operations
        expect(value.length).toBe(3);
        expect(value[0]).toBe(1);
      }
    });

    test("should support discriminated type narrowing chain", () => {
      function processJsonValue(value: unknown): string {
        if (!isJsonValue(value)) {
          return "invalid";
        }
        if (isJsonPrimitive(value)) {
          return `primitive:${String(value)}`;
        }
        if (isJsonArray(value)) {
          return `array:${value.length}`;
        }
        if (isJsonObject(value)) {
          return `object:${Object.keys(value).length}`;
        }
        return "unknown";
      }

      expect(processJsonValue("hello")).toBe("primitive:hello");
      expect(processJsonValue(42)).toBe("primitive:42");
      expect(processJsonValue(null)).toBe("primitive:null");
      expect(processJsonValue([1, 2, 3])).toBe("array:3");
      expect(processJsonValue({ a: 1, b: 2 })).toBe("object:2");
      expect(processJsonValue(undefined)).toBe("invalid");
      expect(processJsonValue(() => {})).toBe("invalid");
    });
  });

  describe("JSON.parse Compatibility", () => {
    test("should be compatible with all JSON.parse results", () => {
      const testCases = [
        '"string"',
        "42",
        "true",
        "false",
        "null",
        "[]",
        "[1, 2, 3]",
        '["a", "b"]',
        "{}",
        '{"key": "value"}',
        '{"nested": {"deep": {"value": 42}}}',
        '[{"id": 1}, {"id": 2}]',
      ];

      testCases.forEach((json) => {
        const parsed: unknown = JSON.parse(json);
        expect(isJsonValue(parsed)).toBe(true);

        // Should be assignable to JsonValue type
        const _typed: JsonValue = parsed as JsonValue;
        expect(_typed).toBeDefined();
      });
    });
  });
});
