import { fixHeuristicJsonErrors } from "../../../../src/llm/json-processing/sanitizers/index.js";

describe("fixHeuristicJsonErrors", () => {
  describe("Pattern 3: Text appearing outside string values", () => {
    it("should remove descriptive text after string value with punctuation", () => {
      const input = `{
  "externalReferences": [
    "java.util.Map",
 tribulations.
  ]
}`;

      const result = fixHeuristicJsonErrors(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"java.util.Map"');
      // The pattern should attempt to fix it - if changed, verify it's closer to valid
      if (result.changed) {
        expect(result.content).not.toContain("tribulations");
      }
    });

    it("should remove descriptive text after string value", () => {
      const input = `{
  "internalReferences": [
    "org.apache.fineract.portfolio.savings.domain.SavingsAccount",
from the API layer
    "org.apache.fineract.portfolio.savings.domain.SavingsProduct"
  ]
}`;

      const result = fixHeuristicJsonErrors(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain(
        '"org.apache.fineract.portfolio.savings.domain.SavingsAccount",',
      );
      expect(result.content).not.toContain("from the API layer");
      expect(() => JSON.parse(result.content)).not.toThrow();
    });
  });

  describe("Pattern 4d: _llm_thought text after JSON structure", () => {
    it("should remove _llm_thought text appearing after closing brace", () => {
      const input = `{
  "name": "TestClass",
  "kind": "CLASS"
}
_llm_thought: The user wants me to act as a senior developer and analyze the provided Java code.`;

      const result = fixHeuristicJsonErrors(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"kind": "CLASS"\n}');
      expect(result.content).not.toContain("_llm_thought");
      expect(() => JSON.parse(result.content)).not.toThrow();
    });
  });

  describe("Pattern 4e: Text before property after closing brace", () => {
    it("should remove stray text 'so' before property after closing brace", () => {
      const input = `{
  "databaseIntegration": {
    "tablesAccessed": []
  },
so    "connectionInfo": "n/a"
}`;

      const result = fixHeuristicJsonErrors(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"connectionInfo": "n/a"');
      expect(result.content).not.toContain('so    "connectionInfo"');
      expect(() => JSON.parse(result.content)).not.toThrow();
    });
  });

  describe("Pattern 8: Missing opening quotes before property names", () => {
    it("should fix missing opening quote before cyclomaticComplexity", () => {
      const input = `{
  "publicMethods": [
    {
      "name": "testMethod",
      "description": "Test description",
      cyclomaticComplexity": 2,
      "linesOfCode": 10
    }
  ]
}`;

      const result = fixHeuristicJsonErrors(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"cyclomaticComplexity": 2');
      // Check that there's no standalone cyclomaticComplexity": (without quote before it in property position)
      expect(result.content).not.toMatch(/([{,]\s*)cyclomaticComplexity":/);
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should fix missing opening quote before other property names", () => {
      const input = `{
  "name": "TestClass",
  returnType": "void",
  "kind": "CLASS"
}`;

      const result = fixHeuristicJsonErrors(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"returnType": "void"');
      // Check that there's no standalone returnType": (without quote before it in property position)
      expect(result.content).not.toMatch(/([{,]\s*)returnType":/);
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should fix missing opening quote before cyclomaticComplexity after quoted description", () => {
      // This matches the exact scenario from error log response-error-2025-12-01T16-29-45-524Z.log
      const input = `{
  "publicMethods": [
    {
      "name": "saleActiveLoanToExternalAssetOwnerAndBuybackADayLater",
      "purpose": "Tests the standard 'happy path' scenario",
      "parameters": [],
      "returnType": "void",
      "description": "Within a try-finally block, the test creates a client and a loan. It initiates a sale transfer and validates its initial PENDING state. It then advances the business date and executes the 'Loan COB' job. It asserts that the sale is now ACTIVE and that the corresponding journal entries have been posted. Next, it initiates a buyback transfer. It makes a small repayment to the loan. It advances the business date and runs COB again, then validates that the buyback has been successfully executed and the buyback-related journal entries are correct.",
      cyclomaticComplexity": 2,
      "linesOfCode": 69,
      "codeSmells": [
        "LONG METHOD"
      ]
    }
  ]
}`;

      const result = fixHeuristicJsonErrors(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"cyclomaticComplexity": 2');
      expect(result.content).not.toMatch(/([{,]\s*)cyclomaticComplexity":/);
      expect(() => JSON.parse(result.content)).not.toThrow();
    });
  });

  describe("Pattern 9: Corrupted text like },ce or e-12,", () => {
    it("should remove corrupted text },ce", () => {
      const input = `{
  "publicMethods": [
    {
      "name": "method1",
      "codeSmells": []
    },ce
    {
      "name": "method2",
      "codeSmells": []
    }
  ]
}`;

      const result = fixHeuristicJsonErrors(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain("    },");
      expect(result.content).not.toContain("},ce");
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should remove corrupted text },ce after method object (exact error log scenario)", () => {
      // This matches the exact scenario from error log response-error-2025-12-01T16-29-45-524Z.log line 140
      const input = `{
  "publicMethods": [
    {
      "name": "saleIsDeclinedWhenLoanIsCancelled",
      "purpose": "Tests the scenario where a pending loan sale is automatically declined",
      "parameters": [],
      "returnType": "void",
      "description": "A client and loan are created. A sale is initiated with a future settlement date. Before the settlement date arrives, the business date is advanced and the loan is written off. The test then retrieves the transfer history for the loan and validates that it contains both the original PENDING transfer and a new system-generated DECLINED transfer, asserting the correct status and sub-status ('BALANCE_ZERO').",
      "cyclomaticComplexity": 1,
      "linesOfCode": 13,
      "codeSmells": []
    },ce
    {
      "name": "buybackIsExecutedWhenLoanIsCancelled",
      "purpose": "Verifies that a pending buyback is correctly executed"
    }
  ]
}`;

      const result = fixHeuristicJsonErrors(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain("    },");
      expect(result.content).not.toContain("},ce");
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should remove corrupted text e-12,", () => {
      const input = `{
  "publicMethods": [
    {
      "name": "method1",
      "codeSmells": []
    },
e-12,
    {
      "name": "method2",
      "codeSmells": []
    }
  ]
}`;

      const result = fixHeuristicJsonErrors(input);

      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("e-12,");
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should remove corrupted text e-12, and orphaned codeSmells property (exact error log scenario)", () => {
      // This matches the exact scenario from error logs response-error-2025-12-01T16-30-40-763Z.log and response-error-2025-12-01T16-33-47-367Z.log
      const input = `{
  "publicMethods": [
    {
      "name": "validateAndReject",
      "purpose": "This method handles the rejection",
      "parameters": [],
      "returnType": "Map<String, Object>",
      "description": "The method retrieves the currently authenticated user",
      "cyclomaticComplexity": 1,
      "linesOfCode": 6,
      "codeSmells": []
    },
e-12,
      "codeSmells": []
    },
    {
      "name": "validateAndActivate",
      "purpose": "This method validates and processes the activation"
    }
  ]
}`;

      const result = fixHeuristicJsonErrors(input);

      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("e-12,");
      expect(result.content).not.toMatch(/},\s*\n\s*"codeSmells"/);
      expect(() => JSON.parse(result.content)).not.toThrow();
      const parsed = JSON.parse(result.content);
      expect(parsed.publicMethods.length).toBe(2);
    });
  });

  describe("Pattern 10: to be continued... text", () => {
    it("should remove 'to be continued...' text", () => {
      const input = `{
  "publicMethods": [
    {
      "name": "method1",
      "codeSmells": []
    },
to be continued...
    {
      "name": "method2",
      "codeSmells": []
    }
  ]
}`;

      const result = fixHeuristicJsonErrors(input);

      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("to be continued");
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should remove 'to be conti...' text (truncated)", () => {
      const input = `{
  "publicMethods": [
    {
      "name": "method1",
      "codeSmells": []
    },
to be conti...
    {
      "name": "method2",
      "codeSmells": []
    }
  ]
}`;

      const result = fixHeuristicJsonErrors(input);

      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("to be conti");
      expect(() => JSON.parse(result.content)).not.toThrow();
    });
  });

  describe("Pattern 11: extra_thoughts and extra_text properties", () => {
    it("should remove extra_thoughts property with object value", () => {
      const input = `{
  "internalReferences": [
    "org.apache.fineract.infrastructure.bulkimport.populator.AbstractWorkbookPopulator"
  ],
extra_thoughts: {
The user wants me to act as a senior developer and analyze a Java code file.
I need to produce a JSON output that conforms to a very specific schema.
},
  "externalReferences": []
}`;

      const result = fixHeuristicJsonErrors(input);

      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("extra_thoughts");
      expect(result.content).toContain('"externalReferences"');
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should remove extra_text property with string value", () => {
      const input = `{
  "internalReferences": [
    "org.apache.fineract.infrastructure.core.data.EnumOptionData"
  ],
extra_text: "  \\"externalReferences\\": []",
  "externalReferences": []
}`;

      const result = fixHeuristicJsonErrors(input);

      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("extra_text");
      expect(result.content).toContain('"externalReferences"');
      expect(() => JSON.parse(result.content)).not.toThrow();
    });
  });
});
