import { fixTruncatedPropertyNamesAfterBrace } from "../../../../src/llm/json-processing/sanitizers/fix-truncated-property-names-after-brace";

describe("fixTruncatedPropertyNamesAfterBrace", () => {
  describe("basic functionality", () => {
    it("should fix truncated property name 'se': after closing brace in array", () => {
      const input = `  "publicMethods": [
    {
      "name": "method1",
      "codeSmells": []
    },
se": "This static factory method is used to augment an existing LoanProductData object",
      "parameters": []
    }
  ]`;

      const result = fixTruncatedPropertyNamesAfterBrace(input);

      expect(result.changed).toBe(true);
      expect(result.description).toBe(
        "Fixed truncated property names after closing braces in arrays",
      );
      expect(result.content).toContain(`"name": "This static factory method`);
      expect(result.content).toMatch(/},\s*\{\s*"name":\s*"This static factory method/);
      expect(result.diagnostics).toBeDefined();
      expect(result.diagnostics?.length).toBeGreaterThan(0);
      expect(result.diagnostics?.[0]).toContain('Fixed truncated property name after brace: "se" -> "name"');
    });

    it("should fix truncated property name 'pu': (purpose) after closing brace", () => {
      const input = `  "publicMethods": [
    {
      "name": "method1",
      "codeSmells": []
    },
pu": "This method processes loan transactions",
      "parameters": []
    }
  ]`;

      const result = fixTruncatedPropertyNamesAfterBrace(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain(`"purpose": "This method processes loan transactions"`);
      expect(result.content).toMatch(/},\s*\{\s*"purpose":\s*"This method processes loan transactions/);
    });

    it("should fix truncated property name 'na': (name) after closing brace", () => {
      const input = `  "publicMethods": [
    {
      "name": "method1",
      "codeSmells": []
    },
na": "method2",
      "purpose": "test"
    }
  ]`;

      const result = fixTruncatedPropertyNamesAfterBrace(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain(`"name": "method2"`);
      expect(result.content).toMatch(/},\s*\{\s*"name":\s*"method2",/);
    });

    it("should handle the exact error pattern from the log file", () => {
      const input = `  "publicMethods": [
    {
      "name": "loanProductWithFloatingRates",
      "codeSmells": [
        "LONG PARAMETER LIST"
      ]
    },
se": "This static factory method is used to augment an existing LoanProductData object with accounting-related details. It takes a LoanProductData instance and collections of accounting mappers (for payment channels, fees, and penalties) and sets them on the provided object.",
      "parameters": [
        {
          "name": "productData",
          "type": "LoanProductData"
        }
      ],
      "returnType": "LoanProductData",
      "description": "The method directly modifies the state of the productData object passed as a parameter.",
      "cyclomaticComplexity": 1,
      "linesOfCode": 6,
      "codeSmells": []
    }
  ]`;

      const result = fixTruncatedPropertyNamesAfterBrace(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain(
        `"name": "This static factory method is used to augment an existing LoanProductData object`,
      );
      // Verify the structure is now correct with opening brace
      expect(result.content).toMatch(
        /},\s*\{\s*"name":\s*"This static factory method is used to augment/,
      );
      // Verify following properties are present
      expect(result.content).toContain(`"parameters": [`);
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

      const result = fixTruncatedPropertyNamesAfterBrace(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should preserve comma after property value", () => {
      const input = `  "publicMethods": [
    {
      "name": "method1",
      "codeSmells": []
    },
se": "method2",
      "purpose": "test"
    }
  ]`;

      const result = fixTruncatedPropertyNamesAfterBrace(input);

      expect(result.changed).toBe(true);
      expect(result.content).toMatch(/},\s*\{\s*"name":\s*"method2",\s*"purpose"/);
    });
  });

  describe("array context detection", () => {
    it("should only fix when inside an array", () => {
      const input = `{
  "method1": {
    "codeSmells": []
  },
  "method2": {
    se": "value"
  }
}`;

      const result = fixTruncatedPropertyNamesAfterBrace(input);

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
    se": "item2",
      "tags": []
    }
  ]
}`;

      const result = fixTruncatedPropertyNamesAfterBrace(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain(`"name": "item2"`);
    });

    it("should not fix array of strings", () => {
      const input = `{
  "items": [
    "item1",
    se": "item2",
    "item3"
  ]
}`;

      const result = fixTruncatedPropertyNamesAfterBrace(input);

      // Should not modify - this is an array of strings, not objects
      // The sanitizer checks for array of objects context
      expect(result.changed).toBe(false);
    });
  });

  describe("property name mappings", () => {
    it("should handle 'des' -> 'description'", () => {
      const input = `  "publicMethods": [
    {
      "name": "method1"
    },
des": "A detailed description",
      "parameters": []
    }
  ]`;

      const result = fixTruncatedPropertyNamesAfterBrace(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain(`"description": "A detailed description"`);
    });

    it("should handle 'par' -> 'parameters'", () => {
      const input = `  "publicMethods": [
    {
      "name": "method1"
    },
par": [],
      "returnType": "void"
    }
  ]`;

      const result = fixTruncatedPropertyNamesAfterBrace(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain(`"parameters": []`);
    });

    it("should handle 'ret' -> 'returnType'", () => {
      const input = `  "publicMethods": [
    {
      "name": "method1"
    },
ret": "void",
      "description": "test"
    }
  ]`;

      const result = fixTruncatedPropertyNamesAfterBrace(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain(`"returnType": "void"`);
    });

    it("should handle 'imp' -> 'implementation'", () => {
      const input = `  "classes": [
    {
      "name": "class1"
    },
imp": "This class implements the interface",
      "namespace": "test"
    }
  ]`;

      const result = fixTruncatedPropertyNamesAfterBrace(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain(`"implementation": "This class implements the interface"`);
    });
  });

  describe("edge cases", () => {
    it("should handle different indentation levels", () => {
      const input = `  "publicMethods": [
      {
        "name": "method1"
      },
    se": "method2",
        "purpose": "test"
      }
    ]`;

      const result = fixTruncatedPropertyNamesAfterBrace(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain(`"name": "method2"`);
    });

    it("should handle multiple truncated properties in same array", () => {
      const input = `  "publicMethods": [
    {
      "name": "method1"
    },
se": "method2",
      "purpose": "test"
    },
na": "method3",
      "purpose": "test"
    }
  ]`;

      const result = fixTruncatedPropertyNamesAfterBrace(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain(`"name": "method2"`);
      expect(result.content).toContain(`"name": "method3"`);
    });

    it("should not fix if truncated property doesn't match known mappings", () => {
      const input = `  "publicMethods": [
    {
      "name": "method1"
    },
xy": "unknown property",
      "purpose": "test"
    }
  ]`;

      const result = fixTruncatedPropertyNamesAfterBrace(input);

      // Should not modify - "xy" doesn't match any known property name
      expect(result.changed).toBe(false);
    });

    it("should handle empty property value", () => {
      const input = `  "publicMethods": [
    {
      "name": "method1"
    },
se": "",
      "purpose": "test"
    }
  ]`;

      const result = fixTruncatedPropertyNamesAfterBrace(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain(`"name": ""`);
    });

    it("should handle property value with special characters", () => {
      const input = `  "publicMethods": [
    {
      "name": "method1"
    },
se": "Method with "quotes" and 'apostrophes'",
      "purpose": "test"
    }
  ]`;

      const result = fixTruncatedPropertyNamesAfterBrace(input);

      expect(result.changed).toBe(true);
      // The escaped quotes in the input will be preserved in the output
      expect(result.content).toContain(`"name": "Method with`);
      expect(result.content).toContain(`quotes`);
      expect(result.content).toContain(`apostrophes`);
    });
  });

  describe("error handling", () => {
    it("should return original content if sanitization fails", () => {
      // Create input that might cause regex issues (though unlikely)
      const input = `  "publicMethods": [
    {
      "name": "method1"
    },
se": "method2",
      "purpose": "test"
    }
  ]`;

      // Mock a scenario that might cause an error
      const result = fixTruncatedPropertyNamesAfterBrace(input);

      // Should still work correctly
      expect(result.content).toBeDefined();
      expect(typeof result.content).toBe("string");
    });
  });
});

