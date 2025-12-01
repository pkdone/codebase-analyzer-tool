import { convertNullToUndefined } from "../../../../src/llm/json-processing/transforms/convert-null-to-undefined.js";

describe("convertNullToUndefined", () => {
  describe("primitive values", () => {
    it("should convert null to undefined", () => {
      expect(convertNullToUndefined(null)).toBeUndefined();
    });

    it("should preserve string values", () => {
      expect(convertNullToUndefined("test")).toBe("test");
      expect(convertNullToUndefined("")).toBe("");
    });

    it("should preserve number values", () => {
      expect(convertNullToUndefined(42)).toBe(42);
      expect(convertNullToUndefined(0)).toBe(0);
      expect(convertNullToUndefined(-1)).toBe(-1);
    });

    it("should preserve boolean values", () => {
      expect(convertNullToUndefined(true)).toBe(true);
      expect(convertNullToUndefined(false)).toBe(false);
    });

    it("should preserve undefined values", () => {
      expect(convertNullToUndefined(undefined)).toBeUndefined();
    });
  });

  describe("simple objects", () => {
    it("should convert null properties to undefined and omit them", () => {
      const input = { a: "test", b: null, c: 42 };
      const result = convertNullToUndefined(input) as Record<string, unknown>;

      expect(result.a).toBe("test");
      expect(result.b).toBeUndefined();
      expect(result.c).toBe(42);
      expect("b" in result).toBe(false); // Property should be omitted
    });

    it("should handle objects with all null properties", () => {
      const input = { a: null, b: null };
      const result = convertNullToUndefined(input) as Record<string, unknown>;

      expect(Object.keys(result)).toHaveLength(0);
      expect("a" in result).toBe(false);
      expect("b" in result).toBe(false);
    });

    it("should preserve empty objects", () => {
      const input = {};
      const result = convertNullToUndefined(input);

      expect(result).toEqual({});
    });
  });

  describe("nested objects", () => {
    it("should recursively convert null in nested objects", () => {
      const input = {
        level1: "value1",
        nested: {
          level2: "value2",
          nullValue: null,
          deeperNested: {
            level3: "value3",
            anotherNull: null,
          },
        },
      };

      const result = convertNullToUndefined(input) as Record<string, unknown>;

      expect(result.level1).toBe("value1");
      expect((result.nested as Record<string, unknown>).level2).toBe("value2");
      expect("nullValue" in (result.nested as Record<string, unknown>)).toBe(false);

      const deeperNested = (result.nested as Record<string, unknown>).deeperNested as Record<
        string,
        unknown
      >;
      expect(deeperNested.level3).toBe("value3");
      expect("anotherNull" in deeperNested).toBe(false);
    });

    it("should handle deeply nested structures with mixed null and non-null values", () => {
      const input = {
        a: {
          b: {
            c: {
              d: null,
              e: "value",
            },
            f: null,
          },
          g: "another value",
        },
      };

      const result = convertNullToUndefined(input) as Record<string, unknown>;
      const a = result.a as Record<string, unknown>;
      const b = a.b as Record<string, unknown>;
      const c = b.c as Record<string, unknown>;

      expect(c.e).toBe("value");
      expect("d" in c).toBe(false);
      expect("f" in b).toBe(false);
      expect(a.g).toBe("another value");
    });
  });

  describe("arrays", () => {
    it("should convert null elements in arrays", () => {
      const input = ["a", null, "b", null, "c"];
      const result = convertNullToUndefined(input) as unknown[];

      expect(result).toHaveLength(5);
      expect(result[0]).toBe("a");
      expect(result[1]).toBeUndefined();
      expect(result[2]).toBe("b");
      expect(result[3]).toBeUndefined();
      expect(result[4]).toBe("c");
    });

    it("should handle arrays of objects with null properties", () => {
      const input = [
        { name: "item1", groupId: "group1" },
        { name: "item2", groupId: null },
        { name: "item3", groupId: "group3" },
      ];

      const result = convertNullToUndefined(input) as Record<string, unknown>[];

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe("item1");
      expect(result[0].groupId).toBe("group1");
      expect(result[1].name).toBe("item2");
      expect("groupId" in result[1]).toBe(false);
      expect(result[2].name).toBe("item3");
      expect(result[2].groupId).toBe("group3");
    });

    it("should handle nested arrays", () => {
      const input = [
        [1, null, 3],
        [null, 5],
        [7, 8, null],
      ];
      const result = convertNullToUndefined(input) as unknown[][];

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual([1, undefined, 3]);
      expect(result[1]).toEqual([undefined, 5]);
      expect(result[2]).toEqual([7, 8, undefined]);
    });
  });

  describe("complex mixed structures", () => {
    it("should handle arrays nested in objects", () => {
      const input = {
        items: [
          { id: 1, value: null },
          { id: 2, value: "test" },
        ],
        metadata: {
          total: 2,
          hasNull: null,
        },
      };

      const result = convertNullToUndefined(input) as Record<string, unknown>;
      const items = result.items as Record<string, unknown>[];

      expect(items[0].id).toBe(1);
      expect("value" in items[0]).toBe(false);
      expect(items[1].id).toBe(2);
      expect(items[1].value).toBe("test");

      const metadata = result.metadata as Record<string, unknown>;
      expect(metadata.total).toBe(2);
      expect("hasNull" in metadata).toBe(false);
    });

    it("should handle objects nested in arrays", () => {
      const input = [
        {
          nested: {
            value: null,
            keep: "this",
          },
        },
        {
          nested: {
            value: "something",
            remove: null,
          },
        },
      ];

      const result = convertNullToUndefined(input) as Record<string, unknown>[];

      const first = result[0].nested as Record<string, unknown>;
      expect("value" in first).toBe(false);
      expect(first.keep).toBe("this");

      const second = result[1].nested as Record<string, unknown>;
      expect(second.value).toBe("something");
      expect("remove" in second).toBe(false);
    });
  });

  describe("circular references", () => {
    it("should handle circular references without infinite recursion", () => {
      // Note: This is not a realistic scenario for LLM responses since JSON.parse()
      // cannot create circular references. However, we test to ensure the function
      // doesn't crash with infinite recursion.
      const obj: Record<string, unknown> = { a: "value", b: null };
      obj.self = obj; // Create circular reference

      const result = convertNullToUndefined(obj) as Record<string, unknown>;

      // The function should not crash and should process what it can
      expect(result.a).toBe("value");
      expect("b" in result).toBe(false);
      // The circular reference is preserved as-is (original object) when detected
      expect(result.self).toBe(obj);
    });

    it("should handle multiple circular references", () => {
      const obj1: Record<string, unknown> = { name: "obj1", value: null };
      const obj2: Record<string, unknown> = { name: "obj2", value: null };
      obj1.ref = obj2;
      obj2.ref = obj1;

      const result = convertNullToUndefined(obj1) as Record<string, unknown>;

      expect(result.name).toBe("obj1");
      expect("value" in result).toBe(false);
      // obj2 gets processed first, then when we encounter obj1 again, it's returned as-is
      expect((result.ref as Record<string, unknown>).name).toBe("obj2");
      expect("value" in (result.ref as Record<string, unknown>)).toBe(false);
    });
  });

  describe("real-world scenario: Bill of Materials with null groupId", () => {
    it("should convert null groupId values from LLM response to undefined", () => {
      // This is the actual error case from the log file
      const billOfMaterials = [
        {
          name: "jhipster-framework",
          groupId: "io.github.jhipster",
          versions: ["3.8.0"],
          hasConflict: false,
          scopes: ["implementation"],
          locations: ["build.gradle"],
        },
        {
          name: "generator-jhipster",
          groupId: null, // npm package without Maven groupId
          versions: ["6.9.1"],
          hasConflict: false,
          scopes: ["devDependencies"],
          locations: ["package.json"],
        },
        {
          name: "prettier",
          groupId: null, // npm package without Maven groupId
          versions: ["2.0.5"],
          hasConflict: false,
          scopes: ["devDependencies"],
          locations: ["package.json"],
        },
      ];

      const result = convertNullToUndefined(billOfMaterials) as Record<string, unknown>[];

      expect(result).toHaveLength(3);

      // Java dependency should keep groupId
      expect(result[0].groupId).toBe("io.github.jhipster");

      // npm packages should have groupId omitted (converted from null to undefined)
      expect("groupId" in result[1]).toBe(false);
      expect(result[1].name).toBe("generator-jhipster");

      expect("groupId" in result[2]).toBe(false);
      expect(result[2].name).toBe("prettier");

      // Other properties should be preserved
      expect(result[1].versions).toEqual(["6.9.1"]);
      expect(result[1].hasConflict).toBe(false);
    });

    it("should handle the complete all-categories response structure", () => {
      const response = {
        appDescription: "Some description",
        technologies: [],
        billOfMaterials: [
          {
            name: "spring-boot-starter-web",
            groupId: "org.springframework.boot",
            versions: ["2.2.7.RELEASE"],
            hasConflict: false,
          },
          {
            name: "prettier",
            groupId: null, // LLM correctly returns null for npm package
            versions: ["2.0.5"],
            hasConflict: false,
          },
        ],
        codeQualitySummary: {
          topComplexMethods: [],
          commonCodeSmells: [],
          overallStatistics: {
            totalMethods: 145,
            averageComplexity: 3.8,
            highComplexityCount: null, // Another possible null value
          },
        },
      };

      const result = convertNullToUndefined(response) as Record<string, unknown>;
      const bom = result.billOfMaterials as Record<string, unknown>[];

      expect(bom[0].groupId).toBe("org.springframework.boot");
      expect("groupId" in bom[1]).toBe(false);

      const stats = (result.codeQualitySummary as Record<string, unknown>)
        .overallStatistics as Record<string, unknown>;
      expect("highComplexityCount" in stats).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should handle Date objects", () => {
      const date = new Date("2025-01-01");
      const input = { timestamp: date, value: null };

      const result = convertNullToUndefined(input) as Record<string, unknown>;

      expect(result.timestamp).toBe(date);
      expect("value" in result).toBe(false);
    });

    it("should handle RegExp objects", () => {
      const regex = /test/;
      const input = { pattern: regex, value: null };

      const result = convertNullToUndefined(input) as Record<string, unknown>;

      expect(result.pattern).toBe(regex);
      expect("value" in result).toBe(false);
    });

    it("should handle objects with numeric keys", () => {
      const input: Record<string, unknown> = {
        "0": "zero",
        "1": null,
        "2": "two",
      };

      const result = convertNullToUndefined(input) as Record<string, unknown>;

      expect(result["0"]).toBe("zero");
      expect("1" in result).toBe(false);
      expect(result["2"]).toBe("two");
    });

    it("should handle objects with symbol keys (preserved as-is)", () => {
      const sym = Symbol("test");
      const input = {
        [sym]: "value",
        regular: null,
      };

      const result = convertNullToUndefined(input) as Record<string | symbol, unknown>;

      expect(result[sym]).toBe("value");
      expect("regular" in result).toBe(false);
    });
  });
});
