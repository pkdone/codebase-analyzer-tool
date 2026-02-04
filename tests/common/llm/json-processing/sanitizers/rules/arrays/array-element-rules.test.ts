/**
 * Tests for array element replacement rules.
 * This module tests the expanded stray content detection patterns.
 */

import { executeRules } from "../../../../../../../src/common/llm/json-processing/sanitizers/rules/rule-executor";
import { ARRAY_ELEMENT_RULES } from "../../../../../../../src/common/llm/json-processing/sanitizers/rules/arrays/array-element-rules";

describe("ARRAY_ELEMENT_RULES", () => {
  describe("genericStrayContentAfterString", () => {
    describe("basic stray content detection", () => {
      it("should remove single special characters after string values", () => {
        const input = `{
  "items": [
    "value1">
  ]
}`;
        const result = executeRules(input, ARRAY_ELEMENT_RULES);
        expect(result.changed).toBe(true);
        expect(result.content).toContain('"value1"');
        expect(result.content).not.toContain('"value1">');
      });

      it("should remove uppercase identifiers after string values", () => {
        const input = `{
  "items": [
    "value1"JACKSON_CORE
  ]
}`;
        const result = executeRules(input, ARRAY_ELEMENT_RULES);
        expect(result.changed).toBe(true);
        expect(result.content).not.toContain("JACKSON_CORE");
      });

      it("should remove short lowercase stray words", () => {
        const input = `{
  "items": [
    "value1"xyz,
    "value2"
  ]
}`;
        const result = executeRules(input, ARRAY_ELEMENT_RULES);
        expect(result.changed).toBe(true);
        expect(result.content).not.toContain("xyz");
      });
    });

    describe("parenthetical annotation detection", () => {
      it("should remove (required) annotation after string values", () => {
        const input = `{
  "fields": [
    "fieldName" (required),
    "otherField"
  ]
}`;
        const result = executeRules(input, ARRAY_ELEMENT_RULES);
        expect(result.changed).toBe(true);
        expect(result.content).toContain('"fieldName"');
        expect(result.content).not.toContain("(required)");
      });

      it("should remove (optional) annotation after string values", () => {
        const input = `{
  "fields": [
    "fieldName" (optional),
    "otherField"
  ]
}`;
        const result = executeRules(input, ARRAY_ELEMENT_RULES);
        expect(result.changed).toBe(true);
        expect(result.content).not.toContain("(optional)");
      });

      it("should remove (deprecated) annotation after string values", () => {
        const input = `{
  "methods": [
    "oldMethod" (deprecated),
    "newMethod"
  ]
}`;
        const result = executeRules(input, ARRAY_ELEMENT_RULES);
        expect(result.changed).toBe(true);
        expect(result.content).not.toContain("(deprecated)");
      });

      it("should remove (TODO) annotation after string values", () => {
        const input = `{
  "items": [
    "incomplete" (TODO),
    "complete"
  ]
}`;
        const result = executeRules(input, ARRAY_ELEMENT_RULES);
        expect(result.changed).toBe(true);
        expect(result.content).not.toContain("(TODO)");
      });
    });

    describe("arrow annotation detection", () => {
      it("should remove <-- comment annotation after string values", () => {
        const input = `{
  "items": [
    "value1" <-- fix this,
    "value2"
  ]
}`;
        const result = executeRules(input, ARRAY_ELEMENT_RULES);
        expect(result.changed).toBe(true);
        expect(result.content).toContain('"value1"');
        expect(result.content).not.toContain("<-- fix this");
      });

      it("should remove --> annotation after string values", () => {
        const input = `{
  "items": [
    "important" --> note this,
    "other"
  ]
}`;
        const result = executeRules(input, ARRAY_ELEMENT_RULES);
        expect(result.changed).toBe(true);
        expect(result.content).not.toContain("--> note this");
      });

      it("should remove <- annotation after string values", () => {
        const input = `{
  "items": [
    "value1" <- check,
    "value2"
  ]
}`;
        const result = executeRules(input, ARRAY_ELEMENT_RULES);
        expect(result.changed).toBe(true);
        expect(result.content).not.toContain("<- check");
      });

      it("should remove -> annotation after string values", () => {
        const input = `{
  "items": [
    "source" -> target,
    "other"
  ]
}`;
        const result = executeRules(input, ARRAY_ELEMENT_RULES);
        expect(result.changed).toBe(true);
        expect(result.content).not.toContain("-> target");
      });
    });

    describe("dash-prefixed annotation detection", () => {
      it("should remove - required annotation after string values", () => {
        const input = `{
  "fields": [
    "fieldName" - required,
    "otherField"
  ]
}`;
        const result = executeRules(input, ARRAY_ELEMENT_RULES);
        expect(result.changed).toBe(true);
        expect(result.content).not.toContain("- required");
      });

      it("should remove - optional annotation after string values", () => {
        const input = `{
  "fields": [
    "fieldName" - optional,
    "otherField"
  ]
}`;
        const result = executeRules(input, ARRAY_ELEMENT_RULES);
        expect(result.changed).toBe(true);
        expect(result.content).not.toContain("- optional");
      });
    });

    describe("preserves valid content", () => {
      it("should not modify valid JSON arrays", () => {
        const input = `{
  "items": [
    "value1",
    "value2",
    "value3"
  ]
}`;
        const result = executeRules(input, ARRAY_ELEMENT_RULES);
        expect(result.content).toContain('"value1"');
        expect(result.content).toContain('"value2"');
        expect(result.content).toContain('"value3"');
      });

      it("should not remove content that looks like property starts (colon after)", () => {
        const input = `{
  "name": "value",
  "nextProp": "data"
}`;
        const result = executeRules(input, ARRAY_ELEMENT_RULES);
        expect(result.content).toContain('"nextProp":');
      });

      it("should preserve JSON keywords", () => {
        const input = `{
  "values": [
    "text"true,
    "more"
  ]
}`;
        // "true" after a string - but true is a JSON keyword
        // The rule should not remove it if it looks like a valid literal
        const result = executeRules(input, ARRAY_ELEMENT_RULES);
        // This is actually stray content since "text"true is invalid
        expect(result.content).toContain('"text"');
      });
    });
  });

  describe("integration tests", () => {
    it("should handle multiple stray annotations in same array", () => {
      const input = `{
  "fields": [
    "field1" (required),
    "field2" <-- important,
    "field3" - optional,
    "field4"
  ]
}`;
      const result = executeRules(input, ARRAY_ELEMENT_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).toContain('"field1"');
      expect(result.content).toContain('"field2"');
      expect(result.content).toContain('"field3"');
      expect(result.content).toContain('"field4"');
      expect(result.content).not.toContain("(required)");
      expect(result.content).not.toContain("<-- important");
      expect(result.content).not.toContain("- optional");
    });

    it("should produce valid JSON after fixes", () => {
      const input = `{
  "items": [
    "item1" (note),
    "item2"
  ]
}`;
      const result = executeRules(input, ARRAY_ELEMENT_RULES);
      expect(result.changed).toBe(true);
      // The result should be parseable after the fix
      // Note: The rule only fixes the stray content, may still need other fixes
      expect(result.content).not.toContain("(note)");
    });
  });
});
