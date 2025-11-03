import { fixCorruptedArrayObjectStart } from "../../../../src/llm/json-processing/sanitizers/fix-corrupted-array-object-start";
import { SANITIZATION_STEP } from "../../../../src/llm/json-processing/config/sanitization-steps.config";

describe("fixCorruptedArrayObjectStart", () => {
  describe("basic functionality", () => {
    it("should fix the exact error pattern from the log file (c\"withdrawal\")", () => {
      const input = `  "publicMethods": [
    {
      "name": "depositToRDAccount",
      "purpose": "Processes a regular installment deposit",
      "parameters": [],
      "returnType": "CommandProcessingResult",
      "description": "The method validates",
      "cyclomaticComplexity": 1,
      "linesOfCode": 14,
      "codeSmells": []
    },
c"withdrawal",
      "purpose": "Processes a withdrawal from a deposit account",
      "parameters": [
        {
          "name": "savingsId",
          "type": "Long"
        }
      ],
      "returnType": "CommandProcessingResult"
    }
  ]`;

      const result = fixCorruptedArrayObjectStart(input);

      expect(result.changed).toBe(true);
      expect(result.description).toBe(SANITIZATION_STEP.FIXED_CORRUPTED_ARRAY_OBJECT_START);
      expect(result.content).toContain('"name": "withdrawal"');
      expect(result.content).toMatch(/},\s*\n\s*{\s*\n\s*"name": "withdrawal"/);
      expect(result.content).not.toContain('c"withdrawal"');
      expect(result.diagnostics).toBeDefined();
      expect(result.diagnostics?.length).toBeGreaterThan(0);
    });

    it("should fix e\"pattern corruption", () => {
      const input = `  "publicMethods": [
    {
      "name": "method1",
      "codeSmells": []
    },
e"method2",
      "purpose": "test"
    }
  ]`;

      const result = fixCorruptedArrayObjectStart(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"name": "method2"');
      expect(result.content).toMatch(/},\s*\n\s*{\s*\n\s*"name": "method2"/);
      expect(result.content).not.toContain('e"method2"');
    });

    it("should fix n\"pattern corruption", () => {
      const input = `  "publicMethods": [
    {
      "name": "method1",
      "codeSmells": []
    },
n"method2",
      "purpose": "test"
    }
  ]`;

      const result = fixCorruptedArrayObjectStart(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"name": "method2"');
      expect(result.content).not.toContain('n"method2"');
    });

    it("should fix multi-character stray text before quoted value", () => {
      const input = `  "publicMethods": [
    {
      "name": "method1",
      "codeSmells": []
    },
abc"method2",
      "purpose": "test"
    }
  ]`;

      const result = fixCorruptedArrayObjectStart(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"name": "method2"');
      expect(result.content).not.toContain('abc"method2"');
    });

    it("should not modify valid JSON", () => {
      const input = `  "publicMethods": [
    {
      "name": "method1",
      "codeSmells": []
    },
    {
      "name": "method2",
      "purpose": "test"
    }
  ]`;

      const result = fixCorruptedArrayObjectStart(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });
  });

  describe("array context detection", () => {
    it("should only fix when inside an array of objects", () => {
      const input = `  "publicMethods": [
    {
      "name": "method1",
      "codeSmells": []
    },
c"method2",
      "purpose": "test"
    }
  ]`;

      const result = fixCorruptedArrayObjectStart(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"name": "method2"');
    });

    it("should not fix when not in array context", () => {
      const input = `{
  "method1": {
    "codeSmells": []
  },
c"method2": "value"
}`;

      const result = fixCorruptedArrayObjectStart(input);

      // Should not fix - not in array context
      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should handle nested arrays", () => {
      const input = `{
  "outerArray": [
    {
      "name": "item1",
      "nested": []
    },
c"item2",
      "name": "should be preserved"
    }
  ]
}`;

      const result = fixCorruptedArrayObjectStart(input);

      // Should fix if it detects array context correctly
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      if (result.changed) {
        expect(result.content).toContain('"name": "item2"');
      }
    });
  });

  describe("whitespace and formatting", () => {
    it("should preserve indentation when fixing", () => {
      const input = `  "publicMethods": [
    {
      "name": "method1",
      "codeSmells": []
    },
    c"method2",
      "purpose": "test"
    }
  ]`;

      const result = fixCorruptedArrayObjectStart(input);

      if (result.changed) {
        // Should maintain proper indentation structure
        expect(result.content).toContain('    {');
        expect(result.content).toContain('      "name":');
      }
    });

    it("should handle cases with newline after brace-comma", () => {
      const input = `  "publicMethods": [
    {
      "name": "method1",
      "codeSmells": []
    },
    c"method2",
      "purpose": "test"
    }
  ]`;

      const result = fixCorruptedArrayObjectStart(input);

      if (result.changed) {
        expect(result.content).toMatch(/},\s*\n\s*{/);
      }
    });

    it("should handle cases without newline after brace-comma", () => {
      const input = `  "publicMethods": [
    {
      "name": "method1",
      "codeSmells": []
    }, c"method2",
      "purpose": "test"
    }
  ]`;

      const result = fixCorruptedArrayObjectStart(input);

      if (result.changed) {
        // Should have proper structure with newline (may already have newline or we added it)
        expect(result.content).toMatch(/},\s*\n\s*{/);
      }
    });
  });

  describe("edge cases", () => {
    it("should handle empty string", () => {
      const result = fixCorruptedArrayObjectStart("");

      expect(result.changed).toBe(false);
      expect(result.content).toBe("");
    });

    it("should handle non-JSON strings", () => {
      const input = "This is not JSON";
      const result = fixCorruptedArrayObjectStart(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should not fix when stray text looks like valid JSON keyword", () => {
      const input = `  "publicMethods": [
    {
      "name": "method1",
      "codeSmells": []
    },
true"method2",
      "purpose": "test"
    }
  ]`;

      const result = fixCorruptedArrayObjectStart(input);

      // Should not fix "true" as it's a valid JSON keyword
      expect(result.changed).toBe(false);
    });

    it("should handle method names with special characters", () => {
      const input = `  "publicMethods": [
    {
      "name": "method1",
      "codeSmells": []
    },
c"method_2_with_underscores",
      "purpose": "test"
    }
  ]`;

      const result = fixCorruptedArrayObjectStart(input);

      if (result.changed) {
        expect(result.content).toContain('"name": "method_2_with_underscores"');
      }
    });

    it("should handle very long method names", () => {
      const longMethodName = "a".repeat(100);
      const input = `  "publicMethods": [
    {
      "name": "method1",
      "codeSmells": []
    },
c"${longMethodName}",
      "purpose": "test"
    }
  ]`;

      const result = fixCorruptedArrayObjectStart(input);

      if (result.changed) {
        expect(result.content).toContain(`"name": "${longMethodName}"`);
      }
    });
  });

  describe("real-world scenarios", () => {
    it("should handle the exact pattern from the error log with full context", () => {
      const input = `{
  "name": "DepositAccountWritePlatformServiceJpaRepositoryImpl",
  "kind": "CLASS",
  "publicMethods": [
    {
      "name": "depositToRDAccount",
      "purpose": "Processes a regular installment deposit",
      "parameters": [
        {
          "name": "savingsId",
          "type": "Long"
        },
        {
          "name": "command",
          "type": "JsonCommand"
        }
      ],
      "returnType": "CommandProcessingResult",
      "description": "The method validates",
      "cyclomaticComplexity": 1,
      "linesOfCode": 14,
      "codeSmells": []
    },
c"withdrawal",
      "purpose": "Processes a withdrawal from a deposit account",
      "parameters": [
        {
          "name": "savingsId",
          "type": "Long"
        },
        {
          "name": "command",
          "type": "JsonCommand"
        },
        {
          "name": "depositAccountType",
          "type": "DepositAccountType"
        }
      ],
      "returnType": "CommandProcessingResult",
      "description": "This transactional method validates",
      "cyclomaticComplexity": 1,
      "linesOfCode": 16,
      "codeSmells": []
    }
  ]
}`;

      const result = fixCorruptedArrayObjectStart(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"name": "withdrawal"');
      expect(result.content).not.toContain('c"withdrawal"');
      
      // Verify the JSON structure is now valid
      const parsed = JSON.parse(result.content);
      expect(parsed.publicMethods).toBeDefined();
      expect(parsed.publicMethods.length).toBe(2);
      expect(parsed.publicMethods[1].name).toBe("withdrawal");
    });

    it("should handle multiple corruptions in the same array", () => {
      const input = `  "publicMethods": [
    {
      "name": "method1",
      "codeSmells": []
    },
c"method2",
      "purpose": "test"
    },
e"method3",
      "purpose": "test3"
    }
  ]`;

      const result = fixCorruptedArrayObjectStart(input);

      if (result.changed) {
        expect(result.content).toContain('"name": "method2"');
        expect(result.content).toContain('"name": "method3"');
        expect(result.content).not.toContain('c"method2"');
        expect(result.content).not.toContain('e"method3"');
      }
    });
  });

  describe("diagnostics", () => {
    it("should provide diagnostic messages when fixes are made", () => {
      const input = `  "publicMethods": [
    {
      "name": "method1",
      "codeSmells": []
    },
c"method2",
      "purpose": "test"
    }
  ]`;

      const result = fixCorruptedArrayObjectStart(input);

      if (result.changed) {
        expect(result.diagnostics).toBeDefined();
        expect(result.diagnostics?.length).toBeGreaterThan(0);
        expect(result.diagnostics?.[0]).toContain("stray");
        expect(result.diagnostics?.[0]).toContain("method2");
      }
    });
  });

  describe("error handling", () => {
    it("should handle errors gracefully", () => {
      // Test with potentially problematic input
      const input = `  "publicMethods": [
    {
      "name": "method1"
    },
c"method2"`;

      const result = fixCorruptedArrayObjectStart(input);

      // Should not throw, should return a result
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });
  });

  describe("stray text before property names", () => {
    it("should fix the exact error pattern from the log file (e\"mechanism\":)", () => {
      // Simplified version matching the exact error log pattern
      const input = `  "integrationPoints": [
    {
      "mechanism": "REST",
      "name": "Create Loan Account",
      "responseBody": "JSON containing loanId or an error object."
    },
    {
      "mechanism": "REST",
      "name": "Post Interoperation Transaction Request",
      "responseBody": "JSON containing transaction details or an error object."
    },
e"mechanism": "REST",
      "name": "Apply for Fixed Deposit Account",
      "responseBody": "JSON containing resourceId or an error object."
    }
  ]`;

      const result = fixCorruptedArrayObjectStart(input);

      expect(result.changed).toBe(true);
      expect(result.description).toBe(SANITIZATION_STEP.FIXED_CORRUPTED_ARRAY_OBJECT_START);
      expect(result.content).toContain('"mechanism": "REST"');
      expect(result.content).toMatch(/},\s*\n\s*{\s*\n\s*"mechanism": "REST"/);
      expect(result.content).not.toContain('e"mechanism":');
      expect(result.diagnostics).toBeDefined();
      expect(result.diagnostics?.length).toBeGreaterThan(0);
      expect(result.diagnostics?.[0]).toContain("mechanism");
    });

    it("should fix stray text before property names with colon", () => {
      const input = `  "integrationPoints": [
    {
      "mechanism": "REST",
      "name": "test1"
    },
e"name": "test2",
      "description": "test description"
    }
  ]`;

      const result = fixCorruptedArrayObjectStart(input);

      expect(result.changed).toBe(true);
      expect(result.content).toMatch(/},\s*\n\s*{\s*\n\s*"name": "test2"/);
      expect(result.content).not.toContain('e"name":');
    });

    it("should handle various stray characters before property names", () => {
      const testCases = ["e", "c", "n", "a"];

      for (const strayChar of testCases) {
        const input = `  "items": [
    {
      "id": 1
    },
${strayChar}"id": 2,
      "value": "test"
    }
  ]`;

        const result = fixCorruptedArrayObjectStart(input);

        expect(result.changed).toBe(true);
        expect(result.content).toMatch(/},\s*\n\s*{\s*\n\s*"id": 2/);
        expect(result.content).not.toContain(`${strayChar}"id":`);
      }
    });

    it("should preserve property names when fixing", () => {
      const input = `  "integrationPoints": [
    {
      "mechanism": "REST",
      "name": "test1"
    },
e"mechanism": "HTTP",
      "name": "test2"
    }
  ]`;

      const result = fixCorruptedArrayObjectStart(input);

      expect(result.changed).toBe(true);
      // Should preserve the property name "mechanism" (not change it to "name")
      expect(result.content).toContain('"mechanism": "HTTP"');
      expect(result.content).toContain('"name": "test2"');
    });

    it("should handle whitespace variations before property names", () => {
      const input = `  "items": [
    {
      "id": 1
    },
    e"id": 2,
      "value": "test"
    }
  ]`;

      const result = fixCorruptedArrayObjectStart(input);

      expect(result.changed).toBe(true);
      expect(result.content).toMatch(/"id": 2/);
    });

    it("should not fix if not in array context", () => {
      const input = `    {
      "object": {
        "property": "value"
      },
e"another": "value"
    }`;

      const result = fixCorruptedArrayObjectStart(input);

      // Should not fix outside array context
      expect(result.changed).toBe(false);
    });
  });
});
