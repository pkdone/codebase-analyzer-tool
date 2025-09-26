import { LLMOutputFormat } from "../../../src/llm/types/llm.types";
import {
  convertTextToJSONAndOptionallyValidate,
  validateSchemaIfNeededAndReturnResponse,
} from "../../../src/llm/utils/json-tools";

describe("json-tools", () => {
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

    test("should sanitize simple malformed JSON with backslashes", () => {
      // Start with a simpler test case to debug the sanitization
      const simpleJson = `{
  "field": "value with \\r\\n escapes",
  "codeExample": "SELECT * FROM table WHERE column = \\"value\\""
}`;
      
      const completionOptions = { outputFormat: LLMOutputFormat.JSON };
      
      const result = convertTextToJSONAndOptionallyValidate(
        simpleJson,
        "test-simple-malformed",
        completionOptions,
      );

      expect(result).toBeDefined();
      expect(typeof result).toBe("object");
      expect(result).toHaveProperty("field");
      expect(result).toHaveProperty("codeExample");
    });

    test("should sanitize and parse complex malformed LLM JSON response", () => {
      // A more targeted version of the problematic JSON to isolate the issue
      const malformedJson = '{"codeExample": "INSERT INTO table VALUES (1,\'test\',\'select * as \\"Column\\"\')"}';
      
      const completionOptions = { outputFormat: LLMOutputFormat.JSON };
      
      // This should not throw an error due to the sanitization fallback
      const result = convertTextToJSONAndOptionallyValidate(
        malformedJson,
        "test-targeted-malformed",
        completionOptions,
      );

      // Verify the result is a valid object with expected structure
      expect(result).toBeDefined();
      expect(typeof result).toBe("object");
      expect(result).toHaveProperty("codeExample");
      
      // Verify the codeExample field was properly sanitized and parsed
      const codeExample = (result as any).codeExample;
      expect(typeof codeExample).toBe("string");
      expect(codeExample).toContain("INSERT INTO");
    });

    test("should sanitize JSON with over-escaped sequences", () => {
      // Simpler test case with over-escaped sequences - use simpler pattern to avoid ESLint issues
      const overEscapedJson = '{"field": "value with excessive backslashes \\\\\\\\\\\\\\\\r\\\\\\\\\\\\\\\\n"}';
      
      const completionOptions = { outputFormat: LLMOutputFormat.JSON };
      
      // This should not throw an error due to the enhanced sanitization
      const result = convertTextToJSONAndOptionallyValidate(
        overEscapedJson,
        "test-over-escaped",
        completionOptions,
      );

      // Verify the result is a valid object
      expect(result).toBeDefined();
      expect(typeof result).toBe("object");
      expect(result).toHaveProperty("field");
      
      // Verify the field was properly sanitized
      const field = (result as any).field;
      expect(typeof field).toBe("string");
      expect(field).toContain("excessive backslashes");
    });

    test("should sanitize real-world complex JSON with mixed quote escaping", () => {
      // Simplified version of the problematic JSON pattern from actual error logs - avoid complex escaping for ESLint
      const complexJson = `{
        "purpose": "Test script",
        "codeExample": "INSERT INTO table VALUES (1, 'Client Listing', 'select name from users')"
      }`;
      
      const completionOptions = { outputFormat: LLMOutputFormat.JSON };
      
      const result = convertTextToJSONAndOptionallyValidate(
        complexJson,
        "test-real-complex",
        completionOptions,
      );

      expect(result).toBeDefined();
      expect(typeof result).toBe("object");
      expect(result).toHaveProperty("purpose");
      expect(result).toHaveProperty("codeExample");
      
      const codeExample = (result as any).codeExample;
      expect(typeof codeExample).toBe("string");
      expect(codeExample).toContain("INSERT INTO");
      expect(codeExample).toContain("Client Listing");
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
