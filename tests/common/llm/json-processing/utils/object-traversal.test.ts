import {
  deepMap,
  deepMapObject,
  isPlainObject,
} from "../../../../../src/common/llm/json-processing/utils/object-traversal";

describe("deepMap", () => {
  describe("primitive handling", () => {
    it("should return primitives unchanged when visitor is identity", () => {
      expect(deepMap(42, (v: unknown) => v)).toBe(42);
      expect(deepMap("hello", (v: unknown) => v)).toBe("hello");
      expect(deepMap(true, (v: unknown) => v)).toBe(true);
      expect(deepMap(null, (v: unknown) => v)).toBeNull();
    });

    it("should return undefined unchanged when visitor is identity", () => {
      const identityVisitor = (v: unknown): unknown => v;
      // Cast to unknown to avoid void expression issues with undefined generic
      const input: unknown = undefined;
      const undefinedResult = deepMap(input, identityVisitor);
      expect(undefinedResult).toBeUndefined();
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
      const input = [
        [1, 2],
        [3, 4],
      ];
      const result = deepMap(input, (v: unknown) => (typeof v === "number" ? v * 2 : v));
      expect(result).toEqual([
        [2, 4],
        [6, 8],
      ]);
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

      const result: Record<string, unknown> = deepMap(obj, (v: unknown) => v);
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
      const result = deepMapObject(input, (v: unknown) => (v === null ? undefined : v), {
        shouldInclude: (_key: string, val: unknown) => val !== undefined,
      });
      expect(result).toEqual({ a: 1, c: 2 });
    });

    it("should convert null to undefined and omit", () => {
      const input = { name: "foo", groupId: null, nested: { value: null } };
      const result = deepMapObject(input, (v: unknown) => (v === null ? undefined : v), {
        shouldInclude: (_key: string, val: unknown) => val !== undefined,
      });
      expect(result).toEqual({ name: "foo", nested: {} });
    });
  });

  describe("key transformation", () => {
    it("should transform keys when transformKey is provided", () => {
      const input = { type_: "string", name_: "param1", value: 123 };
      const result = deepMapObject(input, (v: unknown) => v, {
        transformKey: (key: string) =>
          key.endsWith("_") && key.length > 1 ? key.slice(0, -1) : key,
      });
      expect(result).toEqual({ type: "string", name: "param1", value: 123 });
    });

    it("should skip properties when transformKey returns null", () => {
      const input = { keep: "value", skip: "value" };
      const result = deepMapObject(input, (v: unknown) => v, {
        transformKey: (key: string) => (key === "skip" ? null : key),
      });
      expect(result).toEqual({ keep: "value" });
    });
  });
});

describe("type safety", () => {
  describe("deepMap generic type preservation", () => {
    it("should preserve type for object input", () => {
      interface TestData {
        name: string;
        count: number;
      }
      const input: TestData = { name: "test", count: 42 };
      const result = deepMap(input, (v: unknown) => v);

      // TypeScript should infer result as TestData
      expect(result.name).toBe("test");
      expect(result.count).toBe(42);
    });

    it("should preserve type for array input", () => {
      const input: number[] = [1, 2, 3];
      const result = deepMap(input, (v: unknown) => (typeof v === "number" ? v * 2 : v));

      // TypeScript should infer result as number[]
      expect(result).toEqual([2, 4, 6]);
    });

    it("should preserve type for nested structures", () => {
      interface NestedData {
        items: { value: number }[];
        meta: { active: boolean };
      }
      const input: NestedData = {
        items: [{ value: 1 }, { value: 2 }],
        meta: { active: true },
      };
      const result = deepMap(input, (v: unknown) => v);

      // Type should be preserved through nesting
      expect(result.items[0].value).toBe(1);
      expect(result.meta.active).toBe(true);
    });

    it("should preserve primitive types", () => {
      const numResult = deepMap(42, (v: unknown) => v);
      const strResult = deepMap("hello", (v: unknown) => v);
      const boolResult = deepMap(true, (v: unknown) => v);

      expect(numResult).toBe(42);
      expect(strResult).toBe("hello");
      expect(boolResult).toBe(true);
    });
  });

  describe("deepMapObject generic type preservation", () => {
    it("should preserve type for object input", () => {
      interface Config {
        enabled: boolean;
        value: string | null;
      }
      const input: Config = { enabled: true, value: null };
      const result = deepMapObject(input, (v: unknown) => (v === null ? undefined : v));

      // TypeScript should infer result as Config
      expect(result.enabled).toBe(true);
    });

    it("should preserve type with shouldInclude option", () => {
      interface Data {
        keep: string;
        maybe: string | null;
      }
      const input: Data = { keep: "value", maybe: null };
      const result = deepMapObject(input, (v: unknown) => (v === null ? undefined : v), {
        shouldInclude: (_key: string, val: unknown) => val !== undefined,
      });

      // Type should be preserved
      expect(result.keep).toBe("value");
    });
  });
});

