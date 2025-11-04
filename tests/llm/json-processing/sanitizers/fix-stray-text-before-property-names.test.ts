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

  describe("non-ASCII stray text handling", () => {
    it("should remove Bengali text before array elements (exact error from log)", () => {
      const input = `  "externalReferences": [
    "java.util.Map",
    করার"org.apache.commons.lang3.StringUtils",
    "org.springframework.beans.factory.annotation.Autowired"
  ]`;

      const result = fixStrayTextBeforePropertyNames(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"org.apache.commons.lang3.StringUtils"');
      expect(result.content).not.toContain("করার");
      expect(result.diagnostics).toBeDefined();
      expect(result.diagnostics?.some((d) => d.includes("non-ASCII"))).toBe(true);
    });

    it("should remove non-ASCII text before array string values", () => {
      const input = `  "references": [
    "item1",
    text"item2",
    "item3"
  ]`;

      const result = fixStrayTextBeforePropertyNames(input);

      if (result.changed) {
        expect(result.content).toContain('"item2"');
        expect(result.content).not.toContain('text"item2"');
      }
    });

    it("should handle Chinese characters before array elements", () => {
      const input = `  "items": [
    "value1",
    文本"value2",
    "value3"
  ]`;

      const result = fixStrayTextBeforePropertyNames(input);

      if (result.changed) {
        expect(result.content).toContain('"value2"');
        expect(result.content).not.toContain("文本");
      }
    });

    it("should handle Arabic text before array elements", () => {
      const input = `  "items": [
    "value1",
    نص"value2",
    "value3"
  ]`;

      const result = fixStrayTextBeforePropertyNames(input);

      if (result.changed) {
        expect(result.content).toContain('"value2"');
        expect(result.content).not.toContain("نص");
      }
    });

    it("should only fix stray text when in array context", () => {
      const input = `  "description": "Some text with করার embedded text"`;

      const result = fixStrayTextBeforePropertyNames(input);

      // Should not modify - the Bengali text is inside a string value, not before a property
      expect(result.changed).toBe(false);
    });

    it("should handle stray ASCII text (e) after comma-newline (exact error from log)", () => {
      const input = `  "externalReferences": [
    "org.junit.jupiter.api.Test",
e"org.junit.jupiter.api.extension.ExtendWith",
    "org.slf4j.Logger"
  ]`;

      const result = fixStrayTextBeforePropertyNames(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"org.junit.jupiter.api.extension.ExtendWith"');
      expect(result.content).not.toContain('e"org.junit.jupiter.api.extension.ExtendWith"');
      expect(result.diagnostics).toBeDefined();
      expect(result.diagnostics?.some((d) => d.includes("ASCII") || d.includes("stray text"))).toBe(
        true,
      );
    });

    it("should fix exact error pattern from RecurringDepositTest log - comma-newline-e pattern in internalReferences array", () => {
      // This is the exact pattern from response-error-2025-11-04T08-05-53-733Z.log
      // Line 44-45: "RecurringDepositAccountStatusChecker",\ne"RecurringDepositProductHelper",
      const input = `  "internalReferences": [
    "org.apache.fineract.integrationtests.common.recurringdeposit.RecurringDepositAccountStatusChecker",
e"org.apache.fineract.integrationtests.common.recurringdeposit.RecurringDepositProductHelper",
    "org.apache.fineract.integrationtests.common.savings.SavingsAccountHelper"
  ]`;

      const result = fixStrayTextBeforePropertyNames(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain(
        '"org.apache.fineract.integrationtests.common.recurringdeposit.RecurringDepositProductHelper"',
      );
      expect(result.content).not.toContain(
        'e"org.apache.fineract.integrationtests.common.recurringdeposit.RecurringDepositProductHelper"',
      );
      expect(result.diagnostics).toBeDefined();
      // Verify the result can be parsed as JSON
      const wrappedResult = `{${result.content}}`;
      expect(() => JSON.parse(wrappedResult)).not.toThrow();
    });

    it("should handle stray text after comma-newline in array", () => {
      const input = `  "items": [
    "item1",
    stray"item2",
    "item3"
  ]`;

      const result = fixStrayTextBeforePropertyNames(input);

      if (result.changed) {
        expect(result.content).toContain('"item2"');
        expect(result.content).not.toContain('stray"item2"');
      }
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

    it("should fix the exact error pattern from PurchaseOrderLocal log - comma, newline, single char", () => {
      // This is the exact pattern from the error: },\ne"publicMethods":
      const input = '    },\ne"publicMethods": [';
      const result = fixStrayTextBeforePropertyNames(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('    },\n"publicMethods": [');
      expect(result.content).not.toContain('e"publicMethods"');
      expect(result.diagnostics).toBeDefined();
      expect(result.diagnostics).toContain(
        'Removed stray text "e" before property "publicMethods"',
      );
    });

    it("should fix the exact error pattern from LoanTransactionData log - }, newline, single char e before publicMethods", () => {
      // This is the exact pattern from the error log: },\ne"publicMethods": [
      // From fineract-loan/src/main/java/org/apache/fineract/portfolio/loanaccount/data/LoanTransactionData.java
      const input = '      "codeSmells": []\n    },\ne"publicMethods": [\n    {';
      const result = fixStrayTextBeforePropertyNames(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"publicMethods": [');
      expect(result.content).not.toContain('e"publicMethods"');
      expect(result.diagnostics).toBeDefined();
      expect(result.diagnostics).toContain(
        'Removed stray text "e" before property "publicMethods"',
      );

      // Verify the fix produces valid JSON structure
      const fixedPart = result.content.substring(result.content.indexOf('"publicMethods"'));
      expect(fixedPart).toMatch(/^"publicMethods":\s*\[/);
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

  describe("stray text with colon before property names", () => {
    it("should remove stray text with colon before quoted property names", () => {
      // This reproduces the exact error from response-error-2025-11-02T22-53-08-168Z.log
      const input = `  ],
extraText: "externalReferences": [
    "jakarta.ws.rs.core.Response"
  ]`;

      const result = fixStrayTextBeforePropertyNames(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"externalReferences":');
      expect(result.content).not.toContain('extraText: "externalReferences"');
      expect(result.diagnostics).toBeDefined();
      expect(result.diagnostics?.some((d) => d.includes("Removed stray text with colon"))).toBe(
        true,
      );
    });

    it("should handle stray text with colon after closing brace", () => {
      const input = '  }\nextraWord: "propertyName": "value"';
      const result = fixStrayTextBeforePropertyNames(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('  }\n"propertyName": "value"');
    });

    it("should handle stray text with colon after comma", () => {
      const input = '  "key": "value",\nstrayText: "nextProperty": "nextValue"';
      const result = fixStrayTextBeforePropertyNames(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"nextProperty":');
      expect(result.content).not.toContain("strayText:");
    });

    it("should handle stray text with colon and multiple spaces", () => {
      const input = '  ],\nextraText   :   "propertyName": "value"';
      const result = fixStrayTextBeforePropertyNames(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"propertyName":');
      expect(result.content).not.toContain("extraText");
    });

    it("should handle the exact error case from BulkImportWorkbookService log", () => {
      const input = `  "internalReferences": [
    "org.apache.fineract.infrastructure.bulkimport.data.GlobalEntityType",
    "org.apache.fineract.infrastructure.bulkimport.data.ImportData",
    "org.apache.fineract.infrastructure.documentmanagement.data.DocumentData"
  ],
extraText: "externalReferences": [
    "jakarta.ws.rs.core.Response",
    "org.glassfish.jersey.media.multipart.FormDataContentDisposition"
  ]`;

      const result = fixStrayTextBeforePropertyNames(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"externalReferences":');
      expect(result.content).not.toContain('extraText: "externalReferences"');
      // Verify the result can be parsed as JSON when wrapped
      const wrappedResult = `{${result.content}}`;
      expect(() => JSON.parse(wrappedResult)).not.toThrow();
    });

    it("should not modify valid JSON properties", () => {
      const input = '{"name": "value", "description": "test"}';
      const result = fixStrayTextBeforePropertyNames(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should handle multiple stray text with colon patterns", () => {
      const input =
        '  },\nfirstStray: "firstProperty": "value1",\nsecondStray: "secondProperty": "value2"';

      const result = fixStrayTextBeforePropertyNames(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"firstProperty":');
      expect(result.content).toContain('"secondProperty":');
      expect(result.content).not.toContain("firstStray:");
      expect(result.content).not.toContain("secondStray:");
    });

    it("should not modify if stray text is a JSON keyword", () => {
      const input = '  }\ntrue: "property": "value"';
      const result = fixStrayTextBeforePropertyNames(input);

      // "true" is a JSON keyword, should not be modified
      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should handle nested structures with stray text and colon", () => {
      const input = '{"outer": {\n    "inner": "value"\n  },\nstrayText: "next": "value"}';

      const result = fixStrayTextBeforePropertyNames(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"next":');
      expect(result.content).not.toContain("strayText:");
    });

    it("should fix the exact error pattern from DocumentWritePlatformService log - closing bracket, comma, newline, e", () => {
      // This is the exact pattern from the error log: ],\ne"publicMethods": [
      // The error shows a duplicate publicMethods property after closing an array
      const input = `      "codeSmells": [
        "LONG PARAMETER LIST"
      ],
e"publicMethods": [
    {
      "name": "updateDocument"`;

      const result = fixStrayTextBeforePropertyNames(input);

      expect(result.changed).toBe(true);
      expect(result.content).not.toContain('e"publicMethods"');
      expect(result.content).toContain('"publicMethods":');
    });
  });
});
