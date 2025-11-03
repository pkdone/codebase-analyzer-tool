import { fixConcatenatedPropertyNames } from "../../../../src/llm/json-processing/sanitizers/fix-concatenated-property-names";

describe("fixConcatenatedPropertyNames", () => {
  describe("basic functionality", () => {
    it("should fix concatenated property names with two parts", () => {
      const input = `{"cyclomati" + "cComplexity": 1}`;

      const result = fixConcatenatedPropertyNames(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"cyclomaticComplexity": 1}');
      expect(result.description).toBe("Fixed concatenated property names");
      expect(result.diagnostics).toBeDefined();
      expect(result.diagnostics?.length).toBeGreaterThan(0);
    });

    it("should fix the exact error pattern from the log file", () => {
      const input = `"cyclomati" + "cComplexity": 1,`;

      const result = fixConcatenatedPropertyNames(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('"cyclomaticComplexity": 1,');
    });

    it("should handle three or more concatenated parts", () => {
      const input = `{"refer" + "en" + "ces": []}`;

      const result = fixConcatenatedPropertyNames(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"references": []}');
    });

    it("should handle mixed case concatenation", () => {
      const input = `{"lines" + "OfCode": 10}`;

      const result = fixConcatenatedPropertyNames(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"linesOfCode": 10}');
    });

    it("should not modify valid JSON", () => {
      const input = `{"cyclomaticComplexity": 1, "linesOfCode": 10}`;

      const result = fixConcatenatedPropertyNames(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should handle whitespace around + operator", () => {
      const input = `{"cyclomati"   +   "cComplexity": 1}`;

      const result = fixConcatenatedPropertyNames(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"cyclomaticComplexity": 1}');
    });
  });

  describe("edge cases", () => {
    it("should handle empty string", () => {
      const result = fixConcatenatedPropertyNames("");

      expect(result.changed).toBe(false);
      expect(result.content).toBe("");
    });

    it("should handle non-JSON strings", () => {
      const input = "This is not JSON";
      const result = fixConcatenatedPropertyNames(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should handle concatenation in string values (not property names)", () => {
      const input = `{"name": "value" + "suffix"}`;

      // This should not match because it's not followed by a colon (property name pattern)
      const result = fixConcatenatedPropertyNames(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should handle multiple concatenated property names", () => {
      const input = `{
  "cyclomati" + "cComplexity": 1,
  "lines" + "OfCode": 10
}`;

      const result = fixConcatenatedPropertyNames(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"cyclomaticComplexity":');
      expect(result.content).toContain('"linesOfCode":');
    });
  });

  describe("error handling", () => {
    it("should handle errors gracefully", () => {
      const input = `{"cyclomati" + "cComplexity": 1}`;
      const result = fixConcatenatedPropertyNames(input);

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });
  });
});

