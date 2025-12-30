import { deepMap, deepMapObject } from "../../../../../src/common/llm/json-processing/utils/object-traversal";

describe("deepMap", () => {
  describe("primitive handling", () => {
    it("should return primitives unchanged when visitor is identity", () => {
      expect(deepMap(42, (v: unknown) => v)).toBe(42);
      expect(deepMap("hello", (v: unknown) => v)).toBe("hello");
      expect(deepMap(true, (v: unknown) => v)).toBe(true);
      expect(deepMap(null, (v: unknown) => v)).toBe(null);
      expect(deepMap(undefined, (v: unknown) => v)).toBe(undefined);
    });

    it("should transform primitives when visitor modifies them", () => {
      expect(deepMap(42, (v: unknown) => (typeof v === "number" ? v * 2 : v))).toBe(84);
      expect(deepMap("hello", (v: unknown) => (typeof v === "string" ? v.toUpperCase() : v))).toBe(
        "HELLO",
      );
      expect(deepMap(null, (v: unknown) => (v === null ? undefined : v))).toBe(undefined);
    });
  });

  describe("array handling", () => {
    it("should map over array elements", () => {
      const input = [1, 2, 3];
      const result = deepMap(input, (v: unknown) => (typeof v === "number" ? v * 2 : v));
      expect(result).toEqual([2, 4, 6]);
    });

    it("should handle nested arrays", () => {
      const input = [[1, 2], [3, 4]];
      const result = deepMap(input, (v: unknown) => (typeof v === "number" ? v * 2 : v));
      expect(result).toEqual([[2, 4], [6, 8]]);
    });

    it("should handle empty arrays", () => {
      const input: unknown[] = [];
      const result = deepMap(input, (v: unknown) => v);
      expect(result).toEqual([]);
    });
  });

  describe("object handling", () => {
    it("should traverse plain objects", () => {
      const input = { a: 1, b: 2 };
      const result = deepMap(input, (v: unknown) => (typeof v === "number" ? v * 2 : v));
      expect(result).toEqual({ a: 2, b: 4 });
    });

    it("should handle nested objects", () => {
      const input = { a: { b: 1, c: 2 } };
      const result = deepMap(input, (v: unknown) => (typeof v === "number" ? v * 2 : v));
      expect(result).toEqual({ a: { b: 2, c: 4 } });
    });

    it("should handle objects with arrays", () => {
      const input = { items: [1, 2, 3] };
      const result = deepMap(input, (v: unknown) => (typeof v === "number" ? v * 2 : v));
      expect(result).toEqual({ items: [2, 4, 6] });
    });

    it("should preserve symbol keys", () => {
      const sym = Symbol("test");
      const input = { [sym]: 42, regular: 1 };
      const result = deepMap(input, (v: unknown) => (typeof v === "number" ? v * 2 : v));
      expect(result).toEqual({ [sym]: 84, regular: 2 });
    });
  });

  describe("circular reference handling", () => {
    it("should prevent infinite recursion on circular references", () => {
      const obj: Record<string, unknown> = { a: 1 };
      obj.self = obj; // Create circular reference

      const result = deepMap(obj, (v: unknown) => v) as Record<string, unknown>;
      expect(result).toEqual({ a: 1, self: obj });
      expect(result.self).toBe(obj); // Should reference the original object
    });

    it("should handle complex circular structures", () => {
      const obj1: Record<string, unknown> = { name: "obj1" };
      const obj2: Record<string, unknown> = { name: "obj2", ref: obj1 };
      obj1.ref = obj2; // Create circular reference

      const result = deepMap(obj1, (v: unknown) => v);
      expect(result).toEqual({ name: "obj1", ref: { name: "obj2", ref: obj1 } });
    });
  });

  describe("special object handling", () => {
    it("should preserve Date objects", () => {
      const date = new Date("2023-01-01");
      const input = { timestamp: date };
      const result = deepMap(input, (v: unknown) => v) as { timestamp: unknown };
      expect(result.timestamp).toBe(date);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it("should preserve RegExp objects", () => {
      const regex = /test/gi;
      const input = { pattern: regex };
      const result = deepMap(input, (v: unknown) => v) as { pattern: unknown };
      expect(result.pattern).toBe(regex);
      expect(result.pattern).toBeInstanceOf(RegExp);
    });

    it("should preserve Map objects", () => {
      const map = new Map([["key", "value"]]);
      const input = { data: map };
      const result = deepMap(input, (v: unknown) => v) as { data: unknown };
      expect(result.data).toBe(map);
      expect(result.data).toBeInstanceOf(Map);
    });
  });
});

describe("deepMapObject", () => {
  describe("property inclusion", () => {
    it("should omit properties when shouldInclude returns false", () => {
      const input = { a: 1, b: null, c: 2 };
      const result = deepMapObject(
        input,
        (v: unknown) => (v === null ? undefined : v),
        {
          shouldInclude: (_key: string, val: unknown) => val !== undefined,
        },
      );
      expect(result).toEqual({ a: 1, c: 2 });
    });

    it("should convert null to undefined and omit", () => {
      const input = { name: "foo", groupId: null, nested: { value: null } };
      const result = deepMapObject(
        input,
        (v: unknown) => (v === null ? undefined : v),
        {
          shouldInclude: (_key: string, val: unknown) => val !== undefined,
        },
      );
      expect(result).toEqual({ name: "foo", nested: {} });
    });
  });

  describe("key transformation", () => {
    it("should transform keys when transformKey is provided", () => {
      const input = { type_: "string", name_: "param1", value: 123 };
      const result = deepMapObject(
        input,
        (v: unknown) => v,
        {
          transformKey: (key: string) => (key.endsWith("_") && key.length > 1 ? key.slice(0, -1) : key),
        },
      );
      expect(result).toEqual({ type: "string", name: "param1", value: 123 });
    });

    it("should skip properties when transformKey returns null", () => {
      const input = { keep: "value", skip: "value" };
      const result = deepMapObject(
        input,
        (v: unknown) => v,
        {
          transformKey: (key: string) => (key === "skip" ? null : key),
        },
      );
      expect(result).toEqual({ keep: "value" });
    });
  });
});

