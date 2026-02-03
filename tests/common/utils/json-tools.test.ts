import { z } from "zod";
import { parseAndValidateLLMJson } from "../../../src/common/llm/json-processing/core/json-processing";
import { LLMOutputFormat, LLMPurpose } from "../../../src/common/llm/types/llm-request.types";

// Test schemas for type inference testing
const TestUserSchema = z.object({
  name: z.string(),
  age: z.number(),
  email: z.string(),
});

const TestConfigSchema = z.object({
  enabled: z.boolean(),
  settings: z.object({
    timeout: z.number(),
    retries: z.number(),
  }),
});

// Types are inferred from schemas automatically by parseAndValidateLLMJson

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
      const result = parseAndValidateLLMJson(
        input,
        { resource: "content", purpose: LLMPurpose.COMPLETIONS, modelKey: "test-model" },
        completionOptions,
      );
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(expected);
      }
    });

    test("returns failure result for invalid JSON", () => {
      const text = "No JSON here";
      const completionOptions = { outputFormat: LLMOutputFormat.JSON };
      const result = parseAndValidateLLMJson(
        text,
        { resource: "content", purpose: LLMPurpose.COMPLETIONS, modelKey: "test-model" },
        completionOptions,
      );
      expect(result.success).toBe(false);
      if (!result.success) {
        // Plain text without JSON structure now gets a clearer error message
        expect(result.error.message).toMatch(/contains no JSON structure/);
        expect(result.error.message).toMatch(/appears to be plain text/);
      }
    });

    // Note: Non-string input handling was removed from this test because parseAndValidateLLMJson
    // now accepts only `string` type (not LLMResponsePayload). This change provides:
    // 1. Compile-time type safety - TypeScript prevents non-string input at build time
    // 2. Clearer API contract - the function name "parse" implies string input
    // 3. Separation of concerns - non-string handling (null, pre-parsed objects) is now done
    //    at the call site in LLMResponseProcessor.formatAndValidateResponse
    // See tests/common/llm/providers/llm-response-processor.test.ts for null/object handling tests.

    test("returns typed result with schema-based type inference", () => {
      const userJson =
        'Text before {"name": "John Doe", "age": 30, "email": "john@example.com"} text after';
      const completionOptions = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: TestUserSchema,
      };
      const result = parseAndValidateLLMJson(
        userJson,
        { resource: "content", purpose: LLMPurpose.COMPLETIONS, modelKey: "test-model" },
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
      const completionOptions = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: TestConfigSchema,
      };
      const result = parseAndValidateLLMJson(
        configJson,
        { resource: "content", purpose: LLMPurpose.COMPLETIONS, modelKey: "test-model" },
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
      const result = parseAndValidateLLMJson(
        input,
        { resource: "content", purpose: LLMPurpose.COMPLETIONS, modelKey: "test-model" },
        completionOptions,
      ); // No type parameter

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ dynamic: "content", count: 42 });
        // The result data should be of type Record<string, unknown>
        expect(typeof result.data).toBe("object");
      }
    });
  });
});
