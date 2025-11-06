import { fixPropertyNames } from "../../../../src/llm/json-processing/sanitizers/fix-property-names";

describe("fixPropertyNames", () => {
  describe("concatenated property names", () => {
    it("should merge concatenated string literals in property names", () => {
      const input = '"cyclomati" + "cComplexity": 10';
      const result = fixPropertyNames(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('"cyclomaticComplexity": 10');
      expect(result.diagnostics).toBeDefined();
      expect(result.diagnostics?.some((d) => d.includes("concatenated"))).toBe(true);
    });

    it("should handle multiple concatenated parts", () => {
      const input = '"referen" + "ces": []';
      const result = fixPropertyNames(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('"references": []');
    });

    it("should not modify concatenation in string values", () => {
      const input = '{"description": "Use BASE + \'/path\'"}';
      const result = fixPropertyNames(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });
  });

  describe("truncated property names", () => {
    it("should fix truncated property names with quotes", () => {
      const input = '{"eferences": []}';
      const result = fixPropertyNames(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"references": []}');
    });

    it("should fix truncated names with missing opening quote", () => {
      const input = '{eferences": []}';
      const result = fixPropertyNames(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"references": []}');
    });

    it("should fix single character truncations", () => {
      const input = '{e": "value"}';
      const result = fixPropertyNames(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"name": "value"}');
    });

    it("should fix tail-end truncations", () => {
      const input = '{alues": []}';
      const result = fixPropertyNames(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"publicMethods": []}');
    });
  });

  describe("unquoted property names", () => {
    it("should add quotes around unquoted property names", () => {
      const input = '{name: "value", unquotedProp: "test"}';
      const result = fixPropertyNames(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"name": "value", "unquotedProp": "test"}');
    });

    it("should not change already quoted property names", () => {
      const input = '{"name": "value", "quotedProp": "test"}';
      const result = fixPropertyNames(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should handle various property name patterns", () => {
      const input = '{name_with_underscore: "value", name-with-dash: "value"}';
      const result = fixPropertyNames(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"name_with_underscore": "value", "name-with-dash": "value"}');
    });
  });

  describe("missing opening quotes", () => {
    it("should add missing opening quotes", () => {
      const input = '{description": "value"}';
      const result = fixPropertyNames(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"description": "value"}');
    });

    it("should handle missing opening quotes with truncations", () => {
      const input = '{eferences": []}';
      const result = fixPropertyNames(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"references": []}');
    });
  });

  describe("missing closing quote and colon", () => {
    it("should fix missing closing quote and colon", () => {
      const input = '{"name "value"}';
      const result = fixPropertyNames(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"name": "value"}');
    });

    it("should handle this pattern correctly", () => {
      const input = '{"description "test"}';
      const result = fixPropertyNames(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"description": "test"}');
    });
  });

  describe("property name typos", () => {
    it("should fix trailing underscores", () => {
      const input = '{"type_": "String", "name_": "value"}';
      const result = fixPropertyNames(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"type": "String", "name": "value"}');
    });

    it("should fix double underscores", () => {
      const input = '{"property__name": "value"}';
      const result = fixPropertyNames(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"property_name": "value"}');
    });

    it("should fix known typo corrections", () => {
      const input = '{"type_": "String"}';
      const result = fixPropertyNames(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"type": "String"}');
    });
  });

  describe("unquoted property typos", () => {
    it("should fix unquoted properties that are typos", () => {
      const input = '{extraReferences": []}';
      const result = fixPropertyNames(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"externalReferences": []}');
    });

    it("should fix internReferences typo", () => {
      const input = '{internReferences": []}';
      const result = fixPropertyNames(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"internalReferences": []}');
    });
  });

  describe("combined fixes", () => {
    it("should handle multiple issues in one JSON", () => {
      const input = '{name: "value", "type_": "String", eferences": []}';
      const result = fixPropertyNames(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"name": "value", "type": "String", "references": []}');
      expect(result.diagnostics?.length).toBeGreaterThan(0);
    });

    it("should handle complex JSON with multiple property issues", () => {
      const input =
        '{name: "test", "description "value", "eferences": [], "property__name": "value"}';
      const result = fixPropertyNames(input);

      expect(result.changed).toBe(true);
      expect(() => JSON.parse(result.content)).not.toThrow();
    });
  });

  describe("edge cases", () => {
    it("should return unchanged when no issues present", () => {
      const input = '{"name": "value", "description": "test"}';
      const result = fixPropertyNames(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should handle empty string", () => {
      const input = "";
      const result = fixPropertyNames(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe("");
    });

    it("should not modify property names in string values", () => {
      const input = '{"description": "Property name: unquotedProp"}';
      const result = fixPropertyNames(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should handle nested structures", () => {
      const input = '{"nested": {name: "value"}}';
      const result = fixPropertyNames(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"nested": {"name": "value"}}');
    });

    it("should handle arrays", () => {
      const input = '[{"name": "value"}, {unquoted: "test"}]';
      const result = fixPropertyNames(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('[{"name": "value"}, {"unquoted": "test"}]');
    });
  });
});
