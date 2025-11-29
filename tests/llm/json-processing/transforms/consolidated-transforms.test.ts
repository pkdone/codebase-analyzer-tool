import { convertNullToUndefined } from "../../../../src/llm/json-processing/transforms/generic/convert-null-to-undefined.js";
import { unwrapJsonSchemaStructure } from "../../../../src/llm/json-processing/transforms/generic/schema-format-transforms.js";
import { normalizeDatabaseIntegrationArray } from "../../../../src/llm/json-processing/transforms/schema-specific/source-schema-transforms.js";
import { fixCommonPropertyNameTypos } from "../../../../src/llm/json-processing/transforms/generic/property-typo-fixes.js";

describe("Consolidated Post-Parse Transforms", () => {
  describe("convertNullToUndefined", () => {
    it("should convert null to undefined in simple object", () => {
      const input = { name: "test", value: null };
      const result = convertNullToUndefined(input);
      expect(result).toEqual({ name: "test" });
      expect("value" in (result as Record<string, unknown>)).toBe(false);
    });

    it("should convert null to undefined in nested objects", () => {
      const input = { name: "test", nested: { value: null, other: "keep" } };
      const result = convertNullToUndefined(input);
      expect(result).toEqual({ name: "test", nested: { other: "keep" } });
    });

    it("should convert null to undefined in arrays", () => {
      const input = [1, null, "test", null];
      const result = convertNullToUndefined(input);
      expect(result).toEqual([1, undefined, "test", undefined]);
    });

    it("should handle circular references safely", () => {
      const input: Record<string, unknown> = { name: "test", value: null };
      input.self = input; // Create circular reference
      const result = convertNullToUndefined(input);
      expect((result as Record<string, unknown>).name).toBe("test");
      expect("value" in (result as Record<string, unknown>)).toBe(false);
    });
  });

  describe("unwrapJsonSchemaStructure", () => {
    it("should unwrap JSON Schema structure", () => {
      const input = {
        type: "object",
        properties: {
          name: "test",
          value: 123,
        },
      };
      const result = unwrapJsonSchemaStructure(input);
      expect(result).toEqual({ name: "test", value: 123 });
    });

    it("should return unchanged if not a JSON Schema structure", () => {
      const input = { name: "test", value: 123 };
      const result = unwrapJsonSchemaStructure(input);
      expect(result).toBe(input);
    });

    it("should return unchanged if properties is empty", () => {
      const input = {
        type: "object",
        properties: {},
      };
      const result = unwrapJsonSchemaStructure(input);
      expect(result).toBe(input);
    });
  });

  describe("normalizeDatabaseIntegrationArray", () => {
    it("should convert single-element array to object", () => {
      const input = {
        databaseIntegration: [{ mechanism: "SQL", description: "test" }],
      };
      const result = normalizeDatabaseIntegrationArray(input);
      expect(result).toEqual({
        databaseIntegration: { mechanism: "SQL", description: "test" },
      });
    });

    it("should merge multiple elements intelligently", () => {
      const input = {
        databaseIntegration: [
          { mechanism: "SQL", description: "first", tablesAccessed: ["table1"] },
          { mechanism: "DDL", description: "second", tablesAccessed: ["table2"] },
        ],
      };
      const result = normalizeDatabaseIntegrationArray(input);
      expect((result as Record<string, unknown>).databaseIntegration).toHaveProperty("mechanism");
      expect((result as Record<string, unknown>).databaseIntegration).toHaveProperty("description");
    });

    it("should return unchanged if not an array", () => {
      const input = {
        databaseIntegration: { mechanism: "SQL", description: "test" },
      };
      const result = normalizeDatabaseIntegrationArray(input);
      expect(result).toBe(input);
    });
  });

  describe("fixCommonPropertyNameTypos", () => {
    it("should fix type_ to type", () => {
      const input = {
        parameters: [{ type_: "string", name: "param" }],
      };
      const result = fixCommonPropertyNameTypos(input);
      expect((result as Record<string, unknown>).parameters).toEqual([
        { type: "string", name: "param" },
      ]);
    });

    it("should fix name_ to name", () => {
      const input = {
        parameters: [{ type: "string", name_: "param" }],
      };
      const result = fixCommonPropertyNameTypos(input);
      expect((result as Record<string, unknown>).parameters).toEqual([
        { type: "string", name: "param" },
      ]);
    });

    it("should return unchanged if no typos", () => {
      const input = {
        parameters: [{ type: "string", name: "param" }],
      };
      const result = fixCommonPropertyNameTypos(input);
      expect(result).toStrictEqual(input);
    });
  });
});
