import { unwrapJsonSchemaStructure } from "../../../../../src/llm/json-processing/transforms/generic/schema-format-transforms.js";

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
});
