import { convertTextToJSONAndOptionallyValidate } from "../../../src/llm/processing/msgProcessing/content-tools";
import { LLMOutputFormat } from "../../../src/llm/llm.types";

// Test interfaces for generic type testing
interface TestUser {
  name: string;
  age: number;
  email: string;
}

interface TestConfig {
  enabled: boolean;
  settings: {
    timeout: number;
    retries: number;
  };
}

describe("JSON utilities", () => {
  describe("convertTextToJSON", () => {
    // Test data for convertTextToJSON function
    const validJsonTestData = [
      {
        input: 'Some text before {"key": "value"} some text after',
        expected: { key: "value" },
        description: "valid JSON",
      },
      {
        input: 'Prefix {"outer": {"inner": 123}} suffix',
        expected: { outer: { inner: 123 } },
        description: "nested JSON",
      },
      {
        input: 'Text with escaped control chars {"key": "value\\nwith\\tcontrol\\rchars"}',
        expected: { key: "value\nwith\tcontrol\rchars" },
        description: "escaped control characters",
      },
      {
        input: 'Text with newline in JSON {"description": "First line.\\nSecond line."}',
        expected: { description: "First line.\nSecond line." },
        description: "JSON with escaped newline character",
      },
    ];

    test.each(validJsonTestData)("with $description", ({ input, expected }) => {
      const completionOptions = { outputFormat: LLMOutputFormat.JSON };
      const result = convertTextToJSONAndOptionallyValidate(input, "content", completionOptions);
      expect(result).toEqual(expected);
    });

    test("throws on invalid JSON", () => {
      const text = "No JSON here";
      const completionOptions = { outputFormat: LLMOutputFormat.JSON };
      expect(() =>
        convertTextToJSONAndOptionallyValidate(text, "content", completionOptions),
      ).toThrow("doesn't contain valid JSON content for text");
    });

    test("throws on non-string input", () => {
      const completionOptions = { outputFormat: LLMOutputFormat.JSON };
      const testCases = [{ input: { key: "value" } }, { input: [1, 2, 3] }, { input: null }];

      testCases.forEach(({ input }) => {
        expect(() =>
          convertTextToJSONAndOptionallyValidate(input, "content", completionOptions),
        ).toThrow("LLM response for resource");
      });
    });

    test("returns typed result with generic type parameter", () => {
      const userJson =
        'Text before {"name": "John Doe", "age": 30, "email": "john@example.com"} text after';
      const completionOptions = { outputFormat: LLMOutputFormat.JSON };
      const user = convertTextToJSONAndOptionallyValidate<TestUser>(
        userJson,
        "content",
        completionOptions,
      );

      // TypeScript should now provide type safety for these properties
      expect(user.name).toBe("John Doe");
      expect(user.age).toBe(30);
      expect(user.email).toBe("john@example.com");
    });

    test("returns complex typed result with nested objects", () => {
      const configJson =
        'Prefix {"enabled": true, "settings": {"timeout": 5000, "retries": 3}} suffix';
      const completionOptions = { outputFormat: LLMOutputFormat.JSON };
      const config = convertTextToJSONAndOptionallyValidate<TestConfig>(
        configJson,
        "content",
        completionOptions,
      );

      // TypeScript should provide type safety for nested properties
      expect(config.enabled).toBe(true);
      expect(config.settings.timeout).toBe(5000);
      expect(config.settings.retries).toBe(3);
    });

    test("defaults to Record<string, unknown> when no type parameter provided", () => {
      const input = 'Text {"dynamic": "content", "count": 42} more text';
      const completionOptions = { outputFormat: LLMOutputFormat.JSON };
      const result = convertTextToJSONAndOptionallyValidate(input, "content", completionOptions); // No type parameter

      expect(result).toEqual({ dynamic: "content", count: 42 });
      // The result should be of type Record<string, unknown>
      expect(typeof result).toBe("object");
    });
  });
});
