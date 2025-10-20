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
});
