import { coerceStringToArray } from "../../../../../src/common/llm/json-processing/transforms/coerce-string-to-array";
import type { LLMSanitizerConfig } from "../../../../../src/common/llm/config/llm-module-config.types";

describe("coerceStringToArray", () => {
  describe("configuration-based behavior", () => {
    it("should use configured arrayPropertyNames when provided", () => {
      const config: LLMSanitizerConfig = {
        arrayPropertyNames: ["items", "tags"],
      };

      const input = {
        items: "some items",
        tags: "some tags",
        parameters: "should not be converted",
      };

      const result = coerceStringToArray(input, config);

      expect(Array.isArray((result as any).items)).toBe(true);
      expect((result as any).items).toEqual([]);
      expect(Array.isArray((result as any).tags)).toBe(true);
      expect((result as any).tags).toEqual([]);
      expect((result as any).parameters).toBe("should not be converted");
    });

    it("should not convert anything when config has no arrayPropertyNames", () => {
      const config: LLMSanitizerConfig = {};

      const input = {
        parameters: "should remain string",
        dependencies: "should remain string",
        references: "should remain string",
      };

      const result = coerceStringToArray(input, config);

      expect((result as any).parameters).toBe("should remain string");
      expect((result as any).dependencies).toBe("should remain string");
      expect((result as any).references).toBe("should remain string");
    });

    it("should not convert anything when config is undefined", () => {
      const input = {
        parameters: "should remain string",
        dependencies: "should remain string",
        references: "should remain string",
      };

      const result = coerceStringToArray(input, undefined);

      expect((result as any).parameters).toBe("should remain string");
      expect((result as any).dependencies).toBe("should remain string");
      expect((result as any).references).toBe("should remain string");
    });

    it("should handle empty arrayPropertyNames array", () => {
      const config: LLMSanitizerConfig = {
        arrayPropertyNames: [],
      };

      const input = {
        parameters: "should remain string",
      };

      const result = coerceStringToArray(input, config);

      expect((result as any).parameters).toBe("should remain string");
    });

    it("should work with default application config property names", () => {
      const config: LLMSanitizerConfig = {
        arrayPropertyNames: ["parameters", "dependencies", "references"],
      };

      const input = {
        parameters: "some parameters",
        dependencies: "some dependencies",
        references: "some references",
      };

      const result = coerceStringToArray(input, config);

      expect(Array.isArray((result as any).parameters)).toBe(true);
      expect((result as any).parameters).toEqual([]);
      expect(Array.isArray((result as any).dependencies)).toBe(true);
      expect((result as any).dependencies).toEqual([]);
      expect(Array.isArray((result as any).references)).toBe(true);
      expect((result as any).references).toEqual([]);
    });
  });

  describe("converting parameters string to empty array", () => {
    const config: LLMSanitizerConfig = {
      arrayPropertyNames: ["parameters", "dependencies", "references"],
    };

    it("should convert string parameters field to empty array", () => {
      const input = {
        name: "TestClass",
        publicFunctions: [
          {
            name: "basicLoanDetails",
            parameters:
              "59 parameters including id, accountNo, status, externalId, clientId, clientAccountNo, etc.",
            returnType: "LoanAccountData",
          },
        ],
      };

      const result = coerceStringToArray(input, config);

      expect(Array.isArray((result as any).publicFunctions[0].parameters)).toBe(true);
      expect((result as any).publicFunctions[0].parameters).toEqual([]);
    });

    it("should convert parameters string at any nesting level", () => {
      const input = {
        nested: {
          deep: {
            parameters: "some parameters description",
          },
        },
      };

      const result = coerceStringToArray(input, config);

      expect(Array.isArray((result as any).nested.deep.parameters)).toBe(true);
      expect((result as any).nested.deep.parameters).toEqual([]);
    });
  });

  describe("converting dependencies string to empty array", () => {
    const config: LLMSanitizerConfig = {
      arrayPropertyNames: ["parameters", "dependencies", "references"],
    };

    it("should convert string dependencies field to empty array", () => {
      const input = {
        package: {
          name: "test-package",
          dependencies: "several dependencies including react, lodash, etc.",
        },
      };

      const result = coerceStringToArray(input, config);

      expect(Array.isArray((result as any).package.dependencies)).toBe(true);
      expect((result as any).package.dependencies).toEqual([]);
    });
  });

  describe("converting references string to empty array", () => {
    const config: LLMSanitizerConfig = {
      arrayPropertyNames: ["parameters", "dependencies", "references"],
    };

    it("should convert string references field to empty array", () => {
      const input = {
        document: {
          title: "Test Document",
          references: "multiple references to other documents",
        },
      };

      const result = coerceStringToArray(input, config);

      expect(Array.isArray((result as any).document.references)).toBe(true);
      expect((result as any).document.references).toEqual([]);
    });
  });

  describe("leaving array values unchanged", () => {
    const config: LLMSanitizerConfig = {
      arrayPropertyNames: ["parameters", "dependencies", "references"],
    };

    it("should leave array parameters unchanged", () => {
      const input = {
        name: "TestClass",
        publicFunctions: [
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

      const result = coerceStringToArray(input, config);

      expect(Array.isArray((result as any).publicFunctions[0].parameters)).toBe(true);
      expect((result as any).publicFunctions[0].parameters).toHaveLength(2);
      expect((result as any).publicFunctions[0].parameters[0].name).toBe("param1");
      expect((result as any).publicFunctions[0].parameters[1].name).toBe("param2");
    });

    it("should leave empty arrays unchanged", () => {
      const input = {
        parameters: [],
        dependencies: [],
      };

      const result = coerceStringToArray(input, config);

      expect(Array.isArray((result as any).parameters)).toBe(true);
      expect((result as any).parameters).toEqual([]);
      expect(Array.isArray((result as any).dependencies)).toBe(true);
      expect((result as any).dependencies).toEqual([]);
    });
  });

  describe("working at any nesting level", () => {
    const config: LLMSanitizerConfig = {
      arrayPropertyNames: ["parameters", "dependencies", "references"],
    };

    it("should work on top-level properties", () => {
      const input = {
        parameters: "top level parameters",
        other: "value",
      };

      const result = coerceStringToArray(input, config);

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

      const result = coerceStringToArray(input, config);

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

      const result = coerceStringToArray(input, config);

      expect(Array.isArray((result as any).items[0].parameters)).toBe(true);
      expect((result as any).items[0].parameters).toEqual([]);
      expect(Array.isArray((result as any).items[1].parameters)).toBe(true);
      expect((result as any).items[1].parameters).toEqual([]);
    });
  });

  describe("recursive processing", () => {
    const config: LLMSanitizerConfig = {
      arrayPropertyNames: ["parameters", "dependencies", "references"],
    };

    it("should recursively process nested objects", () => {
      const input = {
        outer: {
          inner: {
            parameters: "nested parameters",
          },
        },
      };

      const result = coerceStringToArray(input, config);

      expect(Array.isArray((result as any).outer.inner.parameters)).toBe(true);
      expect((result as any).outer.inner.parameters).toEqual([]);
    });

    it("should process arrays recursively", () => {
      const input = [
        { parameters: "first" },
        { parameters: "second" },
        { nested: { parameters: "third" } },
      ];

      const result = coerceStringToArray(input, config);

      expect(Array.isArray((result as any)[0].parameters)).toBe(true);
      expect((result as any)[0].parameters).toEqual([]);
      expect(Array.isArray((result as any)[1].parameters)).toBe(true);
      expect((result as any)[1].parameters).toEqual([]);
      expect(Array.isArray((result as any)[2].nested.parameters)).toBe(true);
      expect((result as any)[2].nested.parameters).toEqual([]);
    });
  });

  describe("handling non-string values", () => {
    const config: LLMSanitizerConfig = {
      arrayPropertyNames: ["parameters", "dependencies", "references"],
    };

    it("should leave non-string parameters values unchanged", () => {
      const input = {
        parameters: 123,
        dependencies: true,
        references: { nested: "object" },
      };

      const result = coerceStringToArray(input, config);

      expect((result as any).parameters).toBe(123);
      expect((result as any).dependencies).toBe(true);
      expect((result as any).references).toEqual({ nested: "object" });
    });

    it("should leave null and undefined unchanged", () => {
      const input = {
        parameters: null,
        dependencies: undefined,
      };

      const result = coerceStringToArray(input, config);

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
        publicFunctions: [
          {
            name: "testMethod",
            returnType: "void",
          },
        ],
      };

      const result = coerceStringToArray(input);

      expect("parameters" in (result as any).publicFunctions[0]).toBe(false);
    });
  });

  describe("complex mixed structures", () => {
    const config: LLMSanitizerConfig = {
      arrayPropertyNames: ["parameters", "dependencies", "references"],
    };

    it("should handle multiple array properties in same object", () => {
      const input = {
        parameters: "some parameters",
        dependencies: "some dependencies",
        references: "some references",
        other: "other value",
      };

      const result = coerceStringToArray(input, config);

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

      const result = coerceStringToArray(input, config);

      expect(Array.isArray((result as any).item1.parameters)).toBe(true);
      expect((result as any).item1.parameters).toEqual([]);
      expect(Array.isArray((result as any).item2.parameters)).toBe(true);
      expect((result as any).item2.parameters).toEqual([{ name: "param1" }]);
    });
  });

  describe("circular references", () => {
    const config: LLMSanitizerConfig = {
      arrayPropertyNames: ["parameters", "dependencies", "references"],
    };

    it("should handle circular references without infinite recursion", () => {
      const obj: Record<string, unknown> = { a: "value", parameters: "test" };
      obj.self = obj; // Create circular reference

      const result = coerceStringToArray(obj, config) as Record<string, unknown>;

      expect(result.a).toBe("value");
      expect(Array.isArray(result.parameters)).toBe(true);
      expect(result.parameters).toEqual([]);
      // The circular reference is preserved as-is when detected
      expect(result.self).toBe(obj);
    });
  });

  describe("edge cases", () => {
    const config: LLMSanitizerConfig = {
      arrayPropertyNames: ["parameters", "dependencies", "references"],
    };

    it("should handle Date objects", () => {
      const date = new Date("2025-01-01");
      const input = { timestamp: date, parameters: "test" };

      const result = coerceStringToArray(input, config) as Record<string, unknown>;

      expect(result.timestamp).toBe(date);
      expect(Array.isArray(result.parameters)).toBe(true);
      expect(result.parameters).toEqual([]);
    });

    it("should handle RegExp objects", () => {
      const regex = /test/;
      const input = { pattern: regex, dependencies: "test" };

      const result = coerceStringToArray(input, config) as Record<string, unknown>;

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

      const result = coerceStringToArray(input, config) as Record<string | symbol, unknown>;

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

      const result = coerceStringToArray(input, config);

      expect((result as any).items).toBe("should remain string");
      expect((result as any).list).toBe("should remain string");
      expect((result as any).array).toBe("should remain string");
    });
  });

  describe("stringified JSON array parsing", () => {
    const config: LLMSanitizerConfig = {
      arrayPropertyNames: ["parameters", "dependencies", "references", "items", "tags"],
    };

    describe("JSON.parse fallback", () => {
      it("should parse stringified JSON arrays with double quotes", () => {
        const input = {
          items: '["item1", "item2", "item3"]',
        };

        const result = coerceStringToArray(input, config);

        expect((result as any).items).toEqual(["item1", "item2", "item3"]);
      });

      it("should parse stringified JSON arrays with single quotes (converted)", () => {
        const input = {
          tags: "['tag1', 'tag2', 'tag3']",
        };

        const result = coerceStringToArray(input, config);

        expect((result as any).tags).toEqual(["tag1", "tag2", "tag3"]);
      });

      it("should parse stringified JSON array with numbers", () => {
        const input = {
          items: "[1, 2, 3, 4, 5]",
        };

        const result = coerceStringToArray(input, config);

        expect((result as any).items).toEqual(["1", "2", "3", "4", "5"]);
      });

      it("should parse mixed type stringified JSON arrays", () => {
        const input = {
          items: '["string", 123, true, null]',
        };

        const result = coerceStringToArray(input, config);

        expect((result as any).items).toEqual(["string", "123", "true", "null"]);
      });

      it("should parse empty stringified JSON array", () => {
        const input = {
          items: "[]",
        };

        const result = coerceStringToArray(input, config);

        expect((result as any).items).toEqual([]);
      });

      it("should fall through to bullet parsing for invalid JSON starting with [", () => {
        const input = {
          // This looks like it starts with [ but isn't valid JSON
          items: "[not valid json at all",
        };

        const result = coerceStringToArray(input, config);

        // Falls through to other strategies, returns empty array as fallback
        expect((result as any).items).toEqual([]);
      });

      it("should handle nested stringified arrays", () => {
        const input = {
          items: '[["a", "b"], ["c", "d"]]',
        };

        const result = coerceStringToArray(input, config);

        // Nested arrays are converted to strings
        expect((result as any).items).toEqual(["a,b", "c,d"]);
      });

      it("should handle stringified object arrays (converts objects to strings)", () => {
        const input = {
          items: '[{"name": "item1"}, {"name": "item2"}]',
        };

        const result = coerceStringToArray(input, config);

        expect((result as any).items).toEqual(["[object Object]", "[object Object]"]);
      });
    });
  });

  describe("bulleted and numbered list parsing", () => {
    const config: LLMSanitizerConfig = {
      arrayPropertyNames: ["parameters", "dependencies", "references", "items", "tags"],
    };

    describe("bulleted lists with dash", () => {
      it("should parse dash-bulleted list into array", () => {
        const input = {
          items: "- item1\n- item2\n- item3",
        };

        const result = coerceStringToArray(input, config);

        expect((result as any).items).toEqual(["item1", "item2", "item3"]);
      });

      it("should handle extra whitespace in bulleted lists", () => {
        const input = {
          items: "-  item1  \n-   item2\n- item3  ",
        };

        const result = coerceStringToArray(input, config);

        expect((result as any).items).toEqual(["item1", "item2", "item3"]);
      });

      it("should handle indented bulleted lists", () => {
        const input = {
          items: "  - item1\n  - item2\n  - item3",
        };

        const result = coerceStringToArray(input, config);

        expect((result as any).items).toEqual(["item1", "item2", "item3"]);
      });
    });

    describe("bulleted lists with asterisk", () => {
      it("should parse asterisk-bulleted list into array", () => {
        const input = {
          items: "* first\n* second\n* third",
        };

        const result = coerceStringToArray(input, config);

        expect((result as any).items).toEqual(["first", "second", "third"]);
      });
    });

    describe("bulleted lists with bullet points", () => {
      it("should parse unicode bullet point list into array", () => {
        const input = {
          items: "• apple\n• banana\n• cherry",
        };

        const result = coerceStringToArray(input, config);

        expect((result as any).items).toEqual(["apple", "banana", "cherry"]);
      });

      it("should parse arrow bullet list into array", () => {
        const input = {
          items: "→ first item\n→ second item\n→ third item",
        };

        const result = coerceStringToArray(input, config);

        expect((result as any).items).toEqual(["first item", "second item", "third item"]);
      });

      it("should parse triangle arrow bullet list into array", () => {
        const input = {
          items: "▹ option a\n▹ option b\n▹ option c",
        };

        const result = coerceStringToArray(input, config);

        expect((result as any).items).toEqual(["option a", "option b", "option c"]);
      });

      it("should parse heavy arrow bullet list into array", () => {
        const input = {
          items: "➤ task 1\n➤ task 2\n➤ task 3",
        };

        const result = coerceStringToArray(input, config);

        expect((result as any).items).toEqual(["task 1", "task 2", "task 3"]);
      });

      it("should parse diamond bullet list into array", () => {
        const input = {
          items: "◆ diamond 1\n◆ diamond 2\n◆ diamond 3",
        };

        const result = coerceStringToArray(input, config);

        expect((result as any).items).toEqual(["diamond 1", "diamond 2", "diamond 3"]);
      });

      it("should parse square bullet list into array", () => {
        const input = {
          items: "■ square 1\n■ square 2\n■ square 3",
        };

        const result = coerceStringToArray(input, config);

        expect((result as any).items).toEqual(["square 1", "square 2", "square 3"]);
      });
    });

    describe("numbered lists", () => {
      it("should parse numbered list with dots into array", () => {
        const input = {
          items: "1. first item\n2. second item\n3. third item",
        };

        const result = coerceStringToArray(input, config);

        expect((result as any).items).toEqual(["first item", "second item", "third item"]);
      });

      it("should parse numbered list with parentheses into array", () => {
        const input = {
          items: "1) option a\n2) option b\n3) option c",
        };

        const result = coerceStringToArray(input, config);

        expect((result as any).items).toEqual(["option a", "option b", "option c"]);
      });
    });

    describe("comma-separated values", () => {
      it("should parse comma-separated values into array", () => {
        const input = {
          tags: "tag1, tag2, tag3, tag4",
        };

        const result = coerceStringToArray(input, config);

        expect((result as any).tags).toEqual(["tag1", "tag2", "tag3", "tag4"]);
      });

      it("should handle semicolon-separated values with multiple separators", () => {
        const input = {
          tags: "tag1; tag2; tag3; tag4",
        };

        const result = coerceStringToArray(input, config);

        expect((result as any).tags).toEqual(["tag1", "tag2", "tag3", "tag4"]);
      });

      it("should not split sentence-like text with commas", () => {
        const input = {
          parameters: "This is a description, which has commas. It should not be split.",
        };

        const result = coerceStringToArray(input, config);

        // Sentence-like text should return empty array (fallback behavior)
        expect((result as any).parameters).toEqual([]);
      });
    });

    describe("newline-separated values", () => {
      it("should parse simple newline-separated values into array", () => {
        const input = {
          items: "value1\nvalue2\nvalue3",
        };

        const result = coerceStringToArray(input, config);

        expect((result as any).items).toEqual(["value1", "value2", "value3"]);
      });

      it("should not split long paragraphs into array", () => {
        const input = {
          parameters:
            "This is a very long paragraph that describes something in detail.\nIt continues on the next line with more detailed information that is quite lengthy.",
        };

        const result = coerceStringToArray(input, config);

        // Long lines should return empty array (fallback behavior)
        expect((result as any).parameters).toEqual([]);
      });
    });

    describe("empty and descriptive strings", () => {
      it("should return empty array for empty string", () => {
        const input = {
          items: "",
        };

        const result = coerceStringToArray(input, config);

        expect((result as any).items).toEqual([]);
      });

      it("should return empty array for purely descriptive strings", () => {
        const input = {
          parameters: "59 parameters including id, accountNo, status, externalId, etc.",
        };

        const result = coerceStringToArray(input, config);

        // This looks like a description, not a list
        expect((result as any).parameters).toEqual([]);
      });
    });

    describe("nested structures with list parsing", () => {
      it("should parse lists in nested objects", () => {
        const input = {
          outer: {
            items: "- nested1\n- nested2\n- nested3",
          },
        };

        const result = coerceStringToArray(input, config);

        expect((result as any).outer.items).toEqual(["nested1", "nested2", "nested3"]);
      });

      it("should parse lists in array elements", () => {
        const input = {
          collection: [{ items: "- a\n- b" }, { items: "- c\n- d" }],
        };

        const result = coerceStringToArray(input, config);

        expect((result as any).collection[0].items).toEqual(["a", "b"]);
        expect((result as any).collection[1].items).toEqual(["c", "d"]);
      });
    });
  });
});
