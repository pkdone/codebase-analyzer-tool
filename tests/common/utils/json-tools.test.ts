import { JsonProcessor } from "../../../src/llm/json-processing/json-processor";
import { LLMOutputFormat } from "../../../src/llm/types/llm.types";

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
  let jsonProcessor: JsonProcessor;

  beforeEach(() => {
    jsonProcessor = new JsonProcessor();
  });
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
      const result = jsonProcessor.parseAndValidate(input, "content", completionOptions);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(expected);
      }
    });

    test("returns failure result for invalid JSON", () => {
      const text = "No JSON here";
      const completionOptions = { outputFormat: LLMOutputFormat.JSON };
      const result = jsonProcessor.parseAndValidate(text, "content", completionOptions);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toMatch(/doesn't contain valid JSON content/);
      }
    });

    test("returns failure result for non-string input", () => {
      const completionOptions = { outputFormat: LLMOutputFormat.JSON };
      const testCases = [{ input: { key: "value" } }, { input: [1, 2, 3] }, { input: null }];

      testCases.forEach(({ input }) => {
        const result = jsonProcessor.parseAndValidate(input, "content", completionOptions);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.message).toMatch(/LLM response for resource/);
        }
      });
    });

    test("returns typed result with generic type parameter", () => {
      const userJson =
        'Text before {"name": "John Doe", "age": 30, "email": "john@example.com"} text after';
      const completionOptions = { outputFormat: LLMOutputFormat.JSON };
      const result = jsonProcessor.parseAndValidate<TestUser>(
        userJson,
        "content",
        completionOptions,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        // TypeScript should now provide type safety for these properties
        expect(result.data.name).toBe("John Doe");
        expect(result.data.age).toBe(30);
        expect(result.data.email).toBe("john@example.com");
      }
    });

    test("returns complex typed result with nested objects", () => {
      const configJson =
        'Prefix {"enabled": true, "settings": {"timeout": 5000, "retries": 3}} suffix';
      const completionOptions = { outputFormat: LLMOutputFormat.JSON };
      const result = jsonProcessor.parseAndValidate<TestConfig>(
        configJson,
        "content",
        completionOptions,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        // TypeScript should provide type safety for nested properties
        expect(result.data.enabled).toBe(true);
        expect(result.data.settings.timeout).toBe(5000);
        expect(result.data.settings.retries).toBe(3);
      }
    });

    test("defaults to Record<string, unknown> when no type parameter provided", () => {
      const input = 'Text {"dynamic": "content", "count": 42} more text';
      const completionOptions = { outputFormat: LLMOutputFormat.JSON };
      const result = jsonProcessor.parseAndValidate(input, "content", completionOptions); // No type parameter

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ dynamic: "content", count: 42 });
        // The result data should be of type Record<string, unknown>
        expect(typeof result.data).toBe("object");
      }
    });
  });
});
