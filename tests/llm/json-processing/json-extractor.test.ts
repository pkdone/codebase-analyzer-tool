import { extractAndParseJson } from "../../../src/llm/json-processing/utils/json-extractor";

describe("json-extractor", () => {
  describe("extractAndParseJson", () => {
    it("should parse valid JSON object", () => {
      const input = '{"name": "John", "age": 30}';
      const result = extractAndParseJson(input);
      expect(result).toEqual({ name: "John", age: 30 });
    });

    it("should parse valid JSON array", () => {
      const input = "[1, 2, 3, 4, 5]";
      const result = extractAndParseJson(input);
      expect(result).toEqual([1, 2, 3, 4, 5]);
    });

    it("should extract and parse JSON from markdown code fence", () => {
      const input = '```json\n{"name": "Jane", "role": "Developer"}\n```';
      const result = extractAndParseJson(input);
      expect(result).toEqual({ name: "Jane", role: "Developer" });
    });

    it("should extract and parse JSON from code fence without language", () => {
      const input = '```\n{"status": "success"}\n```';
      const result = extractAndParseJson(input);
      expect(result).toEqual({ status: "success" });
    });

    it("should extract JSON object surrounded by text", () => {
      const input = 'Here is the data: {"value": 42} and that is all.';
      const result = extractAndParseJson(input);
      expect(result).toEqual({ value: 42 });
    });

    it("should handle nested JSON objects", () => {
      const input = '{"outer": {"inner": {"deep": "value"}}}';
      const result = extractAndParseJson(input);
      expect(result).toEqual({ outer: { inner: { deep: "value" } } });
    });

    it("should handle nested JSON arrays", () => {
      const input = "[[1, 2], [3, 4], [5, 6]]";
      const result = extractAndParseJson(input);
      expect(result).toEqual([
        [1, 2],
        [3, 4],
        [5, 6],
      ]);
    });

    it("should handle mixed nested structures", () => {
      const input = '{"items": [{"id": 1}, {"id": 2}], "count": 2}';
      const result = extractAndParseJson(input);
      expect(result).toEqual({ items: [{ id: 1 }, { id: 2 }], count: 2 });
    });

    it("should handle JSON with string containing braces", () => {
      const input = '{"message": "Hello {world}", "data": {"key": "value"}}';
      const result = extractAndParseJson(input);
      expect(result).toEqual({ message: "Hello {world}", data: { key: "value" } });
    });

    it("should handle JSON with escaped quotes", () => {
      const input = '{"quote": "He said \\"Hello\\"", "value": 1}';
      const result = extractAndParseJson(input);
      expect(result).toEqual({ quote: 'He said "Hello"', value: 1 });
    });

    it("should handle JSON with escaped backslashes", () => {
      const input = '{"path": "C:\\\\Users\\\\test", "name": "file"}';
      const result = extractAndParseJson(input);
      expect(result).toEqual({ path: "C:\\Users\\test", name: "file" });
    });

    it("should throw error when no JSON content is found", () => {
      const input = "This is plain text with no JSON at all";
      expect(() => extractAndParseJson(input)).toThrow("No JSON content found");
    });

    it("should throw JsonParseFailed for malformed JSON", () => {
      const input = '{"invalid": json content}';
      expect(() => extractAndParseJson(input)).toThrow("JsonParseFailed");
    });

    it("should extract truncated JSON (missing closing brace)", () => {
      const input = '{"name": "John", "age": 30';
      // Should not throw "No JSON content found" - it extracts the truncated portion
      expect(() => extractAndParseJson(input)).toThrow("JsonParseFailed");
    });

    it("should handle empty object", () => {
      const input = "{}";
      const result = extractAndParseJson(input);
      expect(result).toEqual({});
    });

    it("should handle empty array", () => {
      const input = "[]";
      const result = extractAndParseJson(input);
      expect(result).toEqual([]);
    });

    it("should extract first complete JSON object when multiple are present", () => {
      const input = '{"first": 1} {"second": 2}';
      const result = extractAndParseJson(input);
      expect(result).toEqual({ first: 1 });
    });

    it("should handle JSON with whitespace", () => {
      const input = `
        {
          "name": "Test",
          "value": 123
        }
      `;
      const result = extractAndParseJson(input);
      expect(result).toEqual({ name: "Test", value: 123 });
    });

    it("should handle complex nested structure with arrays and objects", () => {
      const input = `{
        "users": [
          {"id": 1, "tags": ["admin", "user"]},
          {"id": 2, "tags": ["user"]}
        ],
        "metadata": {
          "count": 2,
          "filters": {"active": true}
        }
      }`;
      const result = extractAndParseJson(input);
      expect(result).toEqual({
        users: [
          { id: 1, tags: ["admin", "user"] },
          { id: 2, tags: ["user"] },
        ],
        metadata: {
          count: 2,
          filters: { active: true },
        },
      });
    });
  });
});
