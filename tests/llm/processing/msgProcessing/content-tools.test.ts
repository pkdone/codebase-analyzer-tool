import { LLMOutputFormat } from "../../../../src/llm/llm.types";
import {
  convertTextToJSONAndOptionallyValidate,
  validateSchemaIfNeededAndReturnResponse,
} from "../../../../src/llm/processing/msgProcessing/content-tools";

describe("content-tools", () => {
  // Note: extractTokensAmountFromMetadataDefaultingMissingValues and
  // postProcessAsJSONIfNeededGeneratingNewResult have been moved to AbstractLLM
  // as protected methods and are now tested in tests/llm/core/abstract-llm.test.ts

  describe("convertTextToJSONAndOptionallyValidate", () => {
    test("should convert valid JSON string to object", () => {
      const jsonString = '{"key": "value", "number": 42}';
      const completionOptions = { outputFormat: LLMOutputFormat.JSON };
      const result = convertTextToJSONAndOptionallyValidate(
        jsonString,
        "content",
        completionOptions,
      );

      expect(result).toEqual({ key: "value", number: 42 });
    });

    test("should handle JSON with surrounding text", () => {
      const textWithJson = 'Some text before {"key": "value"} some text after';
      const completionOptions = { outputFormat: LLMOutputFormat.JSON };
      const result = convertTextToJSONAndOptionallyValidate(
        textWithJson,
        "content",
        completionOptions,
      );

      expect(result).toEqual({ key: "value" });
    });

    test("should handle array JSON", () => {
      const arrayJson = '[{"item": 1}, {"item": 2}]';
      const completionOptions = { outputFormat: LLMOutputFormat.JSON };
      const result = convertTextToJSONAndOptionallyValidate(
        arrayJson,
        "content",
        completionOptions,
      );

      expect(result).toEqual([{ item: 1 }, { item: 2 }]);
    });

    test("should throw error for invalid JSON", () => {
      const invalidJson = "not valid json";
      const completionOptions = { outputFormat: LLMOutputFormat.JSON };

      expect(() =>
        convertTextToJSONAndOptionallyValidate(invalidJson, "content", completionOptions),
      ).toThrow("doesn't contain valid JSON content for text");
    });

    test("should throw error for non-string input", () => {
      const nonStringInput = 123;
      const completionOptions = { outputFormat: LLMOutputFormat.JSON };

      expect(() =>
        convertTextToJSONAndOptionallyValidate(
          nonStringInput as unknown as string,
          "content",
          completionOptions,
        ),
      ).toThrow("LLM response for resource");
    });
  });

  describe("validateSchemaIfNeededAndReturnResponse", () => {
    test("should return content when no schema validation needed", () => {
      const content = { key: "value" };
      const options = { outputFormat: LLMOutputFormat.TEXT };

      const result = validateSchemaIfNeededAndReturnResponse(content, options, "test-content");

      expect(result).toEqual(content);
    });

    test("should return null for null content", () => {
      const content = null;
      const options = { outputFormat: LLMOutputFormat.JSON };

      const result = validateSchemaIfNeededAndReturnResponse(content, options, "test-null-content");

      expect(result).toBeNull();
    });
  });
});
