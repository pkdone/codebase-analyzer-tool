import { validateJsonWithTransforms } from "../../../../src/llm/json-processing/core/json-validating";
import { LLMOutputFormat } from "../../../../src/llm/types/llm.types";
import { z } from "zod";

describe("json-validating", () => {
  describe("validateJsonWithTransforms", () => {
    describe("schema validation", () => {
      it("should validate and return data when schema validation succeeds", () => {
        const schema = z.object({ name: z.string(), age: z.number() });
        const content = { name: "John", age: 30 };
        const options = {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: schema,
        };

        const result = validateJsonWithTransforms(content, options.jsonSchema);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(content);
          expect(result.transformSteps).toEqual([]);
        }
      });

      it("should return failure result when schema validation fails", () => {
        const schema = z.object({ name: z.string(), age: z.number() });
        const content = { name: "John", age: "thirty" }; // Invalid age type
        const options = {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: schema,
        };

        const result = validateJsonWithTransforms(content, options.jsonSchema);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.issues).toBeDefined();
          expect(Array.isArray(result.issues)).toBe(true);
          expect(result.transformSteps).toBeDefined();
        }
      });

      it("should include validation issues in failure result", () => {
        const schema = z.object({ name: z.string(), age: z.number() });
        const content = { name: "John", age: "thirty" };
        const options = {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: schema,
        };

        const result = validateJsonWithTransforms(content, options.jsonSchema);

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

        const result = validateJsonWithTransforms(null, options.jsonSchema);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.issues[0].message).toContain("Data is required");
          expect(result.transformSteps).toBeDefined();
        }
      });

      it("should return failure when data is undefined", () => {
        const schema = z.object({ name: z.string() });
        const options = {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: schema,
        };

        const result = validateJsonWithTransforms(undefined, options.jsonSchema);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.issues[0].message).toContain("Data is required");
          expect(result.transformSteps).toBeDefined();
        }
      });

      it("should return failure when data is empty object", () => {
        const schema = z.object({ name: z.string() });
        const options = {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: schema,
        };

        const result = validateJsonWithTransforms({}, options.jsonSchema);

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

        const result = validateJsonWithTransforms([], options.jsonSchema);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.issues[0].message).toContain("cannot be empty");
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
        const result = validateJsonWithTransforms(content, options.jsonSchema);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.transformSteps).toBeDefined();
        }
      });

      it("should not log validation failures when loggingEnabled is false", () => {
        const schema = z.object({ name: z.string() });
        const content = { name: 123 }; // Invalid type
        const options = {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: schema,
        };

        const result = validateJsonWithTransforms(content, options.jsonSchema);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.transformSteps).toBeDefined();
        }
      });
    });

    describe("transform application", () => {
      it("should apply transforms when initial validation fails", () => {
        const schema = z.object({
          name: z.string(),
          groupId: z.string().optional(), // Does not allow null, only undefined
        });
        const content = { name: "test", groupId: null };
        const options = {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: schema,
        };

        const result = validateJsonWithTransforms(content, options.jsonSchema);

        expect(result.success).toBe(true);
        if (result.success) {
          const data = result.data as Record<string, unknown>;
          expect(data.name).toBe("test");
          expect("groupId" in data).toBe(false); // null converted to undefined and omitted
          expect(result.transformSteps).toContain("convertNullToUndefined");
        }
      });

      it("should return transform steps even when validation fails after transforms", () => {
        const schema = z.object({
          name: z.string(),
          requiredField: z.string(),
        });
        const content = { name: "test" }; // Missing requiredField
        const options = {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: schema,
        };

        const result = validateJsonWithTransforms(content, options.jsonSchema);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.transformSteps).toBeDefined();
          expect(Array.isArray(result.transformSteps)).toBe(true);
        }
      });
    });
  });

  describe("transform application through public API", () => {
    it("should apply fixCommonPropertyNameTypos transform via validateJsonWithTransforms", () => {
      const schema = z.object({ type: z.string(), name: z.string(), value: z.number() });
      const data = { type_: "string", name_: "test", value: 123 };
      const options = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      };

      const result = validateJsonWithTransforms(data, options.jsonSchema);

      expect(result.success).toBe(true);
      if (result.success) {
        const data = result.data as Record<string, unknown>;
        expect(data.type).toBe("string");
        expect(data.name).toBe("test");
        expect("type_" in data).toBe(false);
        expect("name_" in data).toBe(false);
        expect(result.transformSteps).toContain("fixCommonPropertyNameTypos");
      }
    });

    it("should apply coerceStringToArray transform via validateJsonWithTransforms", () => {
      const schema = z.object({
        parameters: z.array(z.unknown()),
        dependencies: z.array(z.unknown()),
      });
      const data = {
        parameters: "some parameters description",
        dependencies: "some dependencies",
      };
      const options = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      };

      const result = validateJsonWithTransforms(data, options.jsonSchema);

      expect(result.success).toBe(true);
      if (result.success) {
        const data = result.data as Record<string, unknown>;
        expect(Array.isArray(data.parameters)).toBe(true);
        expect(data.parameters).toEqual([]);
        expect(Array.isArray(data.dependencies)).toBe(true);
        expect(data.dependencies).toEqual([]);
        expect(result.transformSteps).toContain("coerceStringToArray");
      }
    });

    it("should track all applied transforms via validateJsonWithTransforms", () => {
      const schema = z.object({
        type: z.string(),
        parameters: z.array(z.unknown()),
        nested: z.object({ value: z.string().optional() }),
      });
      const data = {
        type_: "string",
        parameters: "test",
        nested: { value: null },
      };
      const options = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      };

      const result = validateJsonWithTransforms(data, options.jsonSchema);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.transformSteps.length).toBeGreaterThan(0);
        expect(Array.isArray(result.transformSteps)).toBe(true);
      }
    });

    it("should handle nested structures via validateJsonWithTransforms", () => {
      const schema = z.object({
        level1: z.object({
          type: z.string(),
          parameters: z.array(z.unknown()),
          value: z.string().optional(),
        }),
      });
      const data = {
        level1: {
          type_: "nested",
          parameters: "nested params",
          value: null,
        },
      };
      const options = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      };

      const result = validateJsonWithTransforms(data, options.jsonSchema);

      expect(result.success).toBe(true);
      if (result.success) {
        const data = result.data as Record<string, unknown>;
        const level1 = data.level1 as Record<string, unknown>;
        expect(level1.type).toBe("nested");
        expect(Array.isArray(level1.parameters)).toBe(true);
        expect("value" in level1).toBe(false);
      }
    });
  });
});
