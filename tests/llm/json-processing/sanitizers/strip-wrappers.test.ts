import { stripWrappers } from "../../../../src/llm/json-processing/sanitizers";

describe("stripWrappers", () => {
  describe("code fence removal", () => {
    it("should remove generic code fences", () => {
      const input = '```\n{ "key": "value" }\n```';
      const result = stripWrappers(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('{ "key": "value" }');
      expect(result.diagnostics).toBeDefined();
      expect(result.diagnostics?.some((d) => d.includes("code fences"))).toBe(true);
    });

    it("should remove json code fences", () => {
      const input = '```json\n{ "key": "value" }\n```';
      const result = stripWrappers(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('{ "key": "value" }');
    });

    it("should remove javascript code fences", () => {
      const input = '```javascript\n{ "key": "value" }\n```';
      const result = stripWrappers(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('{ "key": "value" }');
    });

    it("should remove typescript code fences", () => {
      const input = '```ts\n{ "key": "value" }\n```';
      const result = stripWrappers(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('{ "key": "value" }');
    });
  });

  describe("whitespace trimming", () => {
    it("should remove leading whitespace", () => {
      const input = '   { "key": "value" }';
      const result = stripWrappers(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{ "key": "value" }');
      expect(result.diagnostics).toBeDefined();
      expect(result.diagnostics?.some((d) => d.includes("Trimmed whitespace"))).toBe(true);
    });

    it("should remove trailing whitespace", () => {
      const input = '{ "key": "value" }   ';
      const result = stripWrappers(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{ "key": "value" }');
    });

    it("should remove both leading and trailing whitespace", () => {
      const input = '  \n\t{ "key": "value" }\n  ';
      const result = stripWrappers(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{ "key": "value" }');
    });
  });

  describe("JSON span extraction", () => {
    it("should extract JSON object from surrounding text", () => {
      const input = 'Here is your JSON: {"name": "John", "age": 30}';
      const result = stripWrappers(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"name": "John", "age": 30}');
      expect(result.diagnostics).toBeDefined();
      // With consolidated sanitizer, introductory text removal happens before extraction,
      // so extraction may not occur. Check for either extraction or introductory text removal.
      expect(
        result.diagnostics?.some(
          (d) =>
            d.includes("Extracted largest JSON span") ||
            d.includes("introductory text") ||
            d.includes("Removed introductory"),
        ),
      ).toBe(true);
    });

    it("should extract JSON array from surrounding text", () => {
      const input = "The data: [1, 2, 3] is ready";
      const result = stripWrappers(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe("[1, 2, 3]");
    });

    it("should extract from text with newlines", () => {
      const input = 'I\'ve generated:\n\n{"result": true}\n\nLet me know if...';
      const result = stripWrappers(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"result": true}');
    });

    it("should handle deeply nested objects", () => {
      const input = 'Text {"outer": {"middle": {"inner": {"deep": "value"}}}} more text';
      const result = stripWrappers(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"outer": {"middle": {"inner": {"deep": "value"}}}}');
    });
  });

  describe("duplicate object collapse", () => {
    it("should collapse duplicate JSON objects", () => {
      const input = '{"key": "value"}\n{"key": "value"}';
      const result = stripWrappers(input);

      expect(result.changed).toBe(true);
      expect(result.diagnostics).toBeDefined();
      expect(result.diagnostics?.some((d) => d.includes("Collapsed duplicated"))).toBe(true);
    });
  });

  describe("prefix removal", () => {
    it("should remove thought markers", () => {
      const input = 'thought:\n{"key": "value"}';
      const result = stripWrappers(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('{"key": "value"}');
      expect(result.diagnostics).toBeDefined();
      expect(result.diagnostics?.some((d) => d.includes("thought"))).toBe(true);
    });

    it("should remove introductory text before opening braces", () => {
      const input = 'Here is the JSON: {"key": "value"}';
      const result = stripWrappers(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('{"key": "value"}');
      expect(result.diagnostics).toBeDefined();
      expect(result.diagnostics?.some((d) => d.includes("introductory text"))).toBe(true);
    });
  });

  describe("combined operations", () => {
    it("should handle code fences, whitespace, and extraction together", () => {
      const input = '```json\n  Here is your JSON: {"key": "value"}  \n```';
      const result = stripWrappers(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"key": "value"}');
    });

    it("should handle all wrapper types in sequence", () => {
      const input = '```json\n  thought:\n  Here is the JSON: {"key": "value"}  \n```';
      const result = stripWrappers(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"key": "value"}');
    });
  });

  describe("should not modify content", () => {
    it("should return unchanged for clean JSON", () => {
      const input = '{"key": "value"}';
      const result = stripWrappers(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should return unchanged for empty string", () => {
      const input = "";
      const result = stripWrappers(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe("");
    });
  });

  describe("trailing text removal", () => {
    it("should remove trailing explanatory text after JSON closing brace", () => {
      const input = `{
  "name": "TestClass",
  "kind": "CLASS"
}
there are too many methods to list in this response.`;

      const result = stripWrappers(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"kind": "CLASS"');
      expect(result.content).toContain("}");
      expect(result.content).not.toContain("there are too many methods");
      expect(result.diagnostics).toBeDefined();
      expect(result.diagnostics?.some((d) => d.includes("trailing text"))).toBe(true);
    });

    it("should not remove valid JSON content after closing brace", () => {
      const input = `{"key": "value"}`;

      const result = stripWrappers(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should handle trailing text with newlines", () => {
      const input = `{
  "name": "Test"
}
there are m`;

      const result = stripWrappers(input);

      expect(result.changed).toBe(true);
      expect(result.content.trim()).toMatch(/^\{[\s\S]*"name": "Test"[\s\S]*\}$/);
      expect(result.content).not.toContain("there are m");
    });
  });
});
