import { LLMOutputFormat } from "../../../../src/common/llm/types/llm.types";
import { z } from "zod";
import { validateJsonWithTransforms } from "../../../../src/common/llm/json-processing/core/json-validating";

describe("json-validator", () => {
  describe("validateJsonWithTransforms", () => {
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
        expect(result.transformRepairs).toBeDefined();
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

    it("should return failure when data is null", () => {
      const schema = z.object({ name: z.string() });
      const content = null;
      const options = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      };

      const result = validateJsonWithTransforms(content, options.jsonSchema);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.issues).toBeDefined();
        expect(result.issues[0]?.message).toContain("Data is required");
      }
    });

    it("should return failure when data is undefined", () => {
      const schema = z.object({ name: z.string() });
      const content = undefined;
      const options = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      };

      const result = validateJsonWithTransforms(content, options.jsonSchema);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.issues).toBeDefined();
        expect(result.issues[0]?.message).toContain("Data is required");
      }
    });

    it("should return failure when data is empty object", () => {
      const schema = z.object({ name: z.string() });
      const content = {};
      const options = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      };

      const result = validateJsonWithTransforms(content, options.jsonSchema);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.issues).toBeDefined();
        expect(result.issues[0]?.message).toContain("Data is required");
      }
    });

    it("should return failure when data is empty array", () => {
      const schema = z.array(z.string());
      const content: string[] = [];
      const options = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      };

      const result = validateJsonWithTransforms(content, options.jsonSchema);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.issues).toBeDefined();
        expect(result.issues[0]?.message).toContain("Data is required");
      }
    });
  });

  describe("function isolation", () => {
    it("should not share state between calls", () => {
      const schema = z.object({ value: z.number() });
      const options = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      };

      const result1 = validateJsonWithTransforms({ value: 1 }, options.jsonSchema);
      const result2 = validateJsonWithTransforms({ value: 2 }, options.jsonSchema);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      if (result1.success && result2.success) {
        expect(result1.data).toEqual({ value: 1 });
        expect(result2.data).toEqual({ value: 2 });
      }
    });
  });
});
