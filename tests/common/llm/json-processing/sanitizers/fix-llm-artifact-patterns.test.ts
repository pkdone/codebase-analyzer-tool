import { fixLlmArtifactPatterns } from "../../../../../src/common/llm/json-processing/sanitizers/index";

describe("fixLlmArtifactPatterns", () => {
  describe("Pattern 0: Property name typos (trailing underscores)", () => {
    it("should fix property names ending with single underscore", () => {
      const input = `{
  "publicFunctions": [
    {
      "name": "testMethod",
      "type_": "string",
      "description": "Test method"
    }
  ]
}`;

      const result = fixLlmArtifactPatterns(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"type": "string"');
      expect(result.content).not.toContain('"type_":');
      expect(() => JSON.parse(result.content)).not.toThrow();
      const parsed = JSON.parse(result.content);
      expect(parsed.publicFunctions[0]).toHaveProperty("type");
      expect(parsed.publicFunctions[0]).not.toHaveProperty("type_");
    });

    it("should fix multiple property names with trailing underscores", () => {
      const input = `{
  "name_": "test",
  "type_": "string",
  "value_": 123
}`;

      const result = fixLlmArtifactPatterns(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"name": "test"');
      expect(result.content).toContain('"type": "string"');
      expect(result.content).toContain('"value": 123');
      expect(result.content).not.toContain('_":');
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should fix property names with double underscores", () => {
      const input = `{
  "name__": "test"
}`;

      const result = fixLlmArtifactPatterns(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"name": "test"');
      expect(result.content).not.toContain('"name__":');
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should not modify property names without trailing underscores", () => {
      const input = `{
  "name": "test",
  "type": "string"
}`;

      const result = fixLlmArtifactPatterns(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should not modify underscores in string values", () => {
      const input = `{
  "name": "test_value",
  "type": "string_"
}`;

      const result = fixLlmArtifactPatterns(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should handle nested objects with property name typos", () => {
      const input = `{
  "outer": {
    "inner_": "value"
  }
}`;

      const result = fixLlmArtifactPatterns(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"inner": "value"');
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should handle arrays of objects with property name typos", () => {
      const input = `{
  "items": [
    {"name_": "item1"},
    {"name_": "item2"}
  ]
}`;

      const result = fixLlmArtifactPatterns(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"name": "item1"');
      expect(result.content).toContain('"name": "item2"');
      expect(() => JSON.parse(result.content)).not.toThrow();
    });
  });

  describe("Pattern 3: Text appearing outside string values", () => {
    it("should remove descriptive text after string value with punctuation", () => {
      const input = `{
  "externalReferences": [
    "java.util.Map",
 tribulations.
  ]
}`;

      const result = fixLlmArtifactPatterns(input);

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

      const result = fixLlmArtifactPatterns(input);

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

      const result = fixLlmArtifactPatterns(input);

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

      const result = fixLlmArtifactPatterns(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"connectionInfo": "n/a"');
      expect(result.content).not.toContain('so    "connectionInfo"');
      expect(() => JSON.parse(result.content)).not.toThrow();
    });
  });

  describe("Pattern 8: Missing opening quotes before property names", () => {
    it("should fix missing opening quote before cyclomaticComplexity", () => {
      const input = `{
  "publicFunctions": [
    {
      "name": "testMethod",
      "description": "Test description",
      cyclomaticComplexity": 2,
      "linesOfCode": 10
    }
  ]
}`;

      const result = fixLlmArtifactPatterns(input);

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

      const result = fixLlmArtifactPatterns(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"returnType": "void"');
      // Check that there's no standalone returnType": (without quote before it in property position)
      expect(result.content).not.toMatch(/([{,]\s*)returnType":/);
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should fix missing opening quote before cyclomaticComplexity after quoted description", () => {
      // This matches the exact scenario from error log response-error-2025-12-01T16-29-45-524Z.log
      const input = `{
  "publicFunctions": [
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

      const result = fixLlmArtifactPatterns(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"cyclomaticComplexity": 2');
      expect(result.content).not.toMatch(/([{,]\s*)cyclomaticComplexity":/);
      expect(() => JSON.parse(result.content)).not.toThrow();
    });
  });

  describe("Pattern 9: Corrupted text like },ce or e-12,", () => {
    it("should remove corrupted text },ce", () => {
      const input = `{
  "publicFunctions": [
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

      const result = fixLlmArtifactPatterns(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain("    },");
      expect(result.content).not.toContain("},ce");
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should remove corrupted text },ce after method object (exact error log scenario)", () => {
      // This matches the exact scenario from error log response-error-2025-12-01T16-29-45-524Z.log line 140
      const input = `{
  "publicFunctions": [
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

      const result = fixLlmArtifactPatterns(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain("    },");
      expect(result.content).not.toContain("},ce");
      expect(() => JSON.parse(result.content)).not.toThrow();
    });
  });

  describe("Pattern 10: to be continued... text", () => {
    it("should remove 'to be continued...' text", () => {
      const input = `{
  "publicFunctions": [
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

      const result = fixLlmArtifactPatterns(input);

      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("to be continued");
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should remove 'to be conti...' text (truncated)", () => {
      const input = `{
  "publicFunctions": [
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

      const result = fixLlmArtifactPatterns(input);

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

      const result = fixLlmArtifactPatterns(input);

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

      const result = fixLlmArtifactPatterns(input);

      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("extra_text");
      expect(result.content).toContain('"externalReferences"');
      expect(() => JSON.parse(result.content)).not.toThrow();
    });
  });

  describe("Generalized patterns - new improvements", () => {
    describe("Pattern 1: Generalized corruption marker detection", () => {
      it("should remove array entry starting with 'another' (generalized corruption marker)", () => {
        const input = `{
  "externalReferences": [
    "org.apache.fineract.portfolio.savings.domain.SavingsAccount",
    another.persistence.Version",
    "org.apache.fineract.portfolio.savings.domain.SavingsProduct"
  ]
}`;

        const result = fixLlmArtifactPatterns(input);

        expect(result.changed).toBe(true);
        expect(result.content).toContain(
          '"org.apache.fineract.portfolio.savings.domain.SavingsAccount",',
        );
        expect(result.content).not.toContain("another.persistence");
        expect(() => JSON.parse(result.content)).not.toThrow();
      });

      it("should remove array entry starting with 'second' (generalized corruption marker)", () => {
        const input = `{
  "externalReferences": [
    "org.apache.fineract.portfolio.savings.domain.SavingsAccount",
    "second.persistence.Version",
    "org.apache.fineract.portfolio.savings.domain.SavingsProduct"
  ]
}`;

        const result = fixLlmArtifactPatterns(input);

        expect(result.changed).toBe(true);
        expect(result.content).toContain(
          '"org.apache.fineract.portfolio.savings.domain.SavingsAccount",',
        );
        expect(result.content).not.toContain("second.persistence");
        expect(() => JSON.parse(result.content)).not.toThrow();
      });

      it("should remove array entry starting with 'additional' (generalized corruption marker)", () => {
        const input = `{
  "externalReferences": [
    "org.apache.fineract.portfolio.savings.domain.SavingsAccount",
    "additional.persistence.Version",
    "org.apache.fineract.portfolio.savings.domain.SavingsProduct"
  ]
}`;

        const result = fixLlmArtifactPatterns(input);

        expect(result.changed).toBe(true);
        expect(result.content).toContain(
          '"org.apache.fineract.portfolio.savings.domain.SavingsAccount",',
        );
        expect(result.content).not.toContain("additional.persistence");
        expect(() => JSON.parse(result.content)).not.toThrow();
      });
    });

    describe("Pattern 2: Generic truncated property name detection", () => {
      it("should quote generic truncated property name when not in COMMON_PROPERTY_STARTS", () => {
        const input = `{
  "name": "TestClass",
  abcd": "some value",
  "kind": "CLASS"
}`;

        const result = fixLlmArtifactPatterns(input);

        expect(result.changed).toBe(true);
        expect(result.content).toContain('"abcd": "some value"');
        // The pattern should have fixed it, so the unfixed version should not exist
        const unfixedPattern = /[{,]\s*abcd":/;
        expect(result.content).not.toMatch(unfixedPattern);
        expect(() => JSON.parse(result.content)).not.toThrow();
      });

      it("should use COMMON_PROPERTY_STARTS mapping when available (schema-specific fallback)", () => {
        const input = `{
  "name": "TestClass",
  se": "some purpose value",
  "kind": "CLASS"
}`;

        // Pass config with property name mappings (COMMON_PROPERTY_STARTS)
        const config = {
          propertyNameMappings: { se: "purpose" },
        };
        const result = fixLlmArtifactPatterns(input, config);

        expect(result.changed).toBe(true);
        expect(result.content).toContain('"purpose": "some purpose value"');
        // The pattern should have fixed it using COMMON_PROPERTY_STARTS, so the unfixed version should not exist
        const unfixedPattern = /[{,]\s*se":/;
        expect(result.content).not.toMatch(unfixedPattern);
        expect(() => JSON.parse(result.content)).not.toThrow();
      });
    });

    describe("Pattern 3: Generalized descriptive text detection", () => {
      it("should remove descriptive text starting with 'since' (generalized pattern)", () => {
        const input = `{
  "internalReferences": [
    "org.apache.fineract.portfolio.savings.domain.SavingsAccount",
since it is used in the API layer
    "org.apache.fineract.portfolio.savings.domain.SavingsProduct"
  ]
}`;

        const result = fixLlmArtifactPatterns(input);

        expect(result.changed).toBe(true);
        expect(result.content).toContain(
          '"org.apache.fineract.portfolio.savings.domain.SavingsAccount",',
        );
        expect(result.content).not.toContain("since it is used");
        expect(() => JSON.parse(result.content)).not.toThrow();
      });

      it("should remove descriptive text starting with 'as' (generalized pattern)", () => {
        const input = `{
  "internalReferences": [
    "org.apache.fineract.portfolio.savings.domain.SavingsAccount",
as this class is part of the domain model
    "org.apache.fineract.portfolio.savings.domain.SavingsProduct"
  ]
}`;

        const result = fixLlmArtifactPatterns(input);

        expect(result.changed).toBe(true);
        expect(result.content).toContain(
          '"org.apache.fineract.portfolio.savings.domain.SavingsAccount",',
        );
        expect(result.content).not.toContain("as this class");
        expect(() => JSON.parse(result.content)).not.toThrow();
      });
    });

    describe("Pattern 4: Generalized commentary text detection", () => {
      it("should remove text containing 'I shall' (generalized first-person pattern)", () => {
        const input = `{
  "name": "TestClass",
  "kind": "CLASS"
}
I shall continue with the analysis here.`;

        const result = fixLlmArtifactPatterns(input);

        expect(result.changed).toBe(true);
        expect(result.content).toContain('"kind": "CLASS"\n}');
        expect(result.content).not.toContain("I shall");
        expect(() => JSON.parse(result.content)).not.toThrow();
      });

      it("should remove text containing 'I can' (generalized first-person pattern)", () => {
        const input = `{
  "name": "TestClass",
  "kind": "CLASS"
}
I can see that this is a complex class.`;

        const result = fixLlmArtifactPatterns(input);

        expect(result.changed).toBe(true);
        expect(result.content).toContain('"kind": "CLASS"\n}');
        expect(result.content).not.toContain("I can");
        expect(() => JSON.parse(result.content)).not.toThrow();
      });
    });

    describe("Pattern 7: Generalized preposition/conjunction detection in arrays", () => {
      it("should remove stray text starting with 'after' (generalized preposition)", () => {
        const input = `{
  "externalReferences": [
    "org.apache.fineract.portfolio.savings.domain.SavingsAccount",
after the initial setup is complete
    "org.apache.fineract.portfolio.savings.domain.SavingsProduct"
  ]
}`;

        const result = fixLlmArtifactPatterns(input);

        expect(result.changed).toBe(true);
        expect(result.content).toContain(
          '"org.apache.fineract.portfolio.savings.domain.SavingsAccount",',
        );
        expect(result.content).not.toContain("after the initial");
        expect(() => JSON.parse(result.content)).not.toThrow();
      });

      it("should remove stray text starting with 'during' (generalized preposition)", () => {
        const input = `{
  "externalReferences": [
    "org.apache.fineract.portfolio.savings.domain.SavingsAccount",
during the execution phase
    "org.apache.fineract.portfolio.savings.domain.SavingsProduct"
  ]
}`;

        const result = fixLlmArtifactPatterns(input);

        expect(result.changed).toBe(true);
        expect(result.content).toContain(
          '"org.apache.fineract.portfolio.savings.domain.SavingsAccount",',
        );
        expect(result.content).not.toContain("during the execution");
        expect(() => JSON.parse(result.content)).not.toThrow();
      });

      it("should remove stray text starting with 'provided' (generalized conjunction)", () => {
        const input = `{
  "externalReferences": [
    "org.apache.fineract.portfolio.savings.domain.SavingsAccount",
provided that the conditions are met
    "org.apache.fineract.portfolio.savings.domain.SavingsProduct"
  ]
}`;

        const result = fixLlmArtifactPatterns(input);

        expect(result.changed).toBe(true);
        expect(result.content).toContain(
          '"org.apache.fineract.portfolio.savings.domain.SavingsAccount",',
        );
        expect(result.content).not.toContain("provided that");
        expect(() => JSON.parse(result.content)).not.toThrow();
      });
    });

    describe("Pattern 4e: Generalized short word detection", () => {
      it("should remove short stray word 'the' before property (structural detection)", () => {
        const input = `{
  "databaseIntegration": {
    "tablesAccessed": []
  },
the    "connectionInfo": "n/a"
}`;

        const result = fixLlmArtifactPatterns(input);

        // 'the' is a short lowercase word (3 chars) outside of string context
        // It should be removed as stray text since structural context ensures we're not in a string
        // Only JSON keywords (true, false, null, undefined) are preserved
        expect(result.changed).toBe(true);
        expect(result.content).not.toContain("the    ");
        expect(result.content).toContain('"connectionInfo"');
        expect(() => JSON.parse(result.content)).not.toThrow();
      });

      it("should NOT remove JSON keywords before properties", () => {
        const input = `{
  "databaseIntegration": {
    "tablesAccessed": []
  },
true    "connectionInfo": "n/a"
}`;

        const result = fixLlmArtifactPatterns(input);

        // JSON keywords should never be removed even though they're short
        expect(result.content).toContain("true");
      });
    });

    describe("Pattern 9e: LLM mid-JSON commentary (Next, I will...)", () => {
      it("should remove 'Next, I will analyze...' commentary between properties", () => {
        const input = `{
  "name": "TestClass",
  "kind": "CLASS",
Next, I will analyze the methods in this class.
  "publicFunctions": []
}`;

        const result = fixLlmArtifactPatterns(input);

        expect(result.changed).toBe(true);
        expect(result.content).not.toContain("Next, I will");
        expect(result.content).toContain('"publicFunctions"');
        expect(() => JSON.parse(result.content)).not.toThrow();
      });

      it("should remove 'Let me continue...' commentary between properties", () => {
        const input = `{
  "name": "TestClass",
  "kind": "CLASS",
Let me continue analyzing the remaining methods.
  "publicFunctions": []
}`;

        const result = fixLlmArtifactPatterns(input);

        expect(result.changed).toBe(true);
        expect(result.content).not.toContain("Let me continue");
        expect(result.content).toContain('"publicFunctions"');
        expect(() => JSON.parse(result.content)).not.toThrow();
      });

      it("should remove 'Now let me...' commentary between JSON structures", () => {
        const input = `{
  "methods": [
    {
      "name": "method1",
      "returnType": "void"
    }
  ],
Now let me add the remaining methods.
  "externalReferences": []
}`;

        const result = fixLlmArtifactPatterns(input);

        expect(result.changed).toBe(true);
        expect(result.content).not.toContain("Now let me");
        expect(result.content).toContain('"externalReferences"');
        expect(() => JSON.parse(result.content)).not.toThrow();
      });
    });

    describe("Pattern 9h: Extended stray character patterns (2-4 chars)", () => {
      it("should remove 'ano' (3-char stray text) before property", () => {
        const input = `{
  "methods": [
    {
      "name": "method1"
    }
],
ano
  "purpose": "test purpose"
}`;

        const result = fixLlmArtifactPatterns(input);

        expect(result.changed).toBe(true);
        expect(result.content).not.toContain("ano");
        expect(result.content).toContain('"purpose"');
      });

      it("should remove 'abcd' (4-char stray text) before property", () => {
        const input = `{
  "data": {}
},
abcd
  "nextProperty": "value"
}`;

        const result = fixLlmArtifactPatterns(input);

        expect(result.changed).toBe(true);
        expect(result.content).not.toContain("abcd");
        expect(result.content).toContain('"nextProperty"');
      });

      it("should NOT remove JSON keywords like 'true' or 'null'", () => {
        // This test verifies that JSON keywords are preserved
        const input = `{
  "enabled": true,
  "data": null
}`;

        const result = fixLlmArtifactPatterns(input);

        // Should not change valid JSON
        expect(result.changed).toBe(false);
        expect(result.content).toContain("true");
        expect(result.content).toContain("null");
      });
    });
  });
});
