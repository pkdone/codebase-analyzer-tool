import { unifiedSyntaxSanitizer } from "../../../src/llm/json-processing/sanitizers/unified-syntax-sanitizer";
import { fixJsonStructure } from "../../../src/llm/json-processing/sanitizers/fix-json-structure";
import { normalizeCharacters } from "../../../src/llm/json-processing/sanitizers/normalize-characters";

/**
 * Safety tests to ensure sanitizers don't modify valid JSON string content.
 * These tests verify that patterns matching structural fixes don't accidentally
 * alter content inside valid JSON strings.
 */
describe("Sanitizer String Content Safety", () => {
  describe("unifiedSyntaxSanitizer (concatenation chains)", () => {
    it("preserves plus signs in string values", () => {
      const input = '{"description": "This calculates VAR_A + VAR_B"}';
      const result = unifiedSyntaxSanitizer(input);
      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("preserves code examples in strings", () => {
      const input = '{"example": "Use: BASE_PATH + \'/file.ts\'"}';
      const result = unifiedSyntaxSanitizer(input);
      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("preserves mathematical expressions in strings", () => {
      const input = '{"formula": "a + b + c = total"}';
      const result = unifiedSyntaxSanitizer(input);
      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("preserves concatenation patterns in documentation strings", () => {
      const input = '{"docs": "To concatenate paths, use: basePath + subDir + fileName"}';
      const result = unifiedSyntaxSanitizer(input);
      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });
  });

  describe("fixJsonStructure (includes addMissingPropertyCommas functionality)", () => {
    it("doesn't add commas inside multiline string values", () => {
      const input = '{"text": "Line 1\\nLine 2"}';
      const result = fixJsonStructure(input);
      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("handles JSON with properly formatted properties", () => {
      const valid = '{"a": "value1",\n"b": "value2"}';
      const result = fixJsonStructure(valid);
      expect(result.changed).toBe(false);
      expect(result.content).toBe(valid);
    });

    it("preserves quoted text that looks like properties", () => {
      const input = '{"description": "Format: \\"key\\": \\"value\\""}';
      const result = fixJsonStructure(input);
      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });
  });

  describe("normalizeCharacters", () => {
    it("handles valid escaped quotes in strings", () => {
      const input = '{"quote": "He said \\"hello\\""}';
      const result = normalizeCharacters(input);
      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("preserves valid escape sequences", () => {
      const input = '{"path": "C:\\\\Users\\\\file.txt"}';
      const result = normalizeCharacters(input);
      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("preserves newlines and tabs", () => {
      const input = '{"text": "Line 1\\nLine 2\\tTabbed"}';
      const result = normalizeCharacters(input);
      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });
  });

  describe("Combined safety test", () => {
    it("preserves complex valid JSON with code snippets", () => {
      const input = JSON.stringify({
        description: "Function that adds values: A + B",
        example: "const path = BASE_PATH + '/file'",
        code: "return a + b + c;",
      });

      const result1 = unifiedSyntaxSanitizer(input);
      const result2 = fixJsonStructure(result1.content);
      const result3 = normalizeCharacters(result2.content);

      expect(JSON.parse(result3.content)).toEqual(JSON.parse(input));
    });

    it("preserves embedded code with special characters", () => {
      const input = JSON.stringify({
        sql: "SELECT * FROM users WHERE age > 18",
        regex: "\\d{3}-\\d{4}",
        path: "C:\\\\Program Files\\\\App",
      });

      const result1 = unifiedSyntaxSanitizer(input);
      const result2 = fixJsonStructure(result1.content);
      const result3 = normalizeCharacters(result2.content);

      // Should remain unchanged through all sanitizers (no over-escaping present)
      expect(result3.content).toBe(input);
    });
  });

  describe("Edge cases with embedded JSON-like structures", () => {
    it("preserves JSON examples in documentation", () => {
      const input = '{"doc": "Example: {\\"key\\": \\"value\\"}"}';
      const result1 = unifiedSyntaxSanitizer(input);
      const result2 = fixJsonStructure(result1.content);

      expect(result2.content).toBe(input);
    });

    it("handles strings containing array-like patterns", () => {
      const input = '{"description": "Returns [1, 2, 3]"}';
      const result = fixJsonStructure(input);
      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });
  });
});
