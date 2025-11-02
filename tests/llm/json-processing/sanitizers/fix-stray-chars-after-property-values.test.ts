import { fixStrayCharsAfterPropertyValues } from "../../../../src/llm/json-processing/sanitizers/fix-stray-chars-after-property-values";

describe("fixStrayCharsAfterPropertyValues", () => {
  describe("basic functionality", () => {
    it("should remove stray underscore after string value", () => {
      const input = '      "type": "String"_\n    },';
      const result = fixStrayCharsAfterPropertyValues(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('      "type": "String"\n    },');
      expect(result.description).toBe("Fixed stray characters concatenated after property values");
      expect(result.diagnostics).toBeDefined();
      expect(result.diagnostics?.length).toBeGreaterThan(0);
    });

    it("should remove stray word after string value before comma", () => {
      const input = '      "value": "test"word,';
      const result = fixStrayCharsAfterPropertyValues(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('      "value": "test",');
    });

    it("should remove stray characters before closing brace", () => {
      const input = '      "name": "John"123}';
      const result = fixStrayCharsAfterPropertyValues(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('      "name": "John"}');
    });

    it("should not modify valid JSON without stray text", () => {
      const input = '{"name": "value", "number": 42}';
      const result = fixStrayCharsAfterPropertyValues(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });
  });

  describe("real-world error cases", () => {
    it("should fix the exact error pattern from URLMappingsXmlDAO log", () => {
      const input = `      "name": "FLOW_HANDLER",
      "value": "flow-handler",
      "type": "String"_
    },
    {
      "name": "EXCEPTION_CLASS",`;

      const result = fixStrayCharsAfterPropertyValues(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"type": "String"');
      expect(result.content).not.toContain('"type": "String"_');
      // Verify the fix was applied correctly
      expect(result.content).toMatch(/"type": "String"\s*\n\s*}/);
    });

    it("should handle stray underscore with newline separator", () => {
      const input = `      "value": "flow-handler",
      "type": "String"_
    },`;

      const result = fixStrayCharsAfterPropertyValues(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"type": "String"');
      expect(result.content).not.toContain('"type": "String"_');
    });
  });

  describe("various stray character patterns", () => {
    it("should handle different stray character lengths", () => {
      const testCases = [
        { input: '"prop": "value"_,', expected: '"prop": "value",' },
        { input: '"prop": "value"word,', expected: '"prop": "value",' },
        { input: '"prop": "value"verylongword,', expected: '"prop": "value",' },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = fixStrayCharsAfterPropertyValues(input);
        expect(result.changed).toBe(true);
        expect(result.content).toBe(expected);
      });
    });

    it("should handle stray characters with underscores", () => {
      const input = '"propertyName": "value"_stray_text}';
      const result = fixStrayCharsAfterPropertyValues(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('"propertyName": "value"}');
    });

    it("should handle stray characters with dollar signs", () => {
      const input = '"propertyName": "value"$stray$text,';
      const result = fixStrayCharsAfterPropertyValues(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('"propertyName": "value",');
    });

    it("should handle stray numeric characters", () => {
      const input = '"propertyName": "value"123,';
      const result = fixStrayCharsAfterPropertyValues(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('"propertyName": "value",');
    });
  });

  describe("terminator contexts", () => {
    it("should fix before comma", () => {
      const input = '  "key": "value"word,';
      const result = fixStrayCharsAfterPropertyValues(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('  "key": "value",');
    });

    it("should fix before closing brace", () => {
      const input = '  "key": "value"word}';
      const result = fixStrayCharsAfterPropertyValues(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('  "key": "value"}');
    });

    it("should fix before closing bracket", () => {
      const input = '  "key": "value"word]';
      const result = fixStrayCharsAfterPropertyValues(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('  "key": "value"]');
    });

    it("should fix before newline", () => {
      const input = '  "key": "value"word\n';
      const result = fixStrayCharsAfterPropertyValues(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('  "key": "value"\n');
    });

    it("should fix with whitespace before terminator", () => {
      const input = '  "key": "value"word  ,';
      const result = fixStrayCharsAfterPropertyValues(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('  "key": "value"  ,');
    });
  });

  describe("edge cases", () => {
    it("should handle single character stray text after value", () => {
      const input = '  "type": "String"_\n    },';
      const result = fixStrayCharsAfterPropertyValues(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('  "type": "String"\n    },');
      expect(result.diagnostics).toBeDefined();
    });

    it("should handle empty string", () => {
      const result = fixStrayCharsAfterPropertyValues("");

      expect(result.changed).toBe(false);
      expect(result.content).toBe("");
    });

    it("should handle strings without stray text", () => {
      const input = '{"name": "value"}';
      const result = fixStrayCharsAfterPropertyValues(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should preserve whitespace correctly", () => {
      const input = '      "property": "value"word\n    },';
      const result = fixStrayCharsAfterPropertyValues(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('      "property": "value"\n    },');
    });

    it("should handle strings with escaped quotes correctly", () => {
      // This test verifies that the sanitizer doesn't break when processing strings
      // with escaped quotes. The regex pattern should correctly match the quoted value
      // even when it contains escaped quotes inside.
      const input = '{"simple": "value"word, "complex": "has \\"escaped\\" quotes"}';
      const result = fixStrayCharsAfterPropertyValues(input);

      // Should fix the simple case
      expect(result.changed).toBe(true);
      expect(result.content).toContain('"simple": "value"');
      expect(result.content).not.toContain('"simple": "value"word');
      // Complex string with escaped quotes should remain unchanged (no stray chars after it)
      expect(result.content).toContain('"has \\"escaped\\" quotes"');
    });
  });

  describe("nested structures", () => {
    it("should handle stray chars in nested objects", () => {
      const input = '{"outer": {"inner": "value"word}, "next": "value"}';
      const result = fixStrayCharsAfterPropertyValues(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"inner": "value"');
      expect(result.content).not.toContain('"inner": "value"word');
    });

    it("should handle stray chars in arrays", () => {
      const input = '["first", "second"word, "third"]';
      const result = fixStrayCharsAfterPropertyValues(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"second"');
      expect(result.content).not.toContain('"second"word');
    });
  });

  describe("multiple fixes", () => {
    it("should fix multiple instances of stray characters", () => {
      const input =
        '{"property1": "value1"word1, "property2": "value2"word2, "property3": "value3"}';

      const result = fixStrayCharsAfterPropertyValues(input);

      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("word1");
      expect(result.content).not.toContain("word2");
      expect(result.content).toContain('"property1": "value1"');
      expect(result.content).toContain('"property2": "value2"');
    });
  });

  describe("string value safety", () => {
    it("should not modify content inside string values", () => {
      // Even if a string value contains something that looks like a pattern,
      // it should not be modified
      const input = '{"description": "This is a test_word inside"}';
      const result = fixStrayCharsAfterPropertyValues(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should not modify escaped content inside strings", () => {
      const input = '{"example": "Contains \\"quoted\\" text"}';
      const result = fixStrayCharsAfterPropertyValues(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });
  });

  describe("complex JSON structures", () => {
    it("should handle the exact error from the log file", () => {
      const input = `{
  "name": "FLOW_HANDLER",
  "value": "flow-handler",
  "type": "String"_
},
{
  "name": "EXCEPTION_CLASS"`;

      const result = fixStrayCharsAfterPropertyValues(input);

      expect(result.changed).toBe(true);
      // Verify the underscore is removed
      expect(result.content).toMatch(/"type": "String"\s*\n\s*}/);
      expect(result.content).not.toContain('"type": "String"_');
    });

    it("should handle complete object with stray char", () => {
      const input = `{
  "publicConstants": [
    {
      "name": "FLOW_HANDLER",
      "value": "flow-handler",
      "type": "String"_
    }
  ]
}`;

      const result = fixStrayCharsAfterPropertyValues(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"type": "String"');
      expect(result.content).not.toContain('"type": "String"_');

      // Verify the JSON can be parsed
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should handle stray text with space after property value (from URLMappingsXmlDAO error)", () => {
      // Exact pattern from error log: "type": "String" appraisals
      const input = `    {
      "name": "WEB_ACTION_CLASS",
      "value": "web-action-class",
      "type": "String" appraisals
    },`;

      const result = fixStrayCharsAfterPropertyValues(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"type": "String"');
      expect(result.content).not.toContain("appraisals");
      expect(result.content).toMatch(/"type": "String"\s*\n\s*}/);
    });

    it("should handle stray text on new line after property value (from URLMappingsXmlDAO error)", () => {
      // Exact pattern from error log: "type": "String"\narrived
      const input = `    {
      "name": "HANDLER_RESULT",
      "value": "handler-result",
      "type": "String"
arrived
    },`;

      const result = fixStrayCharsAfterPropertyValues(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"type": "String"');
      expect(result.content).not.toContain("arrived");
      expect(result.content).toMatch(/"type": "String"\s*\n\s*}/);
    });

    it("should handle both error patterns in the same JSON object", () => {
      // Test both patterns from the error log in one object
      const input = `{
  "publicConstants": [
    {
      "name": "WEB_ACTION_CLASS",
      "value": "web-action-class",
      "type": "String" appraisals
    },
    {
      "name": "HANDLER_RESULT",
      "value": "handler-result",
      "type": "String"
arrived
    }
  ]
}`;

      const result = fixStrayCharsAfterPropertyValues(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"type": "String"');
      expect(result.content).not.toContain("appraisals");
      expect(result.content).not.toContain("arrived");

      // Verify the JSON can be parsed after fixing both issues
      expect(() => JSON.parse(result.content)).not.toThrow();
    });
  });
});
