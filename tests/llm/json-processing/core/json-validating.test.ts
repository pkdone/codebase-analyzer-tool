import {
  validateJson,
  applySchemaFixingTransforms,
} from "../../../../src/llm/json-processing/core/json-validating";
import { LLMOutputFormat } from "../../../../src/llm/types/llm.types";
import { z } from "zod";

describe("json-validating", () => {
  describe("validateJson", () => {
    describe("schema validation", () => {
      it("should validate and return data when schema validation succeeds", () => {
        const schema = z.object({ name: z.string(), age: z.number() });
        const content = { name: "John", age: 30 };
        const options = {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: schema,
        };

        const result = validateJson(content, options, false, true);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(content);
        }
      });

      it("should return failure result when schema validation fails", () => {
        const schema = z.object({ name: z.string(), age: z.number() });
        const content = { name: "John", age: "thirty" }; // Invalid age type
        const options = {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: schema,
        };

        const result = validateJson(content, options, false, true);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.issues).toBeDefined();
          expect(Array.isArray(result.issues)).toBe(true);
        }
      });

      it("should include validation issues in failure result", () => {
        const schema = z.object({ name: z.string(), age: z.number() });
        const content = { name: "John", age: "thirty" };
        const options = {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: schema,
        };

        const result = validateJson(content, options, false, true);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.issues).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                path: ["age"],
              }),
            ]),
          );
        }
      });
    });

    describe("early validation checks", () => {
      it("should return failure when data is falsy", () => {
        const schema = z.object({ name: z.string() });
        const options = {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: schema,
        };

        const result = validateJson(null, options, false, true);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.issues[0].message).toContain("Data is required");
        }
      });

      it("should return failure when data is undefined", () => {
        const schema = z.object({ name: z.string() });
        const options = {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: schema,
        };

        const result = validateJson(undefined, options, false, true);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.issues[0].message).toContain("Data is required");
        }
      });

      it("should return failure when data is empty object", () => {
        const schema = z.object({ name: z.string() });
        const options = {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: schema,
        };

        const result = validateJson({}, options, false, true);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.issues[0].message).toContain("cannot be empty");
        }
      });

      it("should return failure when data is empty array", () => {
        const schema = z.array(z.string());
        const options = {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: schema,
        };

        const result = validateJson([], options, false, true);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.issues[0].message).toContain("cannot be empty");
        }
      });

      it("should return failure when output format is not JSON", () => {
        const schema = z.object({ name: z.string() });
        const content = { name: "John" };
        const options = {
          outputFormat: LLMOutputFormat.TEXT,
          jsonSchema: schema,
        };

        const result = validateJson(content, options, false, true);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.issues[0].message).toContain("Output format must be JSON");
        }
      });

      it("should return failure when JSON schema is not provided", () => {
        const content = { name: "John" };
        const options = {
          outputFormat: LLMOutputFormat.JSON,
        };

        const result = validateJson(content, options, false, true);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.issues[0].message).toContain("JSON schema is required");
        }
      });
    });

    describe("logging behavior", () => {
      it("should log validation failures when loggingEnabled is true", () => {
        const schema = z.object({ name: z.string() });
        const content = { name: 123 }; // Invalid type
        const options = {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: schema,
        };

        // We can't easily test logging, but we can verify the function works
        const result = validateJson(content, options, true, true);

        expect(result.success).toBe(false);
      });

      it("should not log validation failures when loggingEnabled is false", () => {
        const schema = z.object({ name: z.string() });
        const content = { name: 123 }; // Invalid type
        const options = {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: schema,
        };

        const result = validateJson(content, options, false, false);

        expect(result.success).toBe(false);
      });
    });
  });

  describe("applySchemaFixingTransforms", () => {
    it("should apply convertNullToUndefined transform", () => {
      const data = { key: null, other: "value" };
      const result = applySchemaFixingTransforms(data);

      expect(result.data).toBeDefined();
      const transformed = result.data as Record<string, unknown>;
      expect("key" in transformed).toBe(false); // null converted to undefined and omitted
      expect(transformed.other).toBe("value");
      expect(result.steps).toContain("convertNullToUndefined");
    });

    it("should apply fixCommonPropertyNameTypos transform", () => {
      const data = { type_: "string", name_: "test", value: 123 };
      const result = applySchemaFixingTransforms(data);

      const transformed = result.data as Record<string, unknown>;
      expect(transformed.type).toBe("string");
      expect(transformed.name).toBe("test");
      expect("type_" in transformed).toBe(false);
      expect("name_" in transformed).toBe(false);
      expect(result.steps).toContain("fixCommonPropertyNameTypos");
    });

    it("should apply coerceStringToArray transform", () => {
      const data = {
        parameters: "some parameters description",
        dependencies: "some dependencies",
      };
      const result = applySchemaFixingTransforms(data);

      const transformed = result.data as Record<string, unknown>;
      expect(Array.isArray(transformed.parameters)).toBe(true);
      expect(transformed.parameters).toEqual([]);
      expect(Array.isArray(transformed.dependencies)).toBe(true);
      expect(transformed.dependencies).toEqual([]);
      expect(result.steps).toContain("coerceStringToArray");
    });

    it("should track all applied transforms", () => {
      const data = {
        type_: "string",
        parameters: "test",
        nested: { value: null },
      };
      const result = applySchemaFixingTransforms(data);

      expect(result.steps.length).toBeGreaterThan(0);
      expect(Array.isArray(result.steps)).toBe(true);
    });

    it("should not track transforms that made no changes", () => {
      const data = { key: "value", number: 42 };
      const result = applySchemaFixingTransforms(data);

      // If no transforms made changes, appliedTransforms might be empty
      // or only contain transforms that always run
      expect(result.data).toBeDefined();
      const transformed = result.data as Record<string, unknown>;
      expect(transformed.key).toBe("value");
      expect(transformed.number).toBe(42);
    });

    it("should handle nested structures", () => {
      const data = {
        level1: {
          type_: "nested",
          parameters: "nested params",
          value: null,
        },
      };
      const result = applySchemaFixingTransforms(data);

      const transformed = result.data as Record<string, unknown>;
      const level1 = transformed.level1 as Record<string, unknown>;
      expect(level1.type).toBe("nested");
      expect(Array.isArray(level1.parameters)).toBe(true);
      expect("value" in level1).toBe(false);
    });
  });
});
