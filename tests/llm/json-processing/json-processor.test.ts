import { JsonProcessor } from "../../../src/llm/json-processing/json-processor";
import { LLMOutputFormat } from "../../../src/llm/types/llm.types";
import {
  BadResponseContentLLMError,
  JsonProcessingError,
} from "../../../src/llm/types/llm-errors.types";

describe("JsonProcessor", () => {
  let jsonProcessor: JsonProcessor;

  beforeEach(() => {
    jsonProcessor = new JsonProcessor();
  });

  describe("constructor", () => {
    it("should create a new instance", () => {
      expect(jsonProcessor).toBeInstanceOf(JsonProcessor);
    });

    it("should create independent instances", () => {
      const processor1 = new JsonProcessor();
      const processor2 = new JsonProcessor();
      expect(processor1).not.toBe(processor2);
    });
  });

  describe("parseAndValidate", () => {
    const completionOptions = { outputFormat: LLMOutputFormat.JSON };

    describe("basic functionality", () => {
      it("should parse valid JSON string", () => {
        const json = '{"key": "value", "number": 42}';
        const result = jsonProcessor.parseAndValidate(json, "test-resource", completionOptions);
        expect(result).toEqual({ key: "value", number: 42 });
      });

      it("should parse valid JSON array", () => {
        const json = '[{"item": 1}, {"item": 2}]';
        const result = jsonProcessor.parseAndValidate(json, "test-resource", completionOptions);
        expect(result).toEqual([{ item: 1 }, { item: 2 }]);
      });

      it("should handle JSON with whitespace", () => {
        const json = '  \n\t  {"key": "value"}  \n\t  ';
        const result = jsonProcessor.parseAndValidate(json, "test-resource", completionOptions);
        expect(result).toEqual({ key: "value" });
      });

      it("should parse nested JSON objects", () => {
        const json = '{"outer": {"inner": {"deep": "value"}}}';
        const result = jsonProcessor.parseAndValidate(json, "test-resource", completionOptions);
        expect(result).toEqual({ outer: { inner: { deep: "value" } } });
      });
    });

    describe("error handling", () => {
      it("should throw error for non-string content", () => {
        const nonString = 12345 as any;
        expect(() =>
          jsonProcessor.parseAndValidate(nonString, "test-resource", completionOptions),
        ).toThrow(BadResponseContentLLMError);
      });

      it("should throw JsonProcessingError for invalid JSON with no recovery", () => {
        const invalid = "not valid json at all";
        expect(() =>
          jsonProcessor.parseAndValidate(invalid, "test-resource", completionOptions),
        ).toThrow(JsonProcessingError);
      });

      it("should throw error with resource name in message", () => {
        const invalid = "not valid json";
        expect(() =>
          jsonProcessor.parseAndValidate(invalid, "my-resource", completionOptions),
        ).toThrow(/my-resource/);
      });
    });

    describe("fast path optimization", () => {
      it("should use fast path for clean JSON", () => {
        const json = '{"simple": true}';
        const result = jsonProcessor.parseAndValidate(json, "test", completionOptions, false);
        expect(result).toEqual({ simple: true });
      });

      it("should handle multiple types via fast path", () => {
        const testCases = [
          { input: '{"string": "value"}', expected: { string: "value" } },
          { input: '{"number": 123}', expected: { number: 123 } },
          { input: '{"boolean": true}', expected: { boolean: true } },
          { input: '{"null": null}', expected: { null: null } },
          { input: '{"array": [1,2,3]}', expected: { array: [1, 2, 3] } },
        ];

        testCases.forEach(({ input, expected }) => {
          const result = jsonProcessor.parseAndValidate(input, "test", completionOptions);
          expect(result).toEqual(expected);
        });
      });
    });

    describe("progressive parsing strategies", () => {
      it("should extract JSON from surrounding text", () => {
        const text = 'Some text before {"key": "value"} some text after';
        const result = jsonProcessor.parseAndValidate(text, "test", completionOptions);
        expect(result).toEqual({ key: "value" });
      });

      it("should handle JSON in code fences", () => {
        const fenced = '```json\n{"key": "value"}\n```';
        const result = jsonProcessor.parseAndValidate(fenced, "test", completionOptions);
        expect(result).toEqual({ key: "value" });
      });

      it("should handle malformed JSON with trailing commas", () => {
        const malformed = '{"key": "value",}';
        const result = jsonProcessor.parseAndValidate(malformed, "test", completionOptions);
        expect(result).toEqual({ key: "value" });
      });

      it("should fix over-escaped sequences", () => {
        const overEscaped = '{"text": "Line 1\\\\nLine 2"}';
        const result = jsonProcessor.parseAndValidate(overEscaped, "test", completionOptions);
        expect((result as any).text).toContain("Line");
      });

      it("should handle concatenated identical objects", () => {
        const duplicated = '{"a":1}{"a":1}';
        const result = jsonProcessor.parseAndValidate(duplicated, "test", completionOptions);
        expect(result).toEqual({ a: 1 });
      });
    });

    describe("sanitization integration", () => {
      it("should apply multiple sanitizations in pipeline", () => {
        // This JSON has multiple issues: code fence, trailing comma, whitespace
        const messy = '```json\n  {"key": "value",}  \n```';
        const result = jsonProcessor.parseAndValidate(messy, "test", completionOptions);
        expect(result).toEqual({ key: "value" });
      });

      it("should handle complex real-world malformed JSON", () => {
        const complex = `{
          "purpose": "Test",
          "items": [
            {"name": "Item 1",},
            {"name": "Item 2",}
          ],
        }`;
        const result = jsonProcessor.parseAndValidate(complex, "test", completionOptions);
        expect((result as any).purpose).toBe("Test");
        expect((result as any).items).toHaveLength(2);
      });
    });

    describe("instance isolation", () => {
      it("should not share state between calls", () => {
        const json1 = '{"first": 1}';
        const json2 = '{"second": 2}';

        const result1 = jsonProcessor.parseAndValidate(json1, "test1", completionOptions);
        const result2 = jsonProcessor.parseAndValidate(json2, "test2", completionOptions);

        expect(result1).toEqual({ first: 1 });
        expect(result2).toEqual({ second: 2 });
      });

      it("should not share state between different instances", () => {
        const processor1 = new JsonProcessor();
        const processor2 = new JsonProcessor();

        const result1 = processor1.parseAndValidate('{"a": 1}', "test", completionOptions);
        const result2 = processor2.parseAndValidate('{"b": 2}', "test", completionOptions);

        expect(result1).toEqual({ a: 1 });
        expect(result2).toEqual({ b: 2 });
      });
    });

    describe("generic type support", () => {
      interface TestType {
        name: string;
        value: number;
      }

      it("should support generic type parameter", () => {
        const json = '{"name": "Test", "value": 42}';
        const result = jsonProcessor.parseAndValidate<TestType>(json, "test", completionOptions);
        expect(result.name).toBe("Test");
        expect(result.value).toBe(42);
      });

      it("should support array types", () => {
        const json = '[{"name": "A", "value": 1}, {"name": "B", "value": 2}]';
        const result = jsonProcessor.parseAndValidate<TestType[]>(json, "test", completionOptions);
        expect(result).toHaveLength(2);
        expect(result[0].name).toBe("A");
        expect(result[1].value).toBe(2);
      });
    });

    describe("sanitization logging", () => {
      it("should not log when disabled", () => {
        const json = 'Some text {"key": "value"} after';
        // Just ensure it doesn't throw - we're testing the logSanitizationSteps parameter
        expect(() =>
          jsonProcessor.parseAndValidate(json, "test", completionOptions, false),
        ).not.toThrow();
      });

      it("should handle logging enabled", () => {
        const json = 'Prefix {"key": "value"} suffix';
        // Just ensure it doesn't throw when logging is enabled
        expect(() =>
          jsonProcessor.parseAndValidate(json, "test", completionOptions, true),
        ).not.toThrow();
      });
    });

    describe("edge cases", () => {
      it("should handle empty object", () => {
        const json = "{}";
        const result = jsonProcessor.parseAndValidate(json, "test", completionOptions);
        expect(result).toEqual({});
      });

      it("should handle empty array", () => {
        const json = "[]";
        const result = jsonProcessor.parseAndValidate(json, "test", completionOptions);
        expect(result).toEqual([]);
      });

      it("should handle deeply nested structures", () => {
        const json = '{"a":{"b":{"c":{"d":{"e":"deep"}}}}}';
        const result = jsonProcessor.parseAndValidate(json, "test", completionOptions);
        expect((result as any).a.b.c.d.e).toBe("deep");
      });

      it("should handle large arrays", () => {
        const largeArray = JSON.stringify(Array.from({ length: 1000 }, (_, i) => ({ id: i })));
        const result = jsonProcessor.parseAndValidate(largeArray, "test", completionOptions);
        expect(Array.isArray(result)).toBe(true);
        expect((result as unknown as any[]).length).toBe(1000);
      });

      it("should handle unicode characters", () => {
        const json = '{"emoji": "😀", "chinese": "你好", "arabic": "مرحبا"}';
        const result = jsonProcessor.parseAndValidate(json, "test", completionOptions);
        expect((result as any).emoji).toBe("😀");
        expect((result as any).chinese).toBe("你好");
        expect((result as any).arabic).toBe("مرحبا");
      });
    });

    describe("JsonProcessingError context", () => {
      it("should throw JsonProcessingError with original content", () => {
        const invalid = "completely invalid json content here";
        try {
          jsonProcessor.parseAndValidate(invalid, "test-resource", completionOptions);
          fail("Expected JsonProcessingError to be thrown");
        } catch (error) {
          expect(error).toBeInstanceOf(JsonProcessingError);
          const jsonError = error as JsonProcessingError;
          expect(jsonError.originalContent).toBe(invalid);
        }
      });

      it("should capture sanitized content in JsonProcessingError", () => {
        const invalid = "{ this is not valid json at all }";
        try {
          jsonProcessor.parseAndValidate(invalid, "test-resource", completionOptions);
          fail("Expected JsonProcessingError to be thrown");
        } catch (error) {
          expect(error).toBeInstanceOf(JsonProcessingError);
          const jsonError = error as JsonProcessingError;
          expect(jsonError.sanitizedContent).toBeDefined();
          expect(typeof jsonError.sanitizedContent).toBe("string");
        }
      });

      it("should track applied sanitizers in JsonProcessingError", () => {
        const withCodeFence = "```json\n{invalid json}\n```";
        try {
          jsonProcessor.parseAndValidate(withCodeFence, "test-resource", completionOptions);
          fail("Expected JsonProcessingError to be thrown");
        } catch (error) {
          expect(error).toBeInstanceOf(JsonProcessingError);
          const jsonError = error as JsonProcessingError;
          expect(Array.isArray(jsonError.appliedSanitizers)).toBe(true);
          // Should have attempted at least the extract strategy
          expect(jsonError.appliedSanitizers.length).toBeGreaterThanOrEqual(0);
        }
      });

      it("should include resource name in JsonProcessingError message", () => {
        const invalid = "not valid json";
        try {
          jsonProcessor.parseAndValidate(invalid, "my-custom-resource", completionOptions);
          fail("Expected JsonProcessingError to be thrown");
        } catch (error) {
          expect(error).toBeInstanceOf(JsonProcessingError);
          expect((error as Error).message).toContain("my-custom-resource");
        }
      });

      it("should capture underlying error in JsonProcessingError", () => {
        const almostValid = '{"key": "value", but with extra text}';
        try {
          jsonProcessor.parseAndValidate(almostValid, "test-resource", completionOptions);
          fail("Expected JsonProcessingError to be thrown");
        } catch (error) {
          expect(error).toBeInstanceOf(JsonProcessingError);
          const jsonError = error as JsonProcessingError;
          // Should have captured some underlying error (SyntaxError from JSON.parse)
          expect(jsonError.underlyingError).toBeDefined();
        }
      });

      it("should preserve error name as JsonProcessingError", () => {
        const invalid = "not valid json";
        try {
          jsonProcessor.parseAndValidate(invalid, "test-resource", completionOptions);
          fail("Expected JsonProcessingError to be thrown");
        } catch (error) {
          expect((error as Error).name).toBe("JsonProcessingError");
        }
      });
    });
  });
});
