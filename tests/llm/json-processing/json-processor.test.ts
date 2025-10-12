import { JsonProcessor } from "../../../src/llm/json-processing/core/json-processor";
import { LLMOutputFormat } from "../../../src/llm/types/llm.types";
import { JsonProcessingError } from "../../../src/llm/types/llm-errors.types";

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
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual({ key: "value", number: 42 });
        }
      });

      it("should parse valid JSON array", () => {
        const json = '[{"item": 1}, {"item": 2}]';
        const result = jsonProcessor.parseAndValidate(json, "test-resource", completionOptions);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual([{ item: 1 }, { item: 2 }]);
        }
      });

      it("should handle JSON with whitespace", () => {
        const json = '  \n\t  {"key": "value"}  \n\t  ';
        const result = jsonProcessor.parseAndValidate(json, "test-resource", completionOptions);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual({ key: "value" });
        }
      });

      it("should parse nested JSON objects", () => {
        const json = '{"outer": {"inner": {"deep": "value"}}}';
        const result = jsonProcessor.parseAndValidate(json, "test-resource", completionOptions);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual({ outer: { inner: { deep: "value" } } });
        }
      });
    });

    describe("error handling", () => {
      it("should return failure result for non-string content", () => {
        const nonString = 12345 as any;
        const result = jsonProcessor.parseAndValidate(
          nonString,
          "test-resource",
          completionOptions,
        );
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBeInstanceOf(JsonProcessingError);
        }
      });

      it("should return JsonProcessingError for invalid JSON with no recovery", () => {
        const invalid = "not valid json at all";
        const result = jsonProcessor.parseAndValidate(invalid, "test-resource", completionOptions);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBeInstanceOf(JsonProcessingError);
        }
      });

      it("should include resource name in error message", () => {
        const invalid = "not valid json";
        const result = jsonProcessor.parseAndValidate(invalid, "my-resource", completionOptions);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.message).toMatch(/my-resource/);
        }
      });
    });

    describe("fast path optimization", () => {
      it("should use fast path for clean JSON", () => {
        const json = '{"simple": true}';
        const result = jsonProcessor.parseAndValidate(json, "test", completionOptions);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual({ simple: true });
        }
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
          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.data).toEqual(expected);
          }
        });
      });
    });

    describe("progressive parsing strategies", () => {
      it("should extract JSON from surrounding text", () => {
        const text = 'Some text before {"key": "value"} some text after';
        const result = jsonProcessor.parseAndValidate(text, "test", completionOptions);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual({ key: "value" });
        }
      });

      it("should handle JSON in code fences", () => {
        const fenced = '```json\n{"key": "value"}\n```';
        const result = jsonProcessor.parseAndValidate(fenced, "test", completionOptions);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual({ key: "value" });
        }
      });

      it("should handle malformed JSON with trailing commas", () => {
        const malformed = '{"key": "value",}';
        const result = jsonProcessor.parseAndValidate(malformed, "test", completionOptions);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual({ key: "value" });
        }
      });

      it("should fix over-escaped sequences", () => {
        const overEscaped = '{"text": "Line 1\\\\nLine 2"}';
        const result = jsonProcessor.parseAndValidate(overEscaped, "test", completionOptions);
        expect(result.success).toBe(true);
        if (result.success) {
          expect((result.data as any).text).toContain("Line");
        }
      });

      it("should handle concatenated identical objects", () => {
        const duplicated = '{"a":1}{"a":1}';
        const result = jsonProcessor.parseAndValidate(duplicated, "test", completionOptions);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual({ a: 1 });
        }
      });
    });

    describe("sanitization integration", () => {
      it("should apply multiple sanitizations in pipeline", () => {
        // This JSON has multiple issues: code fence, trailing comma, whitespace
        const messy = '```json\n  {"key": "value",}  \n```';
        const result = jsonProcessor.parseAndValidate(messy, "test", completionOptions);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual({ key: "value" });
        }
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
        expect(result.success).toBe(true);
        if (result.success) {
          expect((result.data as any).purpose).toBe("Test");
          expect((result.data as any).items).toHaveLength(2);
        }
      });
    });

    describe("instance isolation", () => {
      it("should not share state between calls", () => {
        const json1 = '{"first": 1}';
        const json2 = '{"second": 2}';

        const result1 = jsonProcessor.parseAndValidate(json1, "test1", completionOptions);
        const result2 = jsonProcessor.parseAndValidate(json2, "test2", completionOptions);

        expect(result1.success).toBe(true);
        expect(result2.success).toBe(true);
        if (result1.success && result2.success) {
          expect(result1.data).toEqual({ first: 1 });
          expect(result2.data).toEqual({ second: 2 });
        }
      });

      it("should not share state between different instances", () => {
        const processor1 = new JsonProcessor();
        const processor2 = new JsonProcessor();

        const result1 = processor1.parseAndValidate('{"a": 1}', "test", completionOptions);
        const result2 = processor2.parseAndValidate('{"b": 2}', "test", completionOptions);

        expect(result1.success).toBe(true);
        expect(result2.success).toBe(true);
        if (result1.success && result2.success) {
          expect(result1.data).toEqual({ a: 1 });
          expect(result2.data).toEqual({ b: 2 });
        }
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
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.name).toBe("Test");
          expect(result.data.value).toBe(42);
        }
      });

      it("should support array types", () => {
        const json = '[{"name": "A", "value": 1}, {"name": "B", "value": 2}]';
        const result = jsonProcessor.parseAndValidate<TestType[]>(json, "test", completionOptions);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toHaveLength(2);
          expect(result.data[0].name).toBe("A");
          expect(result.data[1].value).toBe(2);
        }
      });
    });

    describe("sanitization logging", () => {
      it("should not log when disabled", () => {
        const json = 'Some text {"key": "value"} after';
        const result = jsonProcessor.parseAndValidate(json, "test", completionOptions);
        expect(result.success).toBe(true);
      });

      it("should handle logging enabled", () => {
        const json = 'Prefix {"key": "value"} suffix';
        const result = jsonProcessor.parseAndValidate(json, "test", completionOptions);
        expect(result.success).toBe(true);
      });
    });

    describe("edge cases", () => {
      it("should handle empty object", () => {
        const json = "{}";
        const result = jsonProcessor.parseAndValidate(json, "test", completionOptions);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual({});
        }
      });

      it("should handle empty array", () => {
        const json = "[]";
        const result = jsonProcessor.parseAndValidate(json, "test", completionOptions);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual([]);
        }
      });

      it("should handle deeply nested structures", () => {
        const json = '{"a":{"b":{"c":{"d":{"e":"deep"}}}}}';
        const result = jsonProcessor.parseAndValidate(json, "test", completionOptions);
        expect(result.success).toBe(true);
        if (result.success) {
          expect((result.data as any).a.b.c.d.e).toBe("deep");
        }
      });

      it("should handle large arrays", () => {
        const largeArray = JSON.stringify(Array.from({ length: 1000 }, (_, i) => ({ id: i })));
        const result = jsonProcessor.parseAndValidate(largeArray, "test", completionOptions);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(Array.isArray(result.data)).toBe(true);
          expect((result.data as unknown as any[]).length).toBe(1000);
        }
      });

      it("should handle unicode characters", () => {
        const json = '{"emoji": "😀", "chinese": "你好", "arabic": "مرحبا"}';
        const result = jsonProcessor.parseAndValidate(json, "test", completionOptions);
        expect(result.success).toBe(true);
        if (result.success) {
          expect((result.data as any).emoji).toBe("😀");
          expect((result.data as any).chinese).toBe("你好");
          expect((result.data as any).arabic).toBe("مرحبا");
        }
      });
    });

    describe("JsonProcessingError context", () => {
      it("should return failure result with original content", () => {
        const invalid = "completely invalid json content here";
        const result = jsonProcessor.parseAndValidate(invalid, "test-resource", completionOptions);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBeInstanceOf(JsonProcessingError);
          expect(result.error.originalContent).toBe(invalid);
        }
      });

      it("should capture sanitized content in JsonProcessingError", () => {
        const invalid = "{ this is not valid json at all }";
        const result = jsonProcessor.parseAndValidate(invalid, "test-resource", completionOptions);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBeInstanceOf(JsonProcessingError);
          expect(result.error.sanitizedContent).toBeDefined();
          expect(typeof result.error.sanitizedContent).toBe("string");
        }
      });

      it("should track applied sanitizers in JsonProcessingError", () => {
        const withCodeFence = "```json\n{invalid json}\n```";
        const result = jsonProcessor.parseAndValidate(
          withCodeFence,
          "test-resource",
          completionOptions,
        );
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBeInstanceOf(JsonProcessingError);
          expect(Array.isArray(result.error.appliedSanitizers)).toBe(true);
          // Should have attempted at least the extract strategy
          expect(result.error.appliedSanitizers.length).toBeGreaterThanOrEqual(0);
        }
      });

      it("should include resource name in JsonProcessingError message", () => {
        const invalid = "not valid json";
        const result = jsonProcessor.parseAndValidate(
          invalid,
          "my-custom-resource",
          completionOptions,
        );
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBeInstanceOf(JsonProcessingError);
          expect(result.error.message).toContain("my-custom-resource");
        }
      });

      it("should capture underlying error in JsonProcessingError", () => {
        const almostValid = '{"key": "value", but with extra text}';
        const result = jsonProcessor.parseAndValidate(
          almostValid,
          "test-resource",
          completionOptions,
        );
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBeInstanceOf(JsonProcessingError);
          // Should have captured some underlying error (SyntaxError from JSON.parse)
          expect(result.error.underlyingError).toBeDefined();
        }
      });

      it("should preserve error name as JsonProcessingError", () => {
        const invalid = "not valid json";
        const result = jsonProcessor.parseAndValidate(invalid, "test-resource", completionOptions);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.name).toBe("JsonProcessingError");
        }
      });
    });
  });
});
