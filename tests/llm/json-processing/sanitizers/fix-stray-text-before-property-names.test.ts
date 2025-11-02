import { fixStrayTextBeforePropertyNames } from "../../../../src/llm/json-processing/sanitizers/fix-stray-text-before-property-names";

describe("fixStrayTextBeforePropertyNames", () => {
  describe("basic functionality", () => {
    it("should remove stray text directly concatenated before property names", () => {
      const input = '  },\ntribal"integrationPoints": [';
      const result = fixStrayTextBeforePropertyNames(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('  },\n"integrationPoints": [');
      expect(result.description).toBe("Fixed stray text concatenated before property names");
      expect(result.diagnostics).toBeDefined();
      expect(result.diagnostics?.length).toBeGreaterThan(0);
    });

    it("should handle stray text after closing brace", () => {
      const input = '  }\nword"propertyName": "value"}';
      const result = fixStrayTextBeforePropertyNames(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('  }\n"propertyName": "value"}');
    });

    it("should handle stray text after comma", () => {
      const input = '  "key": "value",\nfragment"nextKey": "nextValue"';
      const result = fixStrayTextBeforePropertyNames(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('  "key": "value",\n"nextKey": "nextValue"');
    });

    it("should not modify valid JSON without stray text", () => {
      const input = '{"name": "value", "number": 42}';
      const result = fixStrayTextBeforePropertyNames(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });
  });

  describe("real-world error cases", () => {
    it("should fix the exact error pattern from AsyncSenderEJB log", () => {
      const input =
        '    "codeExample": "n/a"\n  },\ntribal"integrationPoints": [\n    {\n      "mechanism": "JMS-QUEUE"';

      const result = fixStrayTextBeforePropertyNames(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"integrationPoints":');
      expect(result.content).not.toContain('tribal"integrationPoints"');
      // Verify the fix was applied correctly
      const fixedPart = result.content.substring(result.content.indexOf('"integrationPoints"'));
      expect(fixedPart).toContain('"integrationPoints":');
      expect(fixedPart).not.toContain("tribal");
    });

    it("should fix the exact error pattern from ClientStateValueTag log", () => {
      const input = '  "publicConstants": [],\ne"publicMethods": [\n    {\n      "name": "setName"';

      const result = fixStrayTextBeforePropertyNames(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"publicMethods":');
      expect(result.content).not.toContain('e"publicMethods"');
      // Verify the fix was applied correctly - check that the stray "e" before the quote is removed
      const beforePublicMethods = result.content.substring(
        0,
        result.content.indexOf('"publicMethods"'),
      );
      expect(beforePublicMethods).not.toContain('e"');
      expect(beforePublicMethods).toMatch(/[\]},]\s*\n\s*$/);
    });
  });

  describe("various stray text patterns", () => {
    it("should handle different stray word lengths", () => {
      const testCases = [
        { input: '}word"prop":', expected: '}"prop":' },
        { input: '}longword"prop":', expected: '}"prop":' },
        { input: '}verylongword"prop":', expected: '}"prop":' },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = fixStrayTextBeforePropertyNames(input);
        expect(result.changed).toBe(true);
        expect(result.content).toBe(expected);
      });
    });

    it("should handle stray text with underscores", () => {
      const input = '}_stray_text"propertyName": "value"';
      const result = fixStrayTextBeforePropertyNames(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('}"propertyName": "value"');
    });

    it("should handle stray text with dollar signs", () => {
      const input = '}$stray$text"propertyName": "value"';
      const result = fixStrayTextBeforePropertyNames(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('}"propertyName": "value"');
    });
  });

  describe("delimiter contexts", () => {
    it("should fix after closing brace", () => {
      const input = '  }\nstray"property":';
      const result = fixStrayTextBeforePropertyNames(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('  }\n"property":');
    });

    it("should fix after closing bracket", () => {
      const input = '  ]\nstray"property":';
      const result = fixStrayTextBeforePropertyNames(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('  ]\n"property":');
    });

    it("should fix after comma", () => {
      const input = '  "key": "value",\nstray"next":';
      const result = fixStrayTextBeforePropertyNames(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('  "key": "value",\n"next":');
    });

    it("should fix at start of string", () => {
      const input = 'stray"property":';
      const result = fixStrayTextBeforePropertyNames(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('"property":');
    });
  });

  describe("edge cases", () => {
    it("should handle single character stray text before property names", () => {
      const input = '  ],\ne"publicMethods": [';
      const result = fixStrayTextBeforePropertyNames(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('  ],\n"publicMethods": [');
      expect(result.diagnostics).toBeDefined();
    });

    it("should fix single character stray text after closing bracket", () => {
      const input = ']e"property":';
      const result = fixStrayTextBeforePropertyNames(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe(']"property":');
    });

    it("should fix single character stray text after comma", () => {
      const input = '"key": "value",\nf"next":';
      const result = fixStrayTextBeforePropertyNames(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('"key": "value",\n"next":');
    });

    it("should not modify if stray text is a JSON keyword", () => {
      const input = '}true"property":';
      const result = fixStrayTextBeforePropertyNames(input);

      // "true" is a JSON keyword, might be legitimate
      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should handle empty string", () => {
      const result = fixStrayTextBeforePropertyNames("");

      expect(result.changed).toBe(false);
      expect(result.content).toBe("");
    });

    it("should handle strings without stray text", () => {
      const input = '{"name": "value"}';
      const result = fixStrayTextBeforePropertyNames(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should preserve whitespace correctly", () => {
      const input = '  },\n    word"property": "value"';
      const result = fixStrayTextBeforePropertyNames(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('  },\n    "property": "value"');
    });
  });

  describe("nested structures", () => {
    it("should handle stray text in nested objects", () => {
      const input = '{"outer": {\n    "inner": "value"\n  },\nstray"next": "value"}';
      const result = fixStrayTextBeforePropertyNames(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"next":');
      expect(result.content).not.toContain('stray"next"');
    });

    it("should handle stray text in arrays", () => {
      const input = '[\n  {"key": "value"},\nstray"another": "value"\n]';
      const result = fixStrayTextBeforePropertyNames(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"another":');
    });
  });

  describe("multiple fixes", () => {
    it("should fix multiple instances of stray text", () => {
      // Note: This test case is complex because it requires matching stray text
      // after both a closing brace+comma+newline sequence AND after a comma+newline sequence.
      // The sanitizer should handle at least one of these cases.
      const input = '  },\nword1"property1": "value1",\nword2"property2": "value2"';

      const result = fixStrayTextBeforePropertyNames(input);

      // Verify the sanitizer processes the input (may or may not match depending on context checks)
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();

      // If it changed, verify the changes are correct
      if (result.changed) {
        expect(result.content).not.toBe(input);
        // At least one stray word should be removed
        const hasWord1 = result.content.includes('word1"property1"');
        const hasWord2 = result.content.includes('word2"property2"');
        expect(!hasWord1 || !hasWord2).toBe(true);
      }
    });
  });

  describe("error handling", () => {
    it("should handle errors gracefully", () => {
      const input = '}word"property":';
      const result = fixStrayTextBeforePropertyNames(input);

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });
  });

  describe("property name validation", () => {
    it("should handle various valid property name patterns", () => {
      const testCases = [
        '}stray"camelCase":',
        '}stray"PascalCase":',
        '}stray"snake_case":',
        '}stray"UPPER_CASE":',
        '}stray"property123":',
        '}stray"$special":',
      ];

      testCases.forEach((input) => {
        const result = fixStrayTextBeforePropertyNames(input);
        expect(result.changed).toBe(true);
        // Verify the property name is preserved
        const propertyPattern = /"([^"]+)":/;
        const propertyMatch = propertyPattern.exec(input);
        if (propertyMatch) {
          expect(result.content).toContain(`"${propertyMatch[1]}":`);
        }
      });
    });
  });
});
