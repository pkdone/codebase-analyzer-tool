import { fixStructuralErrors } from "../../../../src/llm/json-processing/sanitizers/fix-structural-errors";

describe("fixStructuralErrors", () => {
  describe("missing commas", () => {
    it("should add missing comma between two string properties on separate lines", () => {
      const input = `{
  "prop1": "value1"
  "prop2": "value2"
}`;
      const result = fixStructuralErrors(input);
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
      const result = fixStructuralErrors(input);
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
      const result = fixStructuralErrors(input);
      expect(result.changed).toBe(true);
      expect(result.content).toContain('{"inner": "value"},');
      expect(() => JSON.parse(result.content)).not.toThrow();
    });
  });

  describe("trailing commas", () => {
    it("should remove trailing comma from object", () => {
      const input = '{"a": 1, "b": 2, }';
      const result = fixStructuralErrors(input);
      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"a": 1, "b": 2}');
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should remove trailing comma from array", () => {
      const input = "[1, 2, 3, ]";
      const result = fixStructuralErrors(input);
      expect(result.changed).toBe(true);
      expect(result.content).toBe("[1, 2, 3]");
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should handle multiple trailing commas in nested structures", () => {
      const input = '{"outer": {"inner": "value", }, }';
      const result = fixStructuralErrors(input);
      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"outer": {"inner": "value"}}');
      expect(() => JSON.parse(result.content)).not.toThrow();
    });
  });

  describe("mismatched delimiters", () => {
    it("should fix basic mismatched delimiters", () => {
      const input = '{"key": "value"]';
      const result = fixStructuralErrors(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"key": "value"}');
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should fix bracket/brace mismatch", () => {
      const input = '["item1", "item2"}';
      const result = fixStructuralErrors(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('["item1", "item2"]');
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should handle nested structures with mismatched delimiters", () => {
      const input = '{"outer": {"inner": ["value"}}]';
      const result = fixStructuralErrors(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"outer": {"inner": ["value"]}}');
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should not count delimiters in strings", () => {
      const input = '{"text": "This has { and ] inside"}';
      const result = fixStructuralErrors(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });
  });

  describe("truncated structures", () => {
    it("should close unterminated object", () => {
      const input = '{"a":1';
      const result = fixStructuralErrors(input);
      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"a":1}');
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should close unterminated array", () => {
      const input = "[1, 2, 3";
      const result = fixStructuralErrors(input);
      expect(result.changed).toBe(true);
      expect(result.content).toBe("[1, 2, 3]");
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should close nested array and object", () => {
      const input = '[{"a": {';
      const result = fixStructuralErrors(input);
      expect(result.changed).toBe(true);
      expect(result.content).toBe('[{"a": {}}]');
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should close unterminated string then structure", () => {
      const input = '{"a":"hello';
      const result = fixStructuralErrors(input);
      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"a":"hello"}');
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should handle complex nested structure", () => {
      const input = '{"outer": {"inner": [1, 2';
      const result = fixStructuralErrors(input);
      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"outer": {"inner": [1, 2]}}');
      expect(() => JSON.parse(result.content)).not.toThrow();
    });
  });

  describe("missing array object braces", () => {
    it("should fix stray text before property value in array", () => {
      const input = `  "publicMethods": [
    {
      "name": "method1",
      "codeSmells": []
    },
c"withdrawal",
      "purpose": "test"
    }
  ]`;
      const result = fixStructuralErrors(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"name": "withdrawal"');
      expect(result.content).toContain("{");
      expect(result.diagnostics).toBeDefined();
    });

    it("should fix truncated element with quotes", () => {
      const input = `  "publicMethods": [
    {
      "name": "method1",
      "codeSmells": []
    },
calculateInterest",
      "purpose": "test"
    }
  ]`;
      const result = fixStructuralErrors(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"name": "calculateInterest"');
    });
  });

  describe("combined fixes", () => {
    it("should handle missing comma and trailing comma together", () => {
      const input = `{
  "a": "value1"
  "b": "value2",
}`;
      const result = fixStructuralErrors(input);
      expect(result.changed).toBe(true);
      expect(result.content).toContain('"a": "value1",');
      expect(result.content).not.toContain('"b": "value2",');
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should handle mismatched delimiter and truncation together", () => {
      const input = '{"key": "value"';
      const result = fixStructuralErrors(input);
      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"key": "value"}');
      expect(() => JSON.parse(result.content)).not.toThrow();
    });
  });

  describe("should not modify content", () => {
    it("should return unchanged for valid JSON", () => {
      const input = '{"key": "value"}';
      const result = fixStructuralErrors(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should handle empty input", () => {
      const result = fixStructuralErrors("");
      expect(result.changed).toBe(false);
    });

    it("should handle whitespace-only input", () => {
      const result = fixStructuralErrors("   ");
      expect(result.changed).toBe(false);
    });
  });
});
