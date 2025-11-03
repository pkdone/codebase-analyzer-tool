import { fixTruncatedPropertyNames } from "../../../../src/llm/json-processing/sanitizers/fix-truncated-property-names";

describe("fixTruncatedPropertyNames", () => {
  describe("basic functionality", () => {
    it("should fix truncated property names", () => {
      const input = '{"eferences": [], "integra": "test"}';
      const result = fixTruncatedPropertyNames(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"references": [], "integration": "test"}');
      expect(result.description).toBe("Fixed truncated property names");
      expect(result.diagnostics).toContain(
        "Fixed truncated property name: eferences -> references",
      );
      expect(result.diagnostics).toContain("Fixed truncated property name: integra -> integration");
    });

    it("should not change valid property names", () => {
      const input = '{"references": [], "integration": "test", "name": "value"}';
      const result = fixTruncatedPropertyNames(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
      expect(result.description).toBeUndefined();
      expect(result.diagnostics).toBeUndefined();
    });

    it("should handle mixed valid and invalid property names", () => {
      const input = '{"references": [], "eferences": [], "name": "value"}';
      const result = fixTruncatedPropertyNames(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"references": [], "references": [], "name": "value"}');
      expect(result.diagnostics).toContain(
        "Fixed truncated property name: eferences -> references",
      );
    });
  });

  describe("specific property name mappings", () => {
    const testCases = [
      { input: "eferences", expected: "references" },
      { input: "refere", expected: "references" },
      { input: "refer", expected: "references" },
      { input: "integra", expected: "integration" },
      { input: "integrat", expected: "integration" },
      { input: "implemen", expected: "implementation" },
      { input: "purpos", expected: "purpose" },
      { input: "purpo", expected: "purpose" },
      { input: "descriptio", expected: "description" },
      { input: "descripti", expected: "description" },
      { input: "descript", expected: "description" },
      { input: "paramete", expected: "parameters" },
      { input: "paramet", expected: "parameters" },
      { input: "retur", expected: "return" },
      { input: "metho", expected: "methods" },
      { input: "constan", expected: "constants" },
      { input: "consta", expected: "constants" },
      { input: "databas", expected: "database" },
      { input: "qualit", expected: "quality" },
      { input: "metric", expected: "metrics" },
      { input: "metri", expected: "metrics" },
      { input: "smel", expected: "smells" },
      { input: "complexi", expected: "complexity" },
      { input: "complex", expected: "complexity" },
      { input: "averag", expected: "average" },
      { input: "avera", expected: "average" },
      { input: "maxim", expected: "maximum" },
      { input: "maxi", expected: "maximum" },
      { input: "minim", expected: "minimum" },
      { input: "mini", expected: "minimum" },
      { input: "lengt", expected: "length" },
      { input: "leng", expected: "length" },
      { input: "tota", expected: "total" },
      { input: "clas", expected: "class" },
      { input: "interfac", expected: "interface" },
      { input: "interfa", expected: "interface" },
      { input: "interf", expected: "interface" },
      { input: "inter", expected: "interface" },
      { input: "namespac", expected: "namespace" },
      { input: "namespa", expected: "namespace" },
      { input: "namesp", expected: "namespace" },
      { input: "names", expected: "namespace" },
      { input: "publi", expected: "public" },
      { input: "publ", expected: "public" },
      { input: "privat", expected: "private" },
      { input: "priva", expected: "private" },
      { input: "priv", expected: "private" },
      { input: "protec", expected: "protected" },
      { input: "prote", expected: "protected" },
      { input: "prot", expected: "protected" },
      { input: "stati", expected: "static" },
      { input: "stat", expected: "static" },
      { input: "fina", expected: "final" },
      { input: "abstrac", expected: "abstract" },
      { input: "abstra", expected: "abstract" },
      { input: "abst", expected: "abstract" },
      { input: "synchronize", expected: "synchronized" },
      { input: "synchroniz", expected: "synchronized" },
      { input: "synchroni", expected: "synchronized" },
      { input: "synchron", expected: "synchronized" },
      { input: "synchro", expected: "synchronized" },
      { input: "synchr", expected: "synchronized" },
      { input: "synch", expected: "synchronized" },
      { input: "sync", expected: "synchronized" },
      { input: "volatil", expected: "volatile" },
      { input: "volati", expected: "volatile" },
      { input: "volat", expected: "volatile" },
      { input: "vola", expected: "volatile" },
      { input: "transien", expected: "transient" },
      { input: "transie", expected: "transient" },
      { input: "transi", expected: "transient" },
      { input: "trans", expected: "transient" },
      { input: "tran", expected: "transient" },
      { input: "nativ", expected: "native" },
      { input: "nati", expected: "native" },
      { input: "strictf", expected: "strictfp" },
      { input: "strict", expected: "strictfp" },
      { input: "stric", expected: "strictfp" },
      { input: "stri", expected: "strictfp" },
    ];

    testCases.forEach(({ input, expected }) => {
      it(`should fix "${input}" to "${expected}"`, () => {
        const jsonInput = `{"${input}": "test"}`;
        const result = fixTruncatedPropertyNames(jsonInput);

        expect(result.changed).toBe(true);
        expect(result.content).toBe(`{"${expected}": "test"}`);
        expect(result.diagnostics).toContain(
          `Fixed truncated property name: ${input} -> ${expected}`,
        );
      });
    });
  });

  describe("edge cases", () => {
    it("should handle empty string", () => {
      const result = fixTruncatedPropertyNames("");

      expect(result.changed).toBe(false);
      expect(result.content).toBe("");
    });

    it("should handle non-JSON strings", () => {
      const input = "This is not JSON at all";
      const result = fixTruncatedPropertyNames(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should handle malformed JSON", () => {
      const input = '{"eferences": [], "broken": }';
      const result = fixTruncatedPropertyNames(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"references": [], "broken": }');
      expect(result.diagnostics).toContain(
        "Fixed truncated property name: eferences -> references",
      );
    });

    it("should handle nested objects", () => {
      const input = '{"outer": {"eferences": [], "integra": "test"}}';
      const result = fixTruncatedPropertyNames(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"outer": {"references": [], "integration": "test"}}');
      expect(result.diagnostics).toContain(
        "Fixed truncated property name: eferences -> references",
      );
      expect(result.diagnostics).toContain("Fixed truncated property name: integra -> integration");
    });

    it("should handle arrays with objects", () => {
      const input = '[{"eferences": []}, {"integra": "test"}]';
      const result = fixTruncatedPropertyNames(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('[{"references": []}, {"integration": "test"}]');
      expect(result.diagnostics).toContain(
        "Fixed truncated property name: eferences -> references",
      );
      expect(result.diagnostics).toContain("Fixed truncated property name: integra -> integration");
    });
  });

  describe("error handling", () => {
    it("should handle regex errors gracefully", () => {
      // Mock a regex that throws an error
      const originalReplace = String.prototype.replace;
      String.prototype.replace = jest.fn().mockImplementation(() => {
        throw new Error("Regex error");
      });

      const input = '{"eferences": []}';
      const result = fixTruncatedPropertyNames(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
      expect(result.diagnostics).toContain("Sanitizer failed: Error: Regex error");

      // Restore original method
      String.prototype.replace = originalReplace;
    });
  });

  describe("real-world scenarios", () => {
    it("should handle the actual error case from the log", () => {
      const input =
        '{"name": "CreditCardLocal", "kind": "INTERFACE", "namespace": "com.sun.j2ee.blueprints.creditcard.ejb.CreditCardLocal", "purpose": "This interface defines the local business contract", "implementation": "As an interface", "internalReferences": ["com.sun.j2ee.blueprints.creditcard.ejb.CreditCard"], "externalReferences": ["javax.ejb.EJBLocalObject"], "eferences": [], "publicConstants": [], "publicMethods": []}';
      const result = fixTruncatedPropertyNames(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"references": []');
      expect(result.content).not.toContain('"eferences": []');
      expect(result.diagnostics).toContain(
        "Fixed truncated property name: eferences -> references",
      );
    });

    it("should handle complex nested structures", () => {
      const input =
        '{"databaseIntegration": {"mechanism": "EJB", "name": "CreditCard EJB", "description": "This interface is the local contract", "databaseName": "not identifiable from code", "tablesAccessed": ["CreditCard"], "operationType": ["READ_WRITE"], "queryPatterns": "simple CRUD", "transactionHandling": "Container-Managed Transactions (CMT)", "protocol": "not identifiable from code", "connectionInfo": "not identifiable from code", "codeExample": "public interface CreditCardLocal extends javax.ejb.EJBLocalObject"}}';
      const result = fixTruncatedPropertyNames(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });
  });

  describe("missing opening quote in truncated property names", () => {
    it("should fix single character property names with missing opening quote", () => {
      const input = '{"codeSmells": []},\ne": "ServiceLocatorException"}';
      const result = fixTruncatedPropertyNames(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"codeSmells": []},\n"name": "ServiceLocatorException"}');
      expect(result.description).toBe("Fixed truncated property names");
      expect(result.diagnostics).toContain(
        'Fixed missing opening quote in truncated property: e" -> "name"',
      );
    });

    it("should fix the actual error scenario from the log file", () => {
      // This is the exact error scenario - "name" truncated to "e" with missing opening quote
      const input = `{
  "publicMethods": [
    {
      "name": "ServiceLocatorException",
      "purpose": "Constructor with message and exception",
      "codeSmells": []
    },
e": "ServiceLocatorException",
      "purpose": "Constructor with exception only"
    }
  ]
}`;

      const result = fixTruncatedPropertyNames(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"name": "ServiceLocatorException"');
      // Check that the broken pattern (e": at start of line or after delimiter) is not present
      // We can't use simple includes because "name" contains "e", so check for the specific malformed pattern
      const hasBrokenPattern = /([}\],\n]|^)\s*e":\s*"ServiceLocatorException"/.test(
        result.content,
      );
      expect(hasBrokenPattern).toBe(false);
      expect(result.diagnostics).toContain(
        'Fixed missing opening quote in truncated property: e" -> "name"',
      );
    });

    it("should handle single character 'n' truncation", () => {
      const input = '{"test": "value",\nn": "nameValue"}';
      const result = fixTruncatedPropertyNames(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"name": "nameValue"');
      expect(result.content).not.toContain('n": "nameValue"');
    });

    it("should not modify single characters that are not mapped", () => {
      const input = '{"test": "value",\nx": "unknownValue"}';
      const result = fixTruncatedPropertyNames(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should handle multiple missing opening quotes", () => {
      const input =
        '{\n  "prop1": "value1",\n  e": "name1",\n  "prop2": "value2",\n  n": "name2"\n}';
      const result = fixTruncatedPropertyNames(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"name": "name1"');
      expect(result.content).toContain('"name": "name2"');
      // Check that the broken patterns are not present (using regex to avoid false positives from "name" containing "e")
      const hasBrokenE = /([}\],\n]|^)\s*e":\s*"name1"/.test(result.content);
      const hasBrokenN = /([}\],\n]|^)\s*n":\s*"name2"/.test(result.content);
      expect(hasBrokenE).toBe(false);
      expect(hasBrokenN).toBe(false);
      expect(result.diagnostics?.length).toBeGreaterThanOrEqual(2);
    });

    it("should preserve whitespace when fixing", () => {
      const input = '    e": "value"';
      const result = fixTruncatedPropertyNames(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('    "name": "value"');
    });

    it("should handle both missing opening quote and regular truncation in same JSON", () => {
      const input = '{"eferences": [],\n  e": "ServiceLocator"}';
      const result = fixTruncatedPropertyNames(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"references": []');
      expect(result.content).toContain('"name": "ServiceLocator"');
      expect(result.diagnostics).toContain(
        "Fixed truncated property name: eferences -> references",
      );
      expect(result.diagnostics).toContain(
        'Fixed missing opening quote in truncated property: e" -> "name"',
      );
    });

    it('should fix missing opening quote and colon pattern e"value"', () => {
      const input = `{
  "codeSmells": []
},
e"disburseLoanWithExceededOverAppliedAmountSucceed",
  "purpose": "test"
}`;

      const result = fixTruncatedPropertyNames(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain(
        '"name": "disburseLoanWithExceededOverAppliedAmountSucceed"',
      );
      expect(result.content).not.toContain('e"disburseLoanWithExceededOverAppliedAmountSucceed"');
      expect(result.diagnostics).toBeDefined();
      expect(result.diagnostics?.some((d) => d.includes("missing opening quote and colon"))).toBe(
        true,
      );
    });

    it("should handle the exact error scenario from the log file", () => {
      const input = `    "codeSmells": []
  },
e"disburseLoanWithExceededOverAppliedAmountSucceed",
    "purpose": "This test case serves as the positive counterpart"`;

      const result = fixTruncatedPropertyNames(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain(
        '"name": "disburseLoanWithExceededOverAppliedAmountSucceed"',
      );
      expect(result.content).not.toContain('e"disburseLoanWithExceededOverAppliedAmountSucceed"');
    });

    it("should fix multiple instances of missing quote and colon", () => {
      const input = `{
  e"value1",
  "prop2": "test",
  e"value2",
}`;

      const result = fixTruncatedPropertyNames(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"name": "value1"');
      expect(result.content).toContain('"name": "value2"');
      expect(result.diagnostics?.length).toBeGreaterThanOrEqual(2);
    });

    it("should preserve whitespace when fixing missing quote and colon", () => {
      const input = `    e"value",
`;

      const result = fixTruncatedPropertyNames(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe(`    "name": "value",
`);
    });

    it("should not modify if pattern doesn't match known property name", () => {
      const input = `{
  x"unknownValue",
}`;

      const result = fixTruncatedPropertyNames(input);

      // 'x' is not in the singleCharMappings, so should not be fixed
      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });
  });
});
