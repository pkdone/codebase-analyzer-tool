import {
  unwrapJsonSchemaStructure,
  coerceNumericProperties,
} from "../../../../../src/common/llm/json-processing/transforms/schema-format-transforms";
import type { LLMSanitizerConfig } from "../../../../../src/common/llm/config/llm-module-config.types";

// Mock sanitizer config for testing
const mockConfig: LLMSanitizerConfig = {
  numericProperties: [
    "linesofcode",
    "cyclomaticcomplexity",
    "totalmethods",
    "averagecomplexity",
    "complexity",
    "lines",
  ],
};

describe("schema-format-transforms", () => {
  describe("unwrapJsonSchemaStructure", () => {
    it("should unwrap JSON Schema structure when LLM returns schema instead of data", () => {
      const schemaResponse = {
        type: "object",
        properties: {
          name: "TestProject",
          version: "1.0.0",
        },
      };

      const result = unwrapJsonSchemaStructure(schemaResponse);

      expect(result).toEqual({
        name: "TestProject",
        version: "1.0.0",
      });
    });

    it("should leave normal JSON objects untransformed", () => {
      const normalJson = {
        name: "TestProject",
        version: "1.0.0",
      };

      const result = unwrapJsonSchemaStructure(normalJson);

      expect(result).toEqual(normalJson);
    });

    it("should not unwrap empty properties", () => {
      const schemaWithEmptyProperties = {
        type: "object",
        properties: {},
      };

      const result = unwrapJsonSchemaStructure(schemaWithEmptyProperties);

      expect(result).toEqual(schemaWithEmptyProperties);
    });

    it("should not unwrap non-object types", () => {
      const schemaWithArrayType = {
        type: "array",
        properties: {
          item: "value",
        },
      };

      const result = unwrapJsonSchemaStructure(schemaWithArrayType);

      expect(result).toEqual(schemaWithArrayType);
    });

    it("should handle null values", () => {
      const result = unwrapJsonSchemaStructure(null);
      expect(result).toBeNull();
    });

    it("should handle arrays", () => {
      const array = [{ type: "object", properties: { key: "value" } }];
      const result = unwrapJsonSchemaStructure(array);
      expect(result).toEqual(array);
    });

    it("should handle primitives", () => {
      expect(unwrapJsonSchemaStructure("string")).toBe("string");
      expect(unwrapJsonSchemaStructure(123)).toBe(123);
      expect(unwrapJsonSchemaStructure(true)).toBe(true);
    });

    describe("nested JSON Schema field extraction", () => {
      it("should extract description values from nested schema field definitions", () => {
        const schemaResponse = {
          type: "object",
          properties: {
            purpose: {
              type: "string",
              description: "This is the actual purpose text",
            },
            implementation: {
              type: "string",
              description: "This is the actual implementation text",
            },
          },
        };

        const result = unwrapJsonSchemaStructure(schemaResponse);

        expect(result).toEqual({
          purpose: "This is the actual purpose text",
          implementation: "This is the actual implementation text",
        });
      });

      it("should handle full JSON Schema response with $schema and additionalProperties", () => {
        // This is the exact pattern from the error logs
        const schemaResponse = {
          type: "object",
          properties: {
            purpose: {
              type: "string",
              description:
                "This file serves as a comprehensive documentation guide for developers.",
            },
            implementation: {
              type: "string",
              description: "The file is implemented as a structured AsciiDoc document.",
            },
            databaseIntegration: {
              type: "object",
              properties: {
                mechanism: "NONE",
                name: "n/a",
                description: "n/a",
                codeExample: "n/a",
              },
              required: ["mechanism", "description", "codeExample"],
              additionalProperties: true,
              description: "Information about how the file interacts with a database.",
            },
          },
          required: ["purpose", "implementation"],
          additionalProperties: true,
          $schema: "http://json-schema.org/draft-07/schema#",
        };

        const result = unwrapJsonSchemaStructure(schemaResponse);

        expect(result).toEqual({
          purpose: "This file serves as a comprehensive documentation guide for developers.",
          implementation: "The file is implemented as a structured AsciiDoc document.",
          databaseIntegration: {
            mechanism: "NONE",
            name: "n/a",
            description: "n/a",
            codeExample: "n/a",
          },
        });
      });

      it("should handle mixed content where some properties are schema-wrapped and some are not", () => {
        const mixedResponse = {
          type: "object",
          properties: {
            name: "DirectValue",
            purpose: {
              type: "string",
              description: "Schema-wrapped value",
            },
            count: 42,
          },
        };

        const result = unwrapJsonSchemaStructure(mixedResponse);

        expect(result).toEqual({
          name: "DirectValue",
          purpose: "Schema-wrapped value",
          count: 42,
        });
      });

      it("should handle deeply nested schema field definitions with data in nested properties", () => {
        // When a nested object has schema properties but the inner properties contain actual data
        const deeplyNested = {
          type: "object",
          properties: {
            outer: {
              type: "object",
              properties: {
                inner: "Deep nested value", // actual data, not schema
                count: 42,
              },
              required: ["inner"],
              additionalProperties: true,
              description: "Metadata about outer object",
            },
          },
        };

        const result = unwrapJsonSchemaStructure(deeplyNested);

        // Should extract the properties object which contains actual data
        expect(result).toEqual({
          outer: {
            inner: "Deep nested value",
            count: 42,
          },
        });
      });

      it("should handle doubly nested objects where inner properties contain data values", () => {
        // Pattern from error logs: nested object schema where the properties contain actual data
        const doublyNested = {
          type: "object",
          properties: {
            level1: {
              type: "string",
              description: "Level 1 value",
            },
            nested: {
              type: "object",
              properties: {
                level2: "Actual data value", // This is DATA, not a schema field
                count: 42,
              },
              required: ["level2"],
              additionalProperties: true,
              description: "Nested object metadata",
            },
          },
        };

        const result = unwrapJsonSchemaStructure(doublyNested);

        expect(result).toEqual({
          level1: "Level 1 value",
          nested: {
            level2: "Actual data value",
            count: 42,
          },
        });
      });

      it("should pass through nested schema objects when inner properties are schema definitions", () => {
        // When the nested object's properties are themselves schema definitions (not data),
        // and there's no clear indication that properties contains data, we can't reliably extract
        const nestedWithSchemaProps = {
          type: "object",
          properties: {
            simple: {
              type: "string",
              description: "Simple value",
            },
            complex: {
              type: "object",
              properties: {
                inner: {
                  type: "string",
                  description: "Inner value",
                },
              },
              required: ["inner"],
              additionalProperties: true,
              description: "Complex object metadata",
            },
          },
        };

        const result = unwrapJsonSchemaStructure(nestedWithSchemaProps);

        // The simple field gets extracted, but complex is more ambiguous
        // Since complex.properties contains a schema field (not raw data),
        // and we can't tell if this is intended data or pure schema,
        // we extract based on the presence of additionalProperties/required
        // which indicates it's likely schema wrapping actual data.
        // But since the inner properties look like schema definitions too,
        // the recursion handles it.
        expect(result).toEqual({
          simple: "Simple value",
          complex: {
            inner: "Inner value",
          },
        });
      });

      it("should handle arrays of schema-wrapped values", () => {
        const arrayInput = {
          type: "object",
          properties: {
            items: [
              {
                type: "string",
                description: "First item",
              },
              {
                type: "string",
                description: "Second item",
              },
            ],
          },
        };

        const result = unwrapJsonSchemaStructure(arrayInput);

        expect(result).toEqual({
          items: ["First item", "Second item"],
        });
      });

      it("should handle schema fields with enum property", () => {
        const schemaWithEnum = {
          type: "object",
          properties: {
            status: {
              type: "string",
              enum: ["ACTIVE", "INACTIVE"],
              description: "ACTIVE",
            },
          },
        };

        const result = unwrapJsonSchemaStructure(schemaWithEnum);

        expect(result).toEqual({
          status: "ACTIVE",
        });
      });

      it("should handle schema fields with allOf patterns where type is present", () => {
        // allOf with type at the same level as description
        const schemaWithAllOf = {
          type: "object",
          properties: {
            mechanism: {
              type: "string",
              allOf: [{ enum: ["NONE", "JDBC", "JPA"] }],
              description: "JPA",
            },
          },
        };

        const result = unwrapJsonSchemaStructure(schemaWithAllOf);

        expect(result).toEqual({
          mechanism: "JPA",
        });
      });

      it("should pass through complex allOf patterns without type at same level", () => {
        // When allOf contains the type (not at same level), don't try to extract
        const complexAllOf = {
          type: "object",
          properties: {
            mechanism: {
              allOf: [{ type: "string" }, { type: "string", enum: ["NONE", "JDBC", "JPA"] }],
              description: "JPA",
            },
          },
        };

        const result = unwrapJsonSchemaStructure(complexAllOf);

        // This pattern is ambiguous - the object doesn't have a direct "type" property
        // so it won't be detected as a schema field definition
        expect(result).toEqual({
          mechanism: {
            allOf: [{ type: "string" }, { type: "string", enum: ["NONE", "JDBC", "JPA"] }],
            description: "JPA",
          },
        });
      });

      it("should not extract description from objects that are clearly data, not schema", () => {
        // An object with "type" and "description" but other non-schema properties
        // should be treated carefully - if it looks like actual data, leave it alone
        const dataObject = {
          name: "MyComponent",
          type: "button", // This is data, not a JSON Schema type
          description: "A button component",
          onClick: "handleClick",
        };

        const result = unwrapJsonSchemaStructure(dataObject);

        // "button" is not a JSON Schema type, so this should pass through unchanged
        expect(result).toEqual(dataObject);
      });

      it("should handle numeric description values", () => {
        const schemaWithNumber = {
          type: "object",
          properties: {
            count: {
              type: "number",
              description: 42,
            },
            active: {
              type: "boolean",
              description: true,
            },
          },
        };

        const result = unwrapJsonSchemaStructure(schemaWithNumber);

        expect(result).toEqual({
          count: 42,
          active: true,
        });
      });

      it("should handle null and undefined description values", () => {
        const schemaWithNull = {
          type: "object",
          properties: {
            nullField: {
              type: "string",
              description: null,
            },
          },
        };

        const result = unwrapJsonSchemaStructure(schemaWithNull);

        expect(result).toEqual({
          nullField: null,
        });
      });

      it("should handle array description values (tablesAccessed pattern)", () => {
        const schemaWithArrayDescription = {
          type: "object",
          properties: {
            tablesAccessed: {
              type: "array",
              items: { type: "string" },
              description: ["users", "orders", "products"],
            },
          },
        };

        const result = unwrapJsonSchemaStructure(schemaWithArrayDescription);

        expect(result).toEqual({
          tablesAccessed: ["users", "orders", "products"],
        });
      });
    });

    describe("undefined handling for JsonValue compatibility", () => {
      it("should convert undefined values to null for JsonValue compatibility", () => {
        // Test that undefined values become null in the output (JsonValue doesn't include undefined)
        const inputWithUndefined = {
          defined: "value",
          undefinedField: undefined,
        };

        const result = unwrapJsonSchemaStructure(inputWithUndefined);

        // The undefined value should be converted to null
        expect(result).toEqual({
          defined: "value",
          undefinedField: null,
        });
      });

      it("should preserve null values as-is", () => {
        const inputWithNull = {
          defined: "value",
          nullField: null,
        };

        const result = unwrapJsonSchemaStructure(inputWithNull);

        expect(result).toEqual({
          defined: "value",
          nullField: null,
        });
      });
    });
  });

  describe("coerceNumericProperties", () => {
    it("should coerce string values to numbers for known numeric properties", () => {
      const input = {
        linesOfCode: "19",
        cyclomaticComplexity: "5",
        name: "TestClass",
      };

      const result = coerceNumericProperties(input, mockConfig);

      expect(result).toEqual({
        linesOfCode: 19,
        cyclomaticComplexity: 5,
        name: "TestClass",
      });
    });

    it("should handle nested objects", () => {
      const input = {
        publicFunctions: [
          {
            name: "testMethod",
            linesOfCode: "10",
            cyclomaticComplexity: "3",
          },
        ],
      };

      const result = coerceNumericProperties(input, mockConfig);

      expect(result).toEqual({
        publicFunctions: [
          {
            name: "testMethod",
            linesOfCode: 10,
            cyclomaticComplexity: 3,
          },
        ],
      });
    });

    it("should not coerce non-numeric strings", () => {
      const input = {
        linesOfCode: "not-a-number",
        name: "TestClass",
      };

      const result = coerceNumericProperties(input, mockConfig);

      expect(result).toEqual({
        linesOfCode: "not-a-number",
        name: "TestClass",
      });
    });

    it("should not coerce empty strings", () => {
      const input = {
        linesOfCode: "",
        name: "TestClass",
      };

      const result = coerceNumericProperties(input, mockConfig);

      expect(result).toEqual({
        linesOfCode: "",
        name: "TestClass",
      });
    });

    it("should handle already numeric values", () => {
      const input = {
        linesOfCode: 19,
        cyclomaticComplexity: 5,
      };

      const result = coerceNumericProperties(input, mockConfig);

      expect(result).toEqual({
        linesOfCode: 19,
        cyclomaticComplexity: 5,
      });
    });

    it("should handle arrays", () => {
      const input = [{ linesOfCode: "10" }, { linesOfCode: "20" }];

      const result = coerceNumericProperties(input, mockConfig);

      expect(result).toEqual([{ linesOfCode: 10 }, { linesOfCode: 20 }]);
    });

    it("should handle null and undefined", () => {
      expect(coerceNumericProperties(null)).toBeNull();
      expect(coerceNumericProperties(undefined)).toBeUndefined();
    });

    describe("extracting numbers from mixed strings", () => {
      it("should extract leading numbers with tilde prefix", () => {
        const input = {
          linesOfCode: "~150 lines",
          complexity: "~25 units",
        };

        const result = coerceNumericProperties(input, mockConfig);

        expect(result).toEqual({
          linesOfCode: 150,
          complexity: 25,
        });
      });

      it("should extract leading numbers with approximation symbols", () => {
        const input = {
          linesOfCode: "≈200 lines of code",
        };

        const result = coerceNumericProperties(input, mockConfig);

        expect(result).toEqual({
          linesOfCode: 200,
        });
      });

      it("should extract numbers from 'approximately N items' patterns", () => {
        const input = {
          linesOfCode: "approximately 50 lines",
          totalMethods: "about 10 methods",
        };

        const result = coerceNumericProperties(input, mockConfig);

        expect(result).toEqual({
          linesOfCode: 50,
          totalMethods: 10,
        });
      });

      it("should extract decimal numbers from mixed strings", () => {
        const input = {
          averageComplexity: "~3.5 per method",
        };

        const result = coerceNumericProperties(input, mockConfig);

        expect(result).toEqual({
          averageComplexity: 3.5,
        });
      });

      it("should extract negative numbers from mixed strings", () => {
        const input = {
          lines: "-5 lines removed",
        };

        const result = coerceNumericProperties(input, mockConfig);

        expect(result).toEqual({
          lines: -5,
        });
      });

      it("should handle leading numbers without prefix", () => {
        const input = {
          linesOfCode: "100 lines of code",
          complexity: "15 cyclomatic",
        };

        const result = coerceNumericProperties(input, mockConfig);

        expect(result).toEqual({
          linesOfCode: 100,
          complexity: 15,
        });
      });

      it("should still handle clean numeric strings", () => {
        const input = {
          linesOfCode: "19",
          cyclomaticComplexity: "5.5",
        };

        const result = coerceNumericProperties(input, mockConfig);

        expect(result).toEqual({
          linesOfCode: 19,
          cyclomaticComplexity: 5.5,
        });
      });

      it("should not coerce strings without any numbers", () => {
        const input = {
          linesOfCode: "many lines",
          complexity: "high complexity",
        };

        const result = coerceNumericProperties(input, mockConfig);

        expect(result).toEqual({
          linesOfCode: "many lines",
          complexity: "high complexity",
        });
      });

      it("should extract first number from complex phrases", () => {
        const input = {
          linesOfCode: "between 100 and 200 lines",
        };

        const result = coerceNumericProperties(input, mockConfig);

        expect(result).toEqual({
          linesOfCode: 100,
        });
      });
    });
  });
});
