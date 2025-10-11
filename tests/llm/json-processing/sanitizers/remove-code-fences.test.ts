import { removeCodeFences } from "../../../../src/llm/json-processing/sanitizers/remove-code-fences";

describe("removeCodeFences", () => {
  describe("should remove fences", () => {
    it("should remove generic code fences", () => {
      const input = '```\n{ "key": "value" }\n```';
      const result = removeCodeFences(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('\n{ "key": "value" }\n');
      expect(result.description).toBe("Removed code fences");
    });

    it("should remove json code fences", () => {
      const input = '```json\n{ "key": "value" }\n```';
      const result = removeCodeFences(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{ "key": "value" }\n');
    });

    it("should remove javascript code fences", () => {
      const input = '```javascript\n{ "key": "value" }\n```';
      const result = removeCodeFences(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{ "key": "value" }\n');
    });

    it("should remove typescript code fences", () => {
      const input = '```ts\n{ "key": "value" }\n```';
      const result = removeCodeFences(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{ "key": "value" }\n');
    });

    it("should remove multiple fence types in order", () => {
      const input = '```json { "a": 1 }```';
      const result = removeCodeFences(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{ "a": 1 }');
    });

    it("should handle fences with extra whitespace", () => {
      const input = '```json  \n{ "key": "value" }\n```';
      const result = removeCodeFences(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('{ "key": "value" }');
    });

    it("should remove all occurrences", () => {
      const input = '```json\n{"a": 1}\n```\nMore text\n```\n{"b": 2}\n```';
      const result = removeCodeFences(input);

      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("```");
    });
  });

  describe("should not modify content", () => {
    it("should return unchanged when no fences present", () => {
      const input = '{ "key": "value" }';
      const result = removeCodeFences(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
      expect(result.description).toBeUndefined();
    });

    it("should return unchanged for empty string", () => {
      const input = "";
      const result = removeCodeFences(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe("");
    });

    it("should return unchanged for content without backticks", () => {
      const input = 'Just some text { "no": "fences" }';
      const result = removeCodeFences(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });
  });

  describe("edge cases", () => {
    it("should handle single backticks that don't form fences", () => {
      const input = '{ "key": "value with ` backtick" }';
      const result = removeCodeFences(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should handle double backticks", () => {
      const input = '`` { "key": "value" } ``';
      const result = removeCodeFences(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should handle nested structures within fences", () => {
      const input = '```json\n{ "nested": { "deep": [1, 2, 3] } }\n```';
      const result = removeCodeFences(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{ "nested": { "deep": [1, 2, 3] } }\n');
    });

    it("should handle case insensitivity for json/javascript", () => {
      const input = '```JSON\n{ "key": "value" }\n```';
      const result = removeCodeFences(input);

      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("JSON");
    });

    it("should remove only the fence markers, not the content", () => {
      const input = '```\n{"message": "Data enclosed in fences"}\n```';
      const result = removeCodeFences(input);

      expect(result.content).toContain("Data enclosed in fences");
      expect(result.content).not.toContain("```");
    });
  });
});

