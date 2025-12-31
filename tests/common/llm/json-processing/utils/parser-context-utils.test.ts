import {
  isInStringAt,
  isInArrayContext,
  replaceInContext,
} from "../../../../../src/common/llm/json-processing/utils/parser-context-utils";

describe("parser-context-utils", () => {
  describe("isInStringAt", () => {
    it("should return false for position before any string", () => {
      const content = '{"key": "value"}';
      expect(isInStringAt(0, content)).toBe(false);
      expect(isInStringAt(1, content)).toBe(false);
    });

    it("should return true when inside a string", () => {
      const content = '{"key": "value"}';
      // Position 9 is inside "value" (after the opening quote at position 8)
      expect(isInStringAt(9, content)).toBe(true);
    });

    it("should return false when outside a string", () => {
      const content = '{"key": "value"}';
      // Position 15 is after the closing quote
      expect(isInStringAt(15, content)).toBe(false);
    });

    it("should handle escaped quotes correctly", () => {
      const content = '{"key": "value with \\"quote\\""}';
      // Position inside the escaped quote should still be in string
      const quotePos = content.indexOf('\\"');
      expect(isInStringAt(quotePos + 1, content)).toBe(true);
    });

    it("should handle multiple strings", () => {
      const content = '{"key1": "value1", "key2": "value2"}';
      expect(isInStringAt(11, content)).toBe(true); // Inside "value1"
      expect(isInStringAt(31, content)).toBe(true); // Inside "value2"
      expect(isInStringAt(17, content)).toBe(false); // Between strings (at the comma after value1)
    });
  });

  describe("isInArrayContext", () => {
    it("should return true when inside an array", () => {
      const content = '[{"key": "value"}]';
      // Position after the opening brace should be in array context
      expect(isInArrayContext(2, content)).toBe(true);
    });

    it("should return false when outside an array", () => {
      const content = '{"key": "value"}';
      expect(isInArrayContext(5, content)).toBe(false);
    });

    it("should return true for nested arrays", () => {
      const content = '[[{"key": "value"}]]';
      expect(isInArrayContext(3, content)).toBe(true);
    });

    it("should return false when inside an object but not an array", () => {
      const content = '{"items": [{"key": "value"}]}';
      // Position at the start of the outer object
      expect(isInArrayContext(1, content)).toBe(false);
      // Position inside the array
      expect(isInArrayContext(12, content)).toBe(true);
    });

    it("should handle arrays with strings", () => {
      const content = '["item1", "item2"]';
      // Position 10 is after "item1", inside the array
      expect(isInArrayContext(10, content)).toBe(true);
    });

    it("should return false for empty content", () => {
      expect(isInArrayContext(0, "")).toBe(false);
    });
  });

  describe("replaceInContext", () => {
    it("should replace patterns outside of string literals", () => {
      const content = '{"key": undefined}';
      const result = replaceInContext(
        content,
        /undefined/g,
        () => "null",
        "Replaced undefined with null",
      );
      expect(result.content).toBe('{"key": null}');
      expect(result.changed).toBe(true);
      expect(result.diagnostics).toContain("Replaced undefined with null");
    });

    it("should not replace patterns inside string literals", () => {
      const content = '{"key": "the value is undefined"}';
      const result = replaceInContext(
        content,
        /undefined/g,
        () => "null",
        "Replaced undefined with null",
      );
      expect(result.content).toBe('{"key": "the value is undefined"}');
      expect(result.changed).toBe(false);
      expect(result.diagnostics).toHaveLength(0);
    });

    it("should track changes correctly when no changes are made", () => {
      const content = '{"key": "value"}';
      const result = replaceInContext(
        content,
        /undefined/g,
        () => "null",
        "Replaced undefined with null",
      );
      expect(result.content).toBe('{"key": "value"}');
      expect(result.changed).toBe(false);
      expect(result.diagnostics).toHaveLength(0);
    });

    it("should limit diagnostics to maxDiagnostics", () => {
      const content = "a b c d e"; // 5 matches
      const result = replaceInContext(
        content,
        /[a-e]/g,
        (match) => match.toUpperCase(),
        "Replaced letter",
        { maxDiagnostics: 3 },
      );
      expect(result.content).toBe("A B C D E");
      expect(result.changed).toBe(true);
      expect(result.diagnostics).toHaveLength(3);
    });

    it("should support dynamic diagnostic messages", () => {
      const content = '{"key": undefined, "key2": undefined}';
      const result = replaceInContext(
        content,
        /undefined/g,
        () => "null",
        (match) => `Replaced ${match}`,
      );
      expect(result.content).toBe('{"key": null, "key2": null}');
      expect(result.diagnostics[0]).toBe("Replaced undefined");
    });

    it("should apply context check when provided", () => {
      // Test that context check can filter replacements based on surrounding content
      const content = "START: item1, SKIP: item2, START: item3";
      const result = replaceInContext(content, /item\d/g, (match) => `[${match}]`, "Wrapped item", {
        // Only replace items that appear after "START:"
        contextCheck: (beforeMatch) => beforeMatch.trimEnd().endsWith("START:"),
      });
      // Only items after "START:" should be replaced
      expect(result.content).toBe("START: [item1], SKIP: item2, START: [item3]");
      expect(result.changed).toBe(true);
      expect(result.diagnostics).toHaveLength(2);
    });

    it("should handle replacement that is same as match", () => {
      const content = '{"key": value}';
      const result = replaceInContext(
        content,
        /value/g,
        (match) => match, // No change
        "Replaced value",
      );
      expect(result.content).toBe('{"key": value}');
      expect(result.changed).toBe(false);
      expect(result.diagnostics).toHaveLength(0);
    });

    it("should capture groups in replacement function", () => {
      const content = '{"key": extra_text value}';
      const result = replaceInContext(
        content,
        /extra_(\w+)/g,
        (_match, group1) => `processed_${group1}`,
        "Processed extra property",
      );
      expect(result.content).toBe('{"key": processed_text value}');
      expect(result.changed).toBe(true);
    });
  });
});
