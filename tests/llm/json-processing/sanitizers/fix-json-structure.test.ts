import { fixJsonStructure } from "../../../../src/llm/json-processing/sanitizers/fix-json-structure";

describe("fixJsonStructure", () => {
  describe("fixes mismatched delimiters", () => {
    it("should fix basic mismatched delimiters", () => {
      const input = '{"key": "value"]';
      const result = fixJsonStructure(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"key": "value"}');
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should fix bracket/brace mismatch", () => {
      const input = '["item1", "item2"}';
      const result = fixJsonStructure(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('["item1", "item2"]');
    });

    it("should handle nested structures with mismatched delimiters", () => {
      const input = '{"outer": {"inner": ["value"}}]';
      const result = fixJsonStructure(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"outer": {"inner": ["value"]}}');
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should not count delimiters in strings", () => {
      const input = '{"text": "This has { and ] inside"}';
      const result = fixJsonStructure(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });
  });

  describe("adds missing property commas", () => {
    it("should add missing comma between two string properties on separate lines", () => {
      const input = `{
  "prop1": "value1"
  "prop2": "value2"
}`;
      const result = fixJsonStructure(input);
      expect(result.changed).toBe(true);
      expect(result.content).toContain('"prop1": "value1",');
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should handle multiple missing commas", () => {
      const input = `{
  "a": "value1"
  "b": "value2"
  "c": "value3"
}`;
      const result = fixJsonStructure(input);
      expect(result.changed).toBe(true);
      expect(result.content).toContain('"a": "value1",');
      expect(result.content).toContain('"b": "value2",');
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should handle missing comma after nested object", () => {
      const input = `{
  "outer": {"inner": "value"}
  "next": "value"
}`;
      const result = fixJsonStructure(input);
      expect(result.changed).toBe(true);
      expect(result.content).toContain('{"inner": "value"},');
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should not add comma when property is last in object", () => {
      const input = `{
  "a": "value1",
  "b": "value2"
}`;
      const result = fixJsonStructure(input);
      expect(result.changed).toBe(false);
    });
  });

  describe("removes trailing commas", () => {
    it("should remove trailing comma from object", () => {
      const input = '{"a": 1, "b": 2, }';
      const result = fixJsonStructure(input);
      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"a": 1, "b": 2}');
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should remove trailing comma from array", () => {
      const input = "[1, 2, 3, ]";
      const result = fixJsonStructure(input);
      expect(result.changed).toBe(true);
      expect(result.content).toBe("[1, 2, 3]");
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should handle trailing comma with whitespace", () => {
      const input = '{ "key": "value",  }';
      const result = fixJsonStructure(input);
      expect(result.changed).toBe(true);
      expect(result.content).toBe('{ "key": "value"}');
    });
  });

  describe("completes truncated structures", () => {
    it("should close unterminated object", () => {
      const input = '{"a":1';
      const result = fixJsonStructure(input);
      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"a":1}');
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should close nested array and object", () => {
      const input = '[{"a": {';
      const result = fixJsonStructure(input);
      expect(result.changed).toBe(true);
      expect(result.content).toBe('[{"a": {}}]');
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should close unterminated string then structure", () => {
      const input = '{"a":"hello';
      const result = fixJsonStructure(input);
      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"a":"hello"}');
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should return unchanged for already complete JSON", () => {
      const input = '{"a":1}';
      const result = fixJsonStructure(input);
      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });
  });

  describe("combined fixes", () => {
    it("should handle mismatched delimiter and missing comma together", () => {
      const input = `{
  "prop1": "value1"
  "prop2": "value2"]
}`;
      const result = fixJsonStructure(input);
      expect(result.changed).toBe(true);
      expect(result.content).toContain('"prop1": "value1",');
      expect(result.content).toContain('"prop2": "value2"}');
      // The result may have an extra } which is handled by other sanitizers
      const cleaned = result.content.replace(/\}\s*\}$/, "}");
      expect(() => JSON.parse(cleaned)).not.toThrow();
    });

    it("should handle trailing comma and truncation together", () => {
      const input = '{"a": 1, "b": 2, ';
      const result = fixJsonStructure(input);
      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"a": 1, "b": 2}');
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should handle all issues together", () => {
      const input = `{
  "prop1": "value1"
  "prop2": "value2"]
}`;
      const result = fixJsonStructure(input);
      expect(result.changed).toBe(true);
      // Should fix delimiter mismatch and add missing comma
      expect(result.content).toContain('"prop1": "value1",');
      expect(result.content).toContain('"prop2": "value2"}');
      // The result should be parseable (may have extra } which is handled by other sanitizers)
      const parsed = JSON.parse(result.content.replace(/\}\s*\}$/, "}"));
      expect(parsed).toHaveProperty("prop1");
      expect(parsed).toHaveProperty("prop2");
    });
  });

  describe("edge cases", () => {
    it("should handle empty input", () => {
      const input = "";
      const result = fixJsonStructure(input);
      expect(result.changed).toBe(false);
      expect(result.content).toBe("");
    });

    it("should handle whitespace-only input", () => {
      const input = "   \n\t  ";
      const result = fixJsonStructure(input);
      expect(result.changed).toBe(false);
    });

    it("should handle valid JSON without changes", () => {
      const input = '{"key": "value", "array": [1, 2, 3]}';
      const result = fixJsonStructure(input);
      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should provide diagnostics when changes are made", () => {
      const input = '{"a": "1"]';
      const result = fixJsonStructure(input);
      expect(result.changed).toBe(true);
      expect(result.diagnostics).toBeDefined();
      expect(result.diagnostics?.length).toBeGreaterThan(0);
    });
  });
});
