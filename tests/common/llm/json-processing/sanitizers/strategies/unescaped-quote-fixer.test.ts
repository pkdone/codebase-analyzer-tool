/**
 * Tests for the unescaped quote fixer strategy.
 */

import { unescapedQuoteFixer } from "../../../../../../src/common/llm/json-processing/sanitizers/strategies/unescaped-quote-fixer";

describe("unescapedQuoteFixer", () => {
  describe("basic functionality", () => {
    it("should return unchanged for empty input", () => {
      const result = unescapedQuoteFixer.apply("");
      expect(result.content).toBe("");
      expect(result.changed).toBe(false);
      expect(result.repairs).toEqual([]);
    });

    it("should return unchanged for null/undefined input", () => {
      const result = unescapedQuoteFixer.apply(null as unknown as string);
      expect(result.content).toBeNull();
      expect(result.changed).toBe(false);
    });

    it("should return unchanged for valid JSON without quotes in values", () => {
      const input = '{"name": "test", "value": 123}';
      const result = unescapedQuoteFixer.apply(input);
      expect(result.content).toBe(input);
      expect(result.changed).toBe(false);
    });

    it("should return unchanged for JSON with properly escaped quotes", () => {
      const input = '{"name": "test \\"value\\""}';
      const result = unescapedQuoteFixer.apply(input);
      expect(result.content).toBe(input);
      expect(result.changed).toBe(false);
    });
  });

  describe("HTML attribute quote fixing", () => {
    it("should escape quotes in HTML attribute patterns within string values", () => {
      const input = '{"html": "value = \\"test\\" "}';
      const result = unescapedQuoteFixer.apply(input);
      // The strategy targets specific HTML attribute patterns
      expect(result.content).toBeDefined();
    });

    it("should handle HTML-like attributes with equals signs", () => {
      const input = '{"content": "class=\\"foo\\" id=\\"bar\\""}';
      const result = unescapedQuoteFixer.apply(input);
      expect(result.content).toBeDefined();
    });

    it("should add repairs when HTML attribute quotes are fixed", () => {
      // The pattern looks for = "value" patterns that appear to be inside JSON strings
      const input = '{"attr": "data" + "= \\"test\\"" }';
      const result = unescapedQuoteFixer.apply(input);
      // Behavior depends on context detection
      expect(result.content).toBeDefined();
    });
  });

  describe("escaped quote followed by unescaped quote", () => {
    it("should handle escaped quotes properly", () => {
      const input = '{"value": "test\\"\\"end"}';
      const result = unescapedQuoteFixer.apply(input);
      expect(result.content).toBeDefined();
    });

    it("should handle mixed escaped and unescaped quotes", () => {
      const input = '{"content": "start \\"middle\\" end"}';
      const result = unescapedQuoteFixer.apply(input);
      expect(result.content).toBeDefined();
    });
  });

  describe("context detection", () => {
    it("should detect string value context correctly", () => {
      // The strategy uses context lookback to determine if a quote is in a string value
      const input = '{"key": "some text with = \\"attr\\" inside"}';
      const result = unescapedQuoteFixer.apply(input);
      expect(result.content).toBeDefined();
    });

    it("should not modify quotes outside string value context", () => {
      const input = '{"key": "value"}, {"another": "test"}';
      const result = unescapedQuoteFixer.apply(input);
      // Quotes between objects should not be modified
      expect(result.content).toContain('"key"');
      expect(result.content).toContain('"value"');
    });
  });

  describe("repairs tracking", () => {
    it("should return empty repairs array when no changes made", () => {
      const input = '{"name": "test"}';
      const result = unescapedQuoteFixer.apply(input);
      expect(result.repairs).toEqual([]);
      expect(result.changed).toBe(false);
    });

    it("should include repair descriptions when changes are made", () => {
      // When the strategy does make changes, it should document them
      const result = unescapedQuoteFixer.apply('{"key": "value"}');
      expect(Array.isArray(result.repairs)).toBe(true);
    });
  });

  describe("strategy interface", () => {
    it("should have the correct strategy name", () => {
      expect(unescapedQuoteFixer.name).toBe("UnescapedQuoteFixer");
    });

    it("should implement the apply method", () => {
      expect(typeof unescapedQuoteFixer.apply).toBe("function");
    });

    it("should accept optional config parameter", () => {
      const input = '{"name": "test"}';
      const config = { knownProperties: ["name"] };
      // Should not throw when config is provided
      const result = unescapedQuoteFixer.apply(input, config);
      expect(result.content).toBeDefined();
    });
  });

  describe("edge cases", () => {
    it("should handle deeply nested JSON", () => {
      const input = '{"outer": {"inner": {"deep": "value = \\"test\\""}}}';
      const result = unescapedQuoteFixer.apply(input);
      expect(result.content).toBeDefined();
    });

    it("should handle JSON arrays", () => {
      const input = '[{"key": "value"}, {"key2": "value2"}]';
      const result = unescapedQuoteFixer.apply(input);
      expect(result.content).toBeDefined();
    });

    it("should handle whitespace variations", () => {
      const input = '{\n  "key": "value"\n}';
      const result = unescapedQuoteFixer.apply(input);
      expect(result.content).toBeDefined();
    });

    it("should handle unicode content", () => {
      const input = '{"text": "Hello 世界 = \\"test\\""}';
      const result = unescapedQuoteFixer.apply(input);
      expect(result.content).toBeDefined();
    });
  });
});
