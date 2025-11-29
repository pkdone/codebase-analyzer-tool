import { coerceStringToArray } from "../../../../../src/llm/json-processing/transforms/generic/coerce-string-to-array.js";

describe("coerceStringToArray", () => {
  describe("converting parameters string to empty array", () => {
    it("should convert string parameters field to empty array", () => {
      const input = {
        name: "TestClass",
        publicMethods: [
          {
            name: "basicLoanDetails",
            parameters:
              "59 parameters including id, accountNo, status, externalId, clientId, clientAccountNo, etc.",
            returnType: "LoanAccountData",
          },
        ],
      };

      const result = coerceStringToArray(input);

      expect(Array.isArray((result as any).publicMethods[0].parameters)).toBe(true);
      expect((result as any).publicMethods[0].parameters).toEqual([]);
    });

    it("should convert parameters string at any nesting level", () => {
      const input = {
        nested: {
          deep: {
            parameters: "some parameters description",
          },
        },
      };

      const result = coerceStringToArray(input);

      expect(Array.isArray((result as any).nested.deep.parameters)).toBe(true);
      expect((result as any).nested.deep.parameters).toEqual([]);
    });
  });

  describe("converting dependencies string to empty array", () => {
    it("should convert string dependencies field to empty array", () => {
      const input = {
        package: {
          name: "test-package",
          dependencies: "several dependencies including react, lodash, etc.",
        },
      };

      const result = coerceStringToArray(input);

      expect(Array.isArray((result as any).package.dependencies)).toBe(true);
      expect((result as any).package.dependencies).toEqual([]);
    });
  });

  describe("converting references string to empty array", () => {
    it("should convert string references field to empty array", () => {
      const input = {
        document: {
          title: "Test Document",
          references: "multiple references to other documents",
        },
      };

      const result = coerceStringToArray(input);

      expect(Array.isArray((result as any).document.references)).toBe(true);
      expect((result as any).document.references).toEqual([]);
    });
  });

  describe("leaving array values unchanged", () => {
    it("should leave array parameters unchanged", () => {
      const input = {
        name: "TestClass",
        publicMethods: [
          {
            name: "testMethod",
            parameters: [
              { name: "param1", type: "String" },
              { name: "param2", type: "Number" },
            ],
            returnType: "void",
          },
        ],
      };

      const result = coerceStringToArray(input);

      expect(Array.isArray((result as any).publicMethods[0].parameters)).toBe(true);
      expect((result as any).publicMethods[0].parameters).toHaveLength(2);
      expect((result as any).publicMethods[0].parameters[0].name).toBe("param1");
      expect((result as any).publicMethods[0].parameters[1].name).toBe("param2");
    });

    it("should leave empty arrays unchanged", () => {
      const input = {
        parameters: [],
        dependencies: [],
      };

      const result = coerceStringToArray(input);

      expect(Array.isArray((result as any).parameters)).toBe(true);
      expect((result as any).parameters).toEqual([]);
      expect(Array.isArray((result as any).dependencies)).toBe(true);
      expect((result as any).dependencies).toEqual([]);
    });
  });

  describe("working at any nesting level", () => {
    it("should work on top-level properties", () => {
      const input = {
        parameters: "top level parameters",
        other: "value",
      };

      const result = coerceStringToArray(input);

      expect(Array.isArray((result as any).parameters)).toBe(true);
      expect((result as any).parameters).toEqual([]);
      expect((result as any).other).toBe("value");
    });

    it("should work on nested properties", () => {
      const input = {
        level1: {
          level2: {
            level3: {
              parameters: "deeply nested parameters",
            },
          },
        },
      };

      const result = coerceStringToArray(input);

      expect(Array.isArray((result as any).level1.level2.level3.parameters)).toBe(true);
      expect((result as any).level1.level2.level3.parameters).toEqual([]);
    });

    it("should work on array elements", () => {
      const input = {
        items: [
          { name: "item1", parameters: "first item parameters" },
          { name: "item2", parameters: "second item parameters" },
        ],
      };

      const result = coerceStringToArray(input);

      expect(Array.isArray((result as any).items[0].parameters)).toBe(true);
      expect((result as any).items[0].parameters).toEqual([]);
      expect(Array.isArray((result as any).items[1].parameters)).toBe(true);
      expect((result as any).items[1].parameters).toEqual([]);
    });
  });

  describe("recursive processing", () => {
    it("should recursively process nested objects", () => {
      const input = {
        outer: {
          inner: {
            parameters: "nested parameters",
          },
        },
      };

      const result = coerceStringToArray(input);

      expect(Array.isArray((result as any).outer.inner.parameters)).toBe(true);
      expect((result as any).outer.inner.parameters).toEqual([]);
    });

    it("should process arrays recursively", () => {
      const input = [
        { parameters: "first" },
        { parameters: "second" },
        { nested: { parameters: "third" } },
      ];

      const result = coerceStringToArray(input);

      expect(Array.isArray((result as any)[0].parameters)).toBe(true);
      expect((result as any)[0].parameters).toEqual([]);
      expect(Array.isArray((result as any)[1].parameters)).toBe(true);
      expect((result as any)[1].parameters).toEqual([]);
      expect(Array.isArray((result as any)[2].nested.parameters)).toBe(true);
      expect((result as any)[2].nested.parameters).toEqual([]);
    });
  });

  describe("handling non-string values", () => {
    it("should leave non-string parameters values unchanged", () => {
      const input = {
        parameters: 123,
        dependencies: true,
        references: { nested: "object" },
      };

      const result = coerceStringToArray(input);

      expect((result as any).parameters).toBe(123);
      expect((result as any).dependencies).toBe(true);
      expect((result as any).references).toEqual({ nested: "object" });
    });

    it("should leave null and undefined unchanged", () => {
      const input = {
        parameters: null,
        dependencies: undefined,
      };

      const result = coerceStringToArray(input);

      expect((result as any).parameters).toBeNull();
      expect((result as any).dependencies).toBeUndefined();
    });
  });

  describe("primitive values and null", () => {
    it("should handle null", () => {
      expect(coerceStringToArray(null)).toBeNull();
    });

    it("should preserve string values", () => {
      expect(coerceStringToArray("string")).toBe("string");
    });

    it("should preserve number values", () => {
      expect(coerceStringToArray(123)).toBe(123);
    });

    it("should preserve boolean values", () => {
      expect(coerceStringToArray(true)).toBe(true);
      expect(coerceStringToArray(false)).toBe(false);
    });
  });

  describe("methods without parameters field", () => {
    it("should handle methods without parameters field", () => {
      const input = {
        name: "TestClass",
        publicMethods: [
          {
            name: "testMethod",
            returnType: "void",
          },
        ],
      };

      const result = coerceStringToArray(input);

      expect("parameters" in (result as any).publicMethods[0]).toBe(false);
    });
  });

  describe("complex mixed structures", () => {
    it("should handle multiple array properties in same object", () => {
      const input = {
        parameters: "some parameters",
        dependencies: "some dependencies",
        references: "some references",
        other: "other value",
      };

      const result = coerceStringToArray(input);

      expect(Array.isArray((result as any).parameters)).toBe(true);
      expect((result as any).parameters).toEqual([]);
      expect(Array.isArray((result as any).dependencies)).toBe(true);
      expect((result as any).dependencies).toEqual([]);
      expect(Array.isArray((result as any).references)).toBe(true);
      expect((result as any).references).toEqual([]);
      expect((result as any).other).toBe("other value");
    });

    it("should handle mixed string and array values", () => {
      const input = {
        item1: {
          parameters: "string value",
        },
        item2: {
          parameters: [{ name: "param1" }],
        },
      };

      const result = coerceStringToArray(input);

      expect(Array.isArray((result as any).item1.parameters)).toBe(true);
      expect((result as any).item1.parameters).toEqual([]);
      expect(Array.isArray((result as any).item2.parameters)).toBe(true);
      expect((result as any).item2.parameters).toEqual([{ name: "param1" }]);
    });
  });

  describe("circular references", () => {
    it("should handle circular references without infinite recursion", () => {
      const obj: Record<string, unknown> = { a: "value", parameters: "test" };
      obj.self = obj; // Create circular reference

      const result = coerceStringToArray(obj) as Record<string, unknown>;

      expect(result.a).toBe("value");
      expect(Array.isArray(result.parameters)).toBe(true);
      expect(result.parameters).toEqual([]);
      // The circular reference is preserved as-is when detected
      expect(result.self).toBe(obj);
    });
  });

  describe("edge cases", () => {
    it("should handle Date objects", () => {
      const date = new Date("2025-01-01");
      const input = { timestamp: date, parameters: "test" };

      const result = coerceStringToArray(input) as Record<string, unknown>;

      expect(result.timestamp).toBe(date);
      expect(Array.isArray(result.parameters)).toBe(true);
      expect(result.parameters).toEqual([]);
    });

    it("should handle RegExp objects", () => {
      const regex = /test/;
      const input = { pattern: regex, dependencies: "test" };

      const result = coerceStringToArray(input) as Record<string, unknown>;

      expect(result.pattern).toBe(regex);
      expect(Array.isArray(result.dependencies)).toBe(true);
      expect(result.dependencies).toEqual([]);
    });

    it("should handle objects with symbol keys", () => {
      const sym = Symbol("test");
      const input = {
        [sym]: "value",
        parameters: "test",
      };

      const result = coerceStringToArray(input) as Record<string | symbol, unknown>;

      expect(result[sym]).toBe("value");
      expect(Array.isArray(result.parameters)).toBe(true);
      expect(result.parameters).toEqual([]);
    });

    it("should not convert properties not in the predefined list", () => {
      const input = {
        items: "should remain string",
        list: "should remain string",
        array: "should remain string",
      };

      const result = coerceStringToArray(input);

      expect((result as any).items).toBe("should remain string");
      expect((result as any).list).toBe("should remain string");
      expect((result as any).array).toBe("should remain string");
    });
  });
});

