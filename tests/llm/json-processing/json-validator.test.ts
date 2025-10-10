import { JsonValidator } from "../../../src/llm/json-processing/json-validator";
import { LLMOutputFormat } from "../../../src/llm/types/llm.types";
import { z } from "zod";

describe("json-validator", () => {
  let jsonValidator: JsonValidator;

  beforeEach(() => {
    jsonValidator = new JsonValidator();
  });

  describe("JsonValidator.validate", () => {
    it("should validate and return data when schema validation succeeds", () => {
      const schema = z.object({ name: z.string(), age: z.number() });
      const content = { name: "John", age: 30 };
      const options = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      };

      const result = jsonValidator.validate(content, options, "test-resource");

      expect(result).toEqual(content);
    });

    it("should return null when schema validation fails", () => {
      const schema = z.object({ name: z.string(), age: z.number() });
      const content = { name: "John", age: "thirty" }; // Invalid age type
      const options = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      };

      const result = jsonValidator.validate(content, options, "test-resource");

      expect(result).toBeNull();
    });

    it("should call onValidationIssues callback when validation fails", () => {
      const schema = z.object({ name: z.string(), age: z.number() });
      const content = { name: "John", age: "thirty" };
      const options = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      };
      const onValidationIssues = jest.fn();

      jsonValidator.validate(content, options, "test-resource", false, onValidationIssues);

      expect(onValidationIssues).toHaveBeenCalled();
      expect(onValidationIssues.mock.calls[0][0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ["age"],
          }),
        ]),
      );
    });

    it("should return content as-is for TEXT output format", () => {
      const content = "This is plain text content";
      const options = { outputFormat: LLMOutputFormat.TEXT };

      const result = jsonValidator.validate(content, options, "test-resource");

      expect(result).toBe(content);
    });

    it("should return null for invalid content in TEXT output format", () => {
      const content = undefined; // Not valid LLMGeneratedContent
      const options = { outputFormat: LLMOutputFormat.TEXT };

      const result = jsonValidator.validate(content, options, "test-resource");

      expect(result).toBeNull();
    });

    it("should use type guard for TEXT format to validate content safety", () => {
      const validContent = { key: "value" }; // Valid LLMGeneratedContent
      const options = { outputFormat: LLMOutputFormat.TEXT };

      const result = jsonValidator.validate(validContent, options, "test-resource");

      expect(result).toEqual(validContent);
    });

    it("should handle number as invalid content for TEXT format", () => {
      const content = 42; // Number is not valid LLMGeneratedContent
      const options = { outputFormat: LLMOutputFormat.TEXT };

      const result = jsonValidator.validate(content, options, "test-resource");

      expect(result).toBeNull();
    });

    it("should return content when no schema is provided for JSON format", () => {
      const content = { name: "John", age: 30 };
      const options = { outputFormat: LLMOutputFormat.JSON };

      const result = jsonValidator.validate(content, options, "test-resource");

      expect(result).toEqual(content);
    });

    it("should return null for invalid content when no schema and not TEXT format", () => {
      const content = undefined; // Not valid LLMGeneratedContent
      const options = { outputFormat: LLMOutputFormat.JSON };

      const result = jsonValidator.validate(content, options, "test-resource");

      expect(result).toBeNull();
    });
  });

  describe("instance isolation", () => {
    it("should create independent instances", () => {
      const validator1 = new JsonValidator();
      const validator2 = new JsonValidator();
      expect(validator1).not.toBe(validator2);
    });

    it("should not share state between calls", () => {
      const schema = z.object({ value: z.number() });
      const options = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      };

      const result1 = jsonValidator.validate({ value: 1 }, options, "resource1");
      const result2 = jsonValidator.validate({ value: 2 }, options, "resource2");

      expect(result1).toEqual({ value: 1 });
      expect(result2).toEqual({ value: 2 });
    });
  });
});