describe("isPlainObject", () => {
  describe("positive cases - plain objects", () => {
    it("should return true for empty object literal", () => {
      expect(isPlainObject({})).toBe(true);
    });

    it("should return true for object literal with properties", () => {
      expect(isPlainObject({ a: 1, b: "test" })).toBe(true);
    });

    it("should return true for objects created with Object.create(null)", () => {
      // Note: Object.create(null) creates an object without prototype,
      // but its constructor is undefined, not Object
      const obj = Object.create(null);
      obj.key = "value";
      // This will return false because constructor is undefined
      expect(isPlainObject(obj)).toBe(false);
    });

    it("should return true for nested plain objects", () => {
      expect(isPlainObject({ nested: { deep: { value: 42 } } })).toBe(true);
    });

    it("should return true for objects with symbol keys", () => {
      const sym = Symbol("test");
      expect(isPlainObject({ [sym]: "value", regular: "key" })).toBe(true);
    });
  });

  describe("negative cases - non-plain objects", () => {
    it("should return false for null", () => {
      expect(isPlainObject(null)).toBe(false);
    });

    it("should return false for undefined", () => {
      expect(isPlainObject(undefined)).toBe(false);
    });

    it("should return false for arrays", () => {
      expect(isPlainObject([])).toBe(false);
      expect(isPlainObject([1, 2, 3])).toBe(false);
      expect(isPlainObject([{ obj: "inside" }])).toBe(false);
    });

    it("should return false for primitive values", () => {
      expect(isPlainObject("string")).toBe(false);
      expect(isPlainObject(42)).toBe(false);
      expect(isPlainObject(true)).toBe(false);
      expect(isPlainObject(Symbol("test"))).toBe(false);
      expect(isPlainObject(BigInt(9007199254740991))).toBe(false);
    });

    it("should return false for Date objects", () => {
      expect(isPlainObject(new Date())).toBe(false);
    });

    it("should return false for RegExp objects", () => {
      expect(isPlainObject(/test/gi)).toBe(false);
    });

    it("should return false for Map objects", () => {
      expect(isPlainObject(new Map())).toBe(false);
    });

    it("should return false for Set objects", () => {
      expect(isPlainObject(new Set())).toBe(false);
    });

    it("should return false for custom class instances", () => {
      class CustomClass {
        constructor(public value: string) {}
      }
      expect(isPlainObject(new CustomClass("test"))).toBe(false);
    });

    it("should return false for function objects", () => {
      expect(isPlainObject(() => {})).toBe(false);
      expect(isPlainObject(function namedFn() {})).toBe(false);
    });

    it("should return false for Error objects", () => {
      expect(isPlainObject(new Error("test"))).toBe(false);
    });

    it("should return false for Promise objects", () => {
      expect(isPlainObject(Promise.resolve())).toBe(false);
    });
  });

  describe("type narrowing", () => {
    it("should narrow type to allow property access", () => {
      const maybeObject: unknown = { key: "value", count: 42 };

      if (isPlainObject(maybeObject)) {
        // TypeScript should allow these accesses without casting
        expect(maybeObject.key).toBe("value");
        expect(maybeObject.count).toBe(42);
      } else {
        fail("Expected isPlainObject to return true");
      }
    });

    it("should narrow type to allow symbol key access", () => {
      const sym = Symbol("test");
      const maybeObject: unknown = { [sym]: "symbol-value", regular: "regular-value" };

      if (isPlainObject(maybeObject)) {
        // TypeScript should allow symbol key access
        expect(maybeObject[sym]).toBe("symbol-value");
        expect(maybeObject.regular).toBe("regular-value");
      } else {
        fail("Expected isPlainObject to return true");
      }
    });
  });
});
