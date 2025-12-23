import { fixCommonPropertyNameTypos } from "../../../../../src/common/llm/json-processing/transforms/property-typo-fixes";

describe("fixCommonPropertyNameTypos", () => {
  describe("fixing type_ to type", () => {
    it("should fix type_ to type", () => {
      const input = {
        publicFunctions: [
          {
            name: "testMethod",
            type_: "string",
            description: "Test method",
          },
        ],
      };

      const result = fixCommonPropertyNameTypos(input);

      expect(result).toEqual({
        publicFunctions: [
          {
            name: "testMethod",
            type: "string",
            description: "Test method",
          },
        ],
      });
    });

    it("should not fix type_ if type already exists", () => {
      const input = {
        parameter: {
          type: "correct",
          type_: "wrong",
        },
      };

      const result = fixCommonPropertyNameTypos(input);

      expect(result).toEqual({
        parameter: {
          type: "correct",
          type_: "wrong",
        },
      });
    });
  });

  describe("fixing name_ to name", () => {
    it("should fix name_ to name", () => {
      const input = {
        parameters: [
          {
            name_: "param1",
            type: "string",
          },
        ],
      };

      const result = fixCommonPropertyNameTypos(input);

      expect(result).toEqual({
        parameters: [
          {
            name: "param1",
            type: "string",
          },
        ],
      });
    });

    it("should not fix name_ if name already exists", () => {
      const input = {
        parameter: {
          name: "correct",
          name_: "wrong",
        },
      };

      const result = fixCommonPropertyNameTypos(input);

      expect(result).toEqual({
        parameter: {
          name: "correct",
          name_: "wrong",
        },
      });
    });
  });

  describe("fixing any property ending with underscore", () => {
    it("should fix description_ to description", () => {
      const input = {
        item: {
          description_: "Some description",
          value: 123,
        },
      };

      const result = fixCommonPropertyNameTypos(input);

      expect(result).toEqual({
        item: {
          description: "Some description",
          value: 123,
        },
      });
    });

    it("should fix value_ to value", () => {
      const input = {
        data: {
          value_: "test",
        },
      };

      const result = fixCommonPropertyNameTypos(input);

      expect(result).toEqual({
        data: {
          value: "test",
        },
      });
    });

    it("should fix multiple properties ending with underscore", () => {
      const input = {
        method: {
          name_: "test",
          type_: "string",
          returnType_: "void",
        },
      };

      const result = fixCommonPropertyNameTypos(input);

      expect(result).toEqual({
        method: {
          name: "test",
          type: "string",
          returnType: "void",
        },
      });
    });

    it("should not fix single underscore", () => {
      const input = {
        _: "single underscore",
        value: 123,
      };

      const result = fixCommonPropertyNameTypos(input);

      expect(result).toEqual({
        _: "single underscore",
        value: 123,
      });
    });
  });

  describe("recursive processing", () => {
    it("should recursively process nested objects", () => {
      const input = {
        level1: {
          level2: {
            type_: "nested",
          },
        },
      };

      const result = fixCommonPropertyNameTypos(input);

      expect(result).toEqual({
        level1: {
          level2: {
            type: "nested",
          },
        },
      });
    });

    it("should process arrays recursively", () => {
      const input = [{ type_: "first" }, { type_: "second" }, { nested: { type_: "third" } }];

      const result = fixCommonPropertyNameTypos(input);

      expect(result).toEqual([
        { type: "first" },
        { type: "second" },
        { nested: { type: "third" } },
      ]);
    });

    it("should handle deeply nested structures", () => {
      const input = {
        a: {
          b: {
            c: {
              d: {
                name_: "deep",
                type_: "nested",
              },
            },
          },
        },
      };

      const result = fixCommonPropertyNameTypos(input);

      expect(result).toEqual({
        a: {
          b: {
            c: {
              d: {
                name: "deep",
                type: "nested",
              },
            },
          },
        },
      });
    });
  });

  describe("primitive values and null", () => {
    it("should handle null", () => {
      expect(fixCommonPropertyNameTypos(null)).toBeNull();
    });

    it("should preserve string values", () => {
      expect(fixCommonPropertyNameTypos("string")).toBe("string");
    });

    it("should preserve number values", () => {
      expect(fixCommonPropertyNameTypos(123)).toBe(123);
    });

    it("should preserve boolean values", () => {
      expect(fixCommonPropertyNameTypos(true)).toBe(true);
      expect(fixCommonPropertyNameTypos(false)).toBe(false);
    });
  });

  describe("objects without typos", () => {
    it("should leave objects without typos unchanged", () => {
      const input = {
        name: "correct",
        type: "correct",
        value: 123,
      };

      const result = fixCommonPropertyNameTypos(input);

      expect(result).toEqual(input);
    });

    it("should handle empty objects", () => {
      const input = {};
      const result = fixCommonPropertyNameTypos(input);

      expect(result).toEqual({});
    });
  });

  describe("complex mixed structures", () => {
    it("should handle arrays nested in objects", () => {
      const input = {
        items: [
          { id: 1, type_: "first" },
          { id: 2, name_: "second" },
        ],
        metadata: {
          description_: "metadata",
        },
      };

      const result = fixCommonPropertyNameTypos(input);

      expect(result).toEqual({
        items: [
          { id: 1, type: "first" },
          { id: 2, name: "second" },
        ],
        metadata: {
          description: "metadata",
        },
      });
    });

    it("should handle objects nested in arrays", () => {
      const input = [
        {
          nested: {
            value: "something",
            type_: "nested",
          },
        },
        {
          nested: {
            value: "else",
            name_: "other",
          },
        },
      ];

      const result = fixCommonPropertyNameTypos(input);

      expect(result).toEqual([
        {
          nested: {
            value: "something",
            type: "nested",
          },
        },
        {
          nested: {
            value: "else",
            name: "other",
          },
        },
      ]);
    });
  });

  describe("circular references", () => {
    it("should handle circular references without infinite recursion", () => {
      const obj: Record<string, unknown> = { a: "value", type_: "test" };
      obj.self = obj; // Create circular reference

      const result = fixCommonPropertyNameTypos(obj) as Record<string, unknown>;

      expect(result.a).toBe("value");
      expect(result.type).toBe("test");
      expect("type_" in result).toBe(false);
      // The circular reference is preserved as-is when detected
      expect(result.self).toBe(obj);
    });
  });

  describe("edge cases", () => {
    it("should handle Date objects", () => {
      const date = new Date("2025-01-01");
      const input = { timestamp: date, type_: "test" };

      const result = fixCommonPropertyNameTypos(input) as Record<string, unknown>;

      expect(result.timestamp).toBe(date);
      expect(result.type).toBe("test");
    });

    it("should handle RegExp objects", () => {
      const regex = /test/;
      const input = { pattern: regex, name_: "test" };

      const result = fixCommonPropertyNameTypos(input) as Record<string, unknown>;

      expect(result.pattern).toBe(regex);
      expect(result.name).toBe("test");
    });

    it("should handle objects with symbol keys", () => {
      const sym = Symbol("test");
      const input = {
        [sym]: "value",
        type_: "test",
      };

      const result = fixCommonPropertyNameTypos(input) as Record<string | symbol, unknown>;

      expect(result[sym]).toBe("value");
      expect(result.type).toBe("test");
    });
  });
});
