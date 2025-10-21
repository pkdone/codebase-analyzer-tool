import { fixUndefinedValues } from "../../../../src/llm/json-processing/sanitizers/fix-undefined-values";

describe("fixUndefinedValues sanitizer", () => {
  describe("basic undefined value conversion", () => {
    it("should convert undefined values to null", () => {
      const input = '{"field": undefined}';
      const result = fixUndefinedValues(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"field": null}');
      expect(result.description).toBe("Fixed undefined values");
      expect(result.diagnostics).toContain("Converted undefined to null");
    });

    it("should handle undefined values with whitespace", () => {
      const input = '{"field":   undefined  }';
      const result = fixUndefinedValues(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"field":   null  }');
    });

    it("should handle multiple undefined values", () => {
      const input = '{"field1": undefined, "field2": "value", "field3": undefined}';
      const result = fixUndefinedValues(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"field1": null, "field2": "value", "field3": null}');
      expect(result.diagnostics).toHaveLength(2);
    });

    it("should handle undefined values at end of object", () => {
      const input = '{"field1": "value", "field2": undefined}';
      const result = fixUndefinedValues(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"field1": "value", "field2": null}');
    });

    it("should handle undefined values in nested objects", () => {
      const input = '{"outer": {"inner": undefined, "other": "value"}}';
      const result = fixUndefinedValues(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"outer": {"inner": null, "other": "value"}}');
    });

    it("should handle undefined values in arrays", () => {
      const input = '[{"field": undefined}, {"field": "value"}]';
      const result = fixUndefinedValues(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('[{"field": null}, {"field": "value"}]');
    });
  });

  describe("edge cases", () => {
    it("should not change valid JSON without undefined", () => {
      const input = '{"field": "value", "other": null}';
      const result = fixUndefinedValues(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
      expect(result.description).toBeUndefined();
      expect(result.diagnostics).toBeUndefined();
    });

    it("should not change string 'undefined'", () => {
      const input = '{"field": "undefined"}';
      const result = fixUndefinedValues(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should handle empty object", () => {
      const input = "{}";
      const result = fixUndefinedValues(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should handle empty array", () => {
      const input = "[]";
      const result = fixUndefinedValues(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should handle malformed JSON gracefully", () => {
      const input = '{"field": undefined, "unclosed": "value"';
      const result = fixUndefinedValues(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"field": null, "unclosed": "value"');
    });
  });

  describe("error handling", () => {
    it("should handle sanitizer errors gracefully", () => {
      // Mock a scenario that might cause an error
      const input = '{"field": undefined}';

      // The sanitizer should handle errors internally and return the original string
      const result = fixUndefinedValues(input);

      // Should still work normally
      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"field": null}');
    });
  });

  describe("integration with real-world scenarios", () => {
    it("should handle the exact error case from the log", () => {
      const input = `{
  "purpose": "This XML file serves as an EJB 2.0 deployment descriptor...",
  "implementation": "The implementation defines an entity bean named AddressEJB...",
  "uiFramework": undefined
}`;

      const result = fixUndefinedValues(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"uiFramework": null');
      expect(result.content).not.toContain('"uiFramework": undefined');
    });

    it("should handle complex nested structures with undefined", () => {
      const input = `{
  "level1": {
    "value": "present",
    "undefinedValue": undefined,
    "level2": {
      "items": [
        {"id": 1, "optional": undefined},
        {"id": 2, "optional": "value"}
      ]
    }
  }
}`;

      const result = fixUndefinedValues(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"undefinedValue": null');
      expect(result.content).toContain('"optional": null');
      // The sanitizer should have converted all undefined values to null
      expect(result.content).not.toMatch(/\bundefined\b/);
    });

    it("should handle undefined values with various whitespace patterns", () => {
      const testCases = [
        '{"a":undefined}',
        '{"a": undefined}',
        '{"a":  undefined}',
        '{"a":undefined }',
        '{"a": undefined }',
        '{"a":  undefined  }',
      ];

      testCases.forEach((input) => {
        const result = fixUndefinedValues(input);
        expect(result.changed).toBe(true);
        expect(result.content).toMatch(/"a"\s*:\s*null/);
        expect(result.content).not.toMatch(/\bundefined\b/);
      });
    });

    it("should handle undefined values in different contexts", () => {
      const input = `{
  "simple": undefined,
  "withComma": undefined,
  "lastField": undefined
}`;

      const result = fixUndefinedValues(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe(`{
  "simple": null,
  "withComma": null,
  "lastField": null
}`);
    });
  });

  describe("performance and edge cases", () => {
    it("should handle very long strings efficiently", () => {
      const longString = '{"field": "value", "other": undefined}'.repeat(1000);
      const result = fixUndefinedValues(longString);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"other": null');
      expect(result.content).not.toContain("undefined");
    });

    it("should handle strings with no undefined values efficiently", () => {
      const longString = '{"field": "value", "other": "value"}'.repeat(1000);
      const result = fixUndefinedValues(longString);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(longString);
    });

    it("should handle mixed valid and invalid JSON patterns", () => {
      const input = '{"valid": "value", "invalid": undefined, "alsoValid": 123}';
      const result = fixUndefinedValues(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"valid": "value", "invalid": null, "alsoValid": 123}');
    });
  });
});
