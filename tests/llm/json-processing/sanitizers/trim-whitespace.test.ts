import { trimWhitespace } from "../../../../src/llm/json-processing/sanitizers/trim-whitespace";

describe("trimWhitespace", () => {
  describe("should remove whitespace", () => {
    it("should remove leading whitespace", () => {
      const input = '   { "key": "value" }';
      const result = trimWhitespace(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{ "key": "value" }');
      expect(result.description).toBe("Trimmed whitespace");
    });

    it("should remove trailing whitespace", () => {
      const input = '{ "key": "value" }   ';
      const result = trimWhitespace(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{ "key": "value" }');
      expect(result.description).toBe("Trimmed whitespace");
    });

    it("should remove both leading and trailing whitespace", () => {
      const input = '  \n\t{ "key": "value" }\n  ';
      const result = trimWhitespace(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{ "key": "value" }');
      expect(result.description).toBe("Trimmed whitespace");
    });

    it("should remove multiple types of whitespace", () => {
      const input = ' \t\n\r{ "key": "value" }\r\n\t ';
      const result = trimWhitespace(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{ "key": "value" }');
    });

    it("should handle only whitespace input", () => {
      const input = "   \n\t  ";
      const result = trimWhitespace(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe("");
    });
  });

  describe("should not modify content", () => {
    it("should return unchanged when no leading/trailing whitespace", () => {
      const input = '{ "key": "value" }';
      const result = trimWhitespace(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
      expect(result.description).toBeUndefined();
    });

    it("should return unchanged for empty string", () => {
      const input = "";
      const result = trimWhitespace(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe("");
    });

    it("should not modify internal whitespace", () => {
      const input = '{ "key":   "value with   spaces" }';
      const result = trimWhitespace(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });
  });

  describe("edge cases", () => {
    it("should handle JSON with complex nested structures", () => {
      const input = '\n  { "nested": { "deep": [1, 2, 3] } }  \n';
      const result = trimWhitespace(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{ "nested": { "deep": [1, 2, 3] } }');
    });

    it("should handle arrays", () => {
      const input = "  [1, 2, 3]  ";
      const result = trimWhitespace(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe("[1, 2, 3]");
    });

    it("should handle single character", () => {
      const input = " x ";
      const result = trimWhitespace(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe("x");
    });
  });
});

