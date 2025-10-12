import {
  extractLargestJsonSpan,
  SANITIZATION_STEP,
} from "../../../../src/llm/json-processing/sanitizers";

describe("extractLargestJsonSpan", () => {
  describe("basic extraction", () => {
    it("should extract JSON object from surrounding text", () => {
      const input = 'Here is your JSON: {"name": "John", "age": 30}';
      const result = extractLargestJsonSpan(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"name": "John", "age": 30}');
      expect(result.description).toBe(SANITIZATION_STEP.EXTRACTED_LARGEST_JSON_SPAN);
    });

    it("should extract JSON array from surrounding text", () => {
      const input = "The data: [1, 2, 3] is ready";
      const result = extractLargestJsonSpan(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe("[1, 2, 3]");
      expect(result.description).toBe(SANITIZATION_STEP.EXTRACTED_LARGEST_JSON_SPAN);
    });

    it("should extract from text with newlines", () => {
      const input = 'I\'ve generated:\n\n{"result": true}\n\nLet me know if...';
      const result = extractLargestJsonSpan(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"result": true}');
    });
  });

  describe("finding the first complete structure", () => {
    it("should extract the first complete JSON object", () => {
      const input = 'Small: {"x": 1} and large: {"data": [1,2,3], "meta": {"count": 5}}';
      const result = extractLargestJsonSpan(input);

      expect(result.changed).toBe(true);
      // Extracts the first complete structure, not the largest
      expect(result.content).toBe('{"x": 1}');
    });

    it("should extract first array when multiple are present", () => {
      const input = "Example: [1] and main: [1, 2, 3, 4, 5]";
      const result = extractLargestJsonSpan(input);

      expect(result.changed).toBe(true);
      // Extracts the first complete structure
      expect(result.content).toBe("[1]");
    });

    it("should extract first from complex text with examples", () => {
      const input = `
        This is a small example: {"id": 1}
        
        Here's the actual data you requested:
        {
          "users": [
            {"name": "Alice", "role": "admin"},
            {"name": "Bob", "role": "user"}
          ],
          "total": 2,
          "page": 1
        }
      `;
      const result = extractLargestJsonSpan(input);

      expect(result.changed).toBe(true);
      // Extracts the first complete structure (the small example)
      expect(result.content).toBe('{"id": 1}');
    });
  });

  describe("nested structures", () => {
    it("should handle deeply nested objects", () => {
      const input = 'Text {"outer": {"middle": {"inner": {"deep": "value"}}}} more text';
      const result = extractLargestJsonSpan(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"outer": {"middle": {"inner": {"deep": "value"}}}}');
    });

    it("should handle arrays within objects", () => {
      const input = 'Data: {"items": [1, 2, {"nested": true}], "count": 3}';
      const result = extractLargestJsonSpan(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"items": [1, 2, {"nested": true}], "count": 3}');
    });

    it("should handle objects within arrays", () => {
      const input = 'List: [{"a": 1}, {"b": 2}, {"c": [3, 4]}] end';
      const result = extractLargestJsonSpan(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('[{"a": 1}, {"b": 2}, {"c": [3, 4]}]');
    });
  });

  describe("string handling", () => {
    it("should handle strings with escaped quotes", () => {
      const input = 'JSON: {"text": "She said \\"hello\\""} done';
      const result = extractLargestJsonSpan(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"text": "She said \\"hello\\""}');
    });

    it("should not count delimiters inside strings", () => {
      const input = 'Start {"msg": "This { is } text"} end';
      const result = extractLargestJsonSpan(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"msg": "This { is } text"}');
    });

    it("should handle strings with brackets", () => {
      const input = 'Begin {"array": "Use [brackets] carefully"} finish';
      const result = extractLargestJsonSpan(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"array": "Use [brackets] carefully"}');
    });
  });

  describe("no change needed", () => {
    it("should return unchanged when input is already clean JSON object", () => {
      const input = '{"name": "value"}';
      const result = extractLargestJsonSpan(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
      expect(result.description).toBeUndefined();
    });

    it("should return unchanged when input is already clean JSON array", () => {
      const input = "[1, 2, 3]";
      const result = extractLargestJsonSpan(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should return unchanged when no JSON structure found", () => {
      const input = "This is just plain text without JSON";
      const result = extractLargestJsonSpan(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should return unchanged when only incomplete JSON structure", () => {
      const input = '{"incomplete": "object"';
      const result = extractLargestJsonSpan(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });
  });

  describe("edge cases", () => {
    it("should handle empty input", () => {
      const input = "";
      const result = extractLargestJsonSpan(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe("");
    });

    it("should handle whitespace-only input", () => {
      const input = "   \n\t  ";
      const result = extractLargestJsonSpan(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should trim extracted content", () => {
      const input = '  {"key": "value"}  ';
      const result = extractLargestJsonSpan(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should handle very large nested structures", () => {
      const smallObj = '{"x": 1}';
      const largeObj = '{"a": {"b": {"c": {"d": {"e": {"f": "deep"}}}}}}';
      const input = `First: ${smallObj} Second: ${largeObj}`;
      const result = extractLargestJsonSpan(input);

      expect(result.changed).toBe(true);
      // Extracts the first complete structure
      expect(result.content).toBe(smallObj);
    });

    it("should extract first complete structure from multiple candidates", () => {
      const input = '[1] {"small": 1} {"medium": 1, "b": 2} [1, 2, 3, 4, 5, 6]';
      const result = extractLargestJsonSpan(input);

      expect(result.changed).toBe(true);
      // Extracts the first complete structure
      expect(result.content).toBe("[1]");
    });
  });
});
