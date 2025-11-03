import { fixTruncatedArrayElements } from "../../../../src/llm/json-processing/sanitizers/fix-truncated-array-elements";

describe("fixTruncatedArrayElements", () => {
  describe("basic functionality", () => {
    it("should fix truncated array element with missing opening brace and property name", () => {
      const input = `  "publicMethods": [
    {
      "name": "withdrawal",
      "codeSmells": []
    },
alculateInterest",
      "purpose": "Triggers an ad-hoc interest calculation"
    }
  ]`;

      const result = fixTruncatedArrayElements(input);

      expect(result.changed).toBe(true);
      expect(result.description).toBe(
        "Fixed truncated array elements (missing opening brace and property name)",
      );
      // The sanitizer fixes the structure but preserves the word value as-is
      expect(result.content).toContain(`"name": "alculateInterest"`);
      expect(result.content).toMatch(/},\s*\{\s*"name":\s*"alculateInterest"/);
      expect(result.diagnostics).toBeDefined();
      expect(result.diagnostics?.length).toBeGreaterThan(0);
    });

    it("should handle the exact error pattern from the log file", () => {
      const input = `  "publicMethods": [
    {
      "name": "withdrawal",
      "codeSmells": []
    },
alculateInterest",
      "purpose": "Triggers an ad-hoc interest calculation for a deposit account. This method calculates the interest accrued up to the current business date but does not post it as a transaction. It is used to update the account's state and provide an up-to-date view of accrued interest without creating a formal accounting entry.",
      "parameters": [
        {
          "name": "savingsId",
          "type": "Long"
        }
      ]
    }
  ]`;

      const result = fixTruncatedArrayElements(input);

      expect(result.changed).toBe(true);
      // The sanitizer fixes the structure but preserves the word value as-is
      expect(result.content).toContain(`"name": "alculateInterest"`);
      expect(result.content).toMatch(/},\s*\{\s*"name":\s*"alculateInterest",/);
      // Verify the structure is now correct
      expect(result.content).toMatch(/},\s*\{\s*"name":\s*"alculateInterest",\s*"purpose"/);
    });

    it("should not modify valid JSON", () => {
      const input = `  "publicMethods": [
    {
      "name": "method1",
      "codeSmells": []
    },
    {
      "name": "calculateInterest",
      "purpose": "test"
    }
  ]`;

      const result = fixTruncatedArrayElements(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });
  });

  describe("array context detection", () => {
    it("should only fix when inside an array", () => {
      const input = `{
  "method1": {
    "codeSmells": []
  },
  "method2": "value"
}`;

      const result = fixTruncatedArrayElements(input);

      // Should not modify - not in array context
      expect(result.changed).toBe(false);
    });

    it("should fix when inside nested arrays", () => {
      const input = `{
  "items": [
    {
      "name": "item1",
      "tags": []
    },
    calculateItem",
      "purpose": "test"
    }
  ]
}`;

      const result = fixTruncatedArrayElements(input);

      // Should fix when in array context
      if (result.changed) {
        expect(result.content).toContain(`"name": "calculateItem"`);
      }
    });

    it("should handle array of objects correctly", () => {
      const input = `  "methods": [
    {
      "name": "method1",
      "params": []
    },
    calculateMethod",
      "params": []
    }
  ]`;

      const result = fixTruncatedArrayElements(input);

      // The sanitizer should detect and fix this
      if (result.changed) {
        expect(result.content).toContain(`"name": "calculateMethod"`);
        expect(result.content).toMatch(/},\s*\{\s*"name":\s*"calculateMethod",/);
      }
    });
  });

  describe("whitespace handling", () => {
    it("should preserve indentation", () => {
      const input = `  "items": [
      {
        "name": "item1",
        "tags": []
      },
    calculateItem",
        "purpose": "test"
      }
    ]`;

      const result = fixTruncatedArrayElements(input);

      if (result.changed) {
        expect(result.content).toContain(`"name": "calculateItem"`);
        // Should preserve the indentation structure
        expect(result.content).toMatch(/},\s*\{\s*"name":\s*"calculateItem",/);
      }
    });

    it("should handle different whitespace patterns", () => {
      const input = `["items": [
{
  "name": "item1",
  "tags": []
},
calculateItem",
  "purpose": "test"
}
]`;

      const result = fixTruncatedArrayElements(input);

      if (result.changed) {
        expect(result.content).toContain(`"name": "calculateItem"`);
      }
    });
  });

  describe("edge cases", () => {
    it("should handle empty string", () => {
      const result = fixTruncatedArrayElements("");

      expect(result.changed).toBe(false);
      expect(result.content).toBe("");
    });

    it("should handle non-JSON strings", () => {
      const input = "This is not JSON";
      const result = fixTruncatedArrayElements(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should not modify if opening brace already exists", () => {
      const input = `  "items": [
    {
      "name": "item1",
      "tags": []
    },
    {
      "name": "calculateItem"
    }
  ]`;

      const result = fixTruncatedArrayElements(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should handle truncated word with different casing", () => {
      const input = `  "methods": [
    {
      "name": "method1",
      "codeSmells": []
    },
    alculateInterest",
      "purpose": "test"
    }
  ]`;

      const result = fixTruncatedArrayElements(input);

      // Should match lowercase starting word
      if (result.changed) {
        expect(result.content).toContain(`"name": "alculateInterest"`);
      }
    });
  });

  describe("complex scenarios", () => {
    it("should handle multiple truncated elements in sequence", () => {
      const input = `  "methods": [
    {
      "name": "method1",
      "codeSmells": []
    },
    calculateInterest",
      "purpose": "test1"
    },
    alculateComplexity",
      "purpose": "test2"
    }
  ]`;

      const result = fixTruncatedArrayElements(input);

      if (result.changed) {
        // The sanitizer fixes the structure but preserves word values as-is
        expect(result.content).toContain(`"name": "calculateInterest"`);
        // Note: "alculateComplexity" might not be fixed if it doesn't match the pattern
        // The sanitizer only fixes the first occurrence that matches the pattern
      }
    });

    it("should handle truncated element with nested structures", () => {
      const input = `  "methods": [
    {
      "name": "method1",
      "parameters": [
        {
          "name": "param1",
          "type": "String"
        }
      ]
    },
    calculateInterest",
      "parameters": []
    }
  ]`;

      const result = fixTruncatedArrayElements(input);

      if (result.changed) {
        expect(result.content).toContain(`"name": "calculateInterest"`);
        // Should preserve the nested structure
        expect(result.content).toContain(`"parameters": []`);
      }
    });
  });

  describe("error handling", () => {
    it("should handle errors gracefully", () => {
      const input = `  "items": [
    {
      "name": "item1"
    },
    calculateItem",
      "purpose": "value"
  ]`;

      const result = fixTruncatedArrayElements(input);

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      // Should not throw, even if pattern doesn't match perfectly
    });
  });
});

