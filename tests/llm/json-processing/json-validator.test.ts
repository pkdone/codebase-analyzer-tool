import {
  applyOptionalSchemaValidationToContent,
  isLLMGeneratedContent,
} from "../../../src/llm/json-processing/json-validator";
import { LLMOutputFormat } from "../../../src/llm/types/llm.types";
import { z } from "zod";

describe("json-validator", () => {
  describe("applyOptionalSchemaValidationToContent", () => {
    it("should validate and return data when schema validation succeeds", () => {
      const schema = z.object({ name: z.string(), age: z.number() });
      const content = { name: "John", age: 30 };
      const options = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      };

      const result = applyOptionalSchemaValidationToContent(content, options, "test-resource");

      expect(result).toEqual(content);
    });

    it("should return null when schema validation fails", () => {
      const schema = z.object({ name: z.string(), age: z.number() });
      const content = { name: "John", age: "thirty" }; // Invalid age type
      const options = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      };

      const result = applyOptionalSchemaValidationToContent(content, options, "test-resource");

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

      applyOptionalSchemaValidationToContent(
        content,
        options,
        "test-resource",
        false,
        onValidationIssues,
      );

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

      const result = applyOptionalSchemaValidationToContent(content, options, "test-resource");

      expect(result).toBe(content);
    });

    it("should return null for invalid content in TEXT output format", () => {
      const content = undefined; // Not valid LLMGeneratedContent
      const options = { outputFormat: LLMOutputFormat.TEXT };

      const result = applyOptionalSchemaValidationToContent(content, options, "test-resource");

      expect(result).toBeNull();
    });

    it("should use type guard for TEXT format to validate content safety", () => {
      const validContent = { key: "value" }; // Valid LLMGeneratedContent
      const options = { outputFormat: LLMOutputFormat.TEXT };

      const result = applyOptionalSchemaValidationToContent(validContent, options, "test-resource");

      expect(result).toEqual(validContent);
    });

    it("should handle number as invalid content for TEXT format", () => {
      const content = 42; // Number is not valid LLMGeneratedContent
      const options = { outputFormat: LLMOutputFormat.TEXT };

      const result = applyOptionalSchemaValidationToContent(content, options, "test-resource");

      expect(result).toBeNull();
    });

    it("should return content when no schema is provided for JSON format", () => {
      const content = { name: "John", age: 30 };
      const options = { outputFormat: LLMOutputFormat.JSON };

      const result = applyOptionalSchemaValidationToContent(content, options, "test-resource");

      expect(result).toEqual(content);
    });

    it("should return null for invalid content when no schema and not TEXT format", () => {
      const content = undefined; // Not valid LLMGeneratedContent
      const options = { outputFormat: LLMOutputFormat.JSON };

      const result = applyOptionalSchemaValidationToContent(content, options, "test-resource");

      expect(result).toBeNull();
    });
  });

  describe("isLLMGeneratedContent", () => {
    it("should return true for null", () => {
      expect(isLLMGeneratedContent(null)).toBe(true);
    });

    it("should return true for string", () => {
      expect(isLLMGeneratedContent("test string")).toBe(true);
    });

    it("should return true for array", () => {
      expect(isLLMGeneratedContent([1, 2, 3])).toBe(true);
    });

    it("should return true for object", () => {
      expect(isLLMGeneratedContent({ key: "value" })).toBe(true);
    });

    it("should return false for undefined", () => {
      expect(isLLMGeneratedContent(undefined)).toBe(false);
    });

    it("should return false for number", () => {
      expect(isLLMGeneratedContent(42)).toBe(false);
    });

    it("should return false for boolean", () => {
      expect(isLLMGeneratedContent(true)).toBe(false);
    });

    it("should return false for symbol", () => {
      expect(isLLMGeneratedContent(Symbol("test"))).toBe(false);
    });
  });
});
