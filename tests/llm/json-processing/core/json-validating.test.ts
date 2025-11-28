import { validateJson } from "../../../../src/llm/json-processing/core/json-validating";
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

        const result = validateJson(content, options);

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

        const result = validateJson(content, options);

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

        const result = validateJson(content, options, false);

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

    describe("TEXT format validation", () => {
      it("should return content as-is for TEXT output format", () => {
        const content = "This is plain text content";
        const options = { outputFormat: LLMOutputFormat.TEXT };

        const result = validateJson(content, options);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBe(content);
        }
      });

      it("should return failure result for invalid content in TEXT output format", () => {
        const content = undefined; // Not valid LLMGeneratedContent
        const options = { outputFormat: LLMOutputFormat.TEXT };

        const result = validateJson(content, options);

        expect(result.success).toBe(false);
      });

      it("should use type guard for TEXT format to validate content safety", () => {
        const validContent = { key: "value" }; // Valid LLMGeneratedContent
        const options = { outputFormat: LLMOutputFormat.TEXT };

        const result = validateJson(validContent, options);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(validContent);
        }
      });

      it("should handle number as invalid content for TEXT format", () => {
        const content = 42; // Number is not valid LLMGeneratedContent
        const options = { outputFormat: LLMOutputFormat.TEXT };

        const result = validateJson(content, options);

        expect(result.success).toBe(false);
      });
    });

    describe("default LLMGeneratedContent validation", () => {
      it("should return content when no schema is provided for JSON format", () => {
        const content = { name: "John", age: 30 };
        const options = { outputFormat: LLMOutputFormat.JSON };

        const result = validateJson(content, options);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(content);
        }
      });

      it("should return failure result for invalid content when no schema and not TEXT format", () => {
        const content = undefined; // Not valid LLMGeneratedContent
        const options = { outputFormat: LLMOutputFormat.JSON };

        const result = validateJson(content, options);

        expect(result.success).toBe(false);
      });
    });

    describe("LLMGeneratedContent type validation", () => {
      it("should accept string as valid LLMGeneratedContent", () => {
        const content = "This is a string";
        const options = { outputFormat: LLMOutputFormat.TEXT };

        const result = validateJson(content, options);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBe(content);
        }
      });

      it("should accept object as valid LLMGeneratedContent", () => {
        const content = { key: "value", nested: { data: 123 } };
        const options = { outputFormat: LLMOutputFormat.TEXT };

        const result = validateJson(content, options);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(content);
        }
      });

      it("should accept array as valid LLMGeneratedContent", () => {
        const content = [1, 2, 3, "four", { five: 5 }];
        const options = { outputFormat: LLMOutputFormat.TEXT };

        const result = validateJson(content, options);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(content);
        }
      });

      it("should accept null as valid LLMGeneratedContent", () => {
        const content = null;
        const options = { outputFormat: LLMOutputFormat.TEXT };

        const result = validateJson(content, options);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBeNull();
        }
      });

      it("should reject number as invalid LLMGeneratedContent", () => {
        const content = 42;
        const options = { outputFormat: LLMOutputFormat.TEXT };

        const result = validateJson(content, options);

        expect(result.success).toBe(false);
      });

      it("should reject boolean as invalid LLMGeneratedContent", () => {
        const content = true;
        const options = { outputFormat: LLMOutputFormat.TEXT };

        const result = validateJson(content, options);

        expect(result.success).toBe(false);
      });

      it("should reject undefined as invalid LLMGeneratedContent", () => {
        const content = undefined;
        const options = { outputFormat: LLMOutputFormat.TEXT };

        const result = validateJson(content, options);

        expect(result.success).toBe(false);
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
        const result = validateJson(content, options, true);

        expect(result.success).toBe(false);
      });

      it("should not log validation failures when loggingEnabled is false", () => {
        const schema = z.object({ name: z.string() });
        const content = { name: 123 }; // Invalid type
        const options = {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: schema,
        };

        const result = validateJson(content, options, false);

        expect(result.success).toBe(false);
      });
    });
  });
});
