/**
 * Tests for the assignment syntax replacement rules.
 */

import {
  executeRules,
  executeRulesMultiPass,
} from "../../../../../../src/common/llm/json-processing/sanitizers/rules/rule-executor";
import { ASSIGNMENT_RULES } from "../../../../../../src/common/llm/json-processing/sanitizers/rules/properties";

describe("ASSIGNMENT_RULES", () => {
  describe("strayTextDirectlyAfterColon", () => {
    it('should fix stray text directly after colon: "name":strayText": "value"', () => {
      const input = '{"name":xyz": "TestClass"}';
      const result = executeRules(input, ASSIGNMENT_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"name": "TestClass"}');
    });

    it("should fix multiple stray text instances", () => {
      const input = `{
  "name":abc": "Test",
  "type":def": "CLASS"
}`;
      const result = executeRulesMultiPass(input, ASSIGNMENT_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).toContain('"name": "Test"');
      expect(result.content).toContain('"type": "CLASS"');
    });

    it("should handle alphanumeric stray text", () => {
      const input = '{"name":a1b2c3": "TestValue"}';
      const result = executeRules(input, ASSIGNMENT_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"name": "TestValue"}');
    });
  });

  describe("assignmentOperatorToColon", () => {
    it("should convert := to : in property assignment", () => {
      const input = '{"name":= "Test"}';
      const result = executeRules(input, ASSIGNMENT_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"name": "Test"}');
    });

    it("should normalize whitespace after colon", () => {
      const input = '{"name":=   "Test"}';
      const result = executeRules(input, ASSIGNMENT_RULES);
      expect(result.changed).toBe(true);
      // The rule normalizes to single space when whitespace is present
      expect(result.content).toBe('{"name": "Test"}');
    });

    it("should not modify := inside string values", () => {
      const input = '{"code": "x := 5"}';
      const result = executeRules(input, ASSIGNMENT_RULES);
      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });
  });

  describe("strayMinusBeforeColon", () => {
    it('should remove stray minus sign before colon: "prop":- value', () => {
      const input = '{"name":- "Test"}';
      const result = executeRules(input, ASSIGNMENT_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"name": "Test"}');
    });

    it("should handle minus with multiple spaces", () => {
      const input = '{"name":-    "Test"}';
      const result = executeRules(input, ASSIGNMENT_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"name": "Test"}');
    });
  });

  describe("strayTextBetweenColonAndValue", () => {
    it('should fix stray text between colon and value: "name": stray": "value"', () => {
      const input = '{"name": abc": "TestClass"}';
      const result = executeRules(input, ASSIGNMENT_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"name": "TestClass"}');
    });

    it("should handle stray text in nested objects", () => {
      const input = `{
  "outer": {
    "inner": xyz": "value"
  }
}`;
      const result = executeRules(input, ASSIGNMENT_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).toContain('"inner": "value"');
    });
  });

  describe("missingOpeningQuoteOnValue", () => {
    it('should add missing opening quote on value: "type":JsonCommand"', () => {
      const input = '{"type":JsonCommand",}';
      const result = executeRules(input, ASSIGNMENT_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"type": "JsonCommand",}');
    });

    it("should add missing quote with closing brace", () => {
      const input = '{"kind":CLASS"}';
      const result = executeRules(input, ASSIGNMENT_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"kind": "CLASS"}');
    });

    it("should not modify JSON keywords", () => {
      const input = '{"enabled":true,}';
      const result = executeRules(input, ASSIGNMENT_RULES);
      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should not modify numeric values", () => {
      const input = '{"count":42,}';
      const result = executeRules(input, ASSIGNMENT_RULES);
      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });
  });

  describe("unquotedStringValue", () => {
    it("should quote unquoted string values", () => {
      const input = '{"name": TestClass,}';
      const result = executeRules(input, ASSIGNMENT_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"name": "TestClass",}');
    });

    it("should handle unquoted value at end of object", () => {
      const input = '{"name": TestClass}';
      const result = executeRules(input, ASSIGNMENT_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"name": "TestClass"}');
    });

    it("should handle unquoted value in array context", () => {
      const input = '{"items": [{"name": Test}]}';
      const result = executeRules(input, ASSIGNMENT_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).toContain('"name": "Test"');
    });

    it("should not modify JSON keyword true", () => {
      const input = '{"active": true}';
      const result = executeRules(input, ASSIGNMENT_RULES);
      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should not modify JSON keyword false", () => {
      const input = '{"active": false}';
      const result = executeRules(input, ASSIGNMENT_RULES);
      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should not modify JSON keyword null", () => {
      const input = '{"value": null}';
      const result = executeRules(input, ASSIGNMENT_RULES);
      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should not modify numeric values", () => {
      const input = '{"count": 123}';
      const result = executeRules(input, ASSIGNMENT_RULES);
      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should not modify float values", () => {
      const input = '{"value": 3.14}';
      const result = executeRules(input, ASSIGNMENT_RULES);
      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should not modify scientific notation", () => {
      const input = '{"value": 1e10}';
      const result = executeRules(input, ASSIGNMENT_RULES);
      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should not modify object values", () => {
      const input = '{"nested": {"inner": "value"}}';
      const result = executeRules(input, ASSIGNMENT_RULES);
      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should not modify array values", () => {
      const input = '{"items": ["a", "b"]}';
      const result = executeRules(input, ASSIGNMENT_RULES);
      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should preserve whitespace after colon", () => {
      const input = '{"name":   TestClass}';
      const result = executeRules(input, ASSIGNMENT_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"name":   "TestClass"}');
    });
  });

  describe("combined fixes", () => {
    it("should handle multiple different issues in one object", () => {
      const input = `{
  "name":= "Test",
  "type":xyz": "CLASS",
  "kind": Enum}`;
      const result = executeRulesMultiPass(input, ASSIGNMENT_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).toContain('"name": "Test"');
      expect(result.content).toContain('"type": "CLASS"');
      expect(result.content).toContain('"kind": "Enum"');
    });

    it("should not modify valid JSON", () => {
      const input = `{
  "name": "TestClass",
  "type": "CLASS",
  "count": 42,
  "enabled": true,
  "items": ["a", "b"]
}`;
      const result = executeRules(input, ASSIGNMENT_RULES);
      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });
  });

  describe("edge cases", () => {
    it("should handle empty input", () => {
      const result = executeRules("", ASSIGNMENT_RULES);
      expect(result.changed).toBe(false);
    });

    it("should handle input with no matches", () => {
      const input = '{"valid": "json"}';
      const result = executeRules(input, ASSIGNMENT_RULES);
      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should not corrupt nested structures", () => {
      const input = `{
  "outer": {
    "inner": {
      "deep": "value"
    }
  }
}`;
      const result = executeRules(input, ASSIGNMENT_RULES);
      expect(result.changed).toBe(false);
      const parsed = JSON.parse(result.content);
      expect(parsed.outer.inner.deep).toBe("value");
    });
  });
});
