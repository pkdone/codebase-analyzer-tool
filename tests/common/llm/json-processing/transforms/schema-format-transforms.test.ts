import {
  unwrapJsonSchemaStructure,
  coerceNumericProperties,
} from "../../../../../src/common/llm/json-processing/transforms/schema-format-transforms";

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
  });

  describe("coerceNumericProperties", () => {
    it("should coerce string values to numbers for known numeric properties", () => {
      const input = {
        linesOfCode: "19",
        cyclomaticComplexity: "5",
        name: "TestClass",
      };

      const result = coerceNumericProperties(input);

      expect(result).toEqual({
        linesOfCode: 19,
        cyclomaticComplexity: 5,
        name: "TestClass",
      });
    });

    it("should handle nested objects", () => {
      const input = {
        publicMethods: [
          {
            name: "testMethod",
            linesOfCode: "10",
            cyclomaticComplexity: "3",
          },
        ],
      };

      const result = coerceNumericProperties(input);

      expect(result).toEqual({
        publicMethods: [
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

      const result = coerceNumericProperties(input);

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

      const result = coerceNumericProperties(input);

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

      const result = coerceNumericProperties(input);

      expect(result).toEqual({
        linesOfCode: 19,
        cyclomaticComplexity: 5,
      });
    });

    it("should handle arrays", () => {
      const input = [{ linesOfCode: "10" }, { linesOfCode: "20" }];

      const result = coerceNumericProperties(input);

      expect(result).toEqual([{ linesOfCode: 10 }, { linesOfCode: 20 }]);
    });

    it("should handle null and undefined", () => {
      expect(coerceNumericProperties(null)).toBeNull();
      expect(coerceNumericProperties(undefined)).toBeUndefined();
    });
  });
});
