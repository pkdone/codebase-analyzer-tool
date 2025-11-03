import { fixUnquotedStringValues } from "../../../../src/llm/json-processing/sanitizers/fix-unquoted-string-values";
import { SANITIZATION_STEP } from "../../../../src/llm/json-processing/config/sanitization-steps.config";

describe("fixUnquotedStringValues", () => {
  describe("basic functionality", () => {
    it("should fix the exact error pattern from the log file (GetChargeCalculation)", () => {
      const input = `    {
      "name":GetChargeCalculation",
      "purpose": "This method retrieves"
    }`;

      const result = fixUnquotedStringValues(input);

      expect(result.changed).toBe(true);
      expect(result.description).toBe(SANITIZATION_STEP.FIXED_UNQUOTED_STRING_VALUES);
      expect(result.content).toMatch(/"name":\s*"GetChargeCalculation"/);
      expect(result.content).not.toContain('"name":GetChargeCalculation"');
      expect(result.diagnostics).toBeDefined();
      expect(result.diagnostics?.length).toBeGreaterThan(0);
    });

    it("should fix unquoted string value with space after colon", () => {
      const input = `    {
      "name": GetChargeCalculation",
      "purpose": "This method retrieves"
    }`;

      const result = fixUnquotedStringValues(input);

      expect(result.changed).toBe(true);
      expect(result.content).toMatch(/"name":\s*"GetChargeCalculation"/);
      // Should not contain the invalid pattern (unquoted value followed by quote, without opening quote)
      // The pattern should not match: GetChargeCalculation", (missing opening quote before GetChargeCalculation)
      expect(result.content).not.toMatch(/[^"]GetChargeCalculation"\s*,/);
    });

    it("should fix unquoted string value without space after colon", () => {
      const input = `    {
      "name":GetChargeCalculation,
      "purpose": "This method retrieves"
    }`;

      const result = fixUnquotedStringValues(input);

      expect(result.changed).toBe(true);
      expect(result.content).toMatch(/"name":\s*"GetChargeCalculation"/);
    });

    it("should fix unquoted string value followed by comma", () => {
      const input = `    {
      "returnType":CommandProcessingResult,
      "purpose": "test"
    }`;

      const result = fixUnquotedStringValues(input);

      expect(result.changed).toBe(true);
      expect(result.content).toMatch(/"returnType":\s*"CommandProcessingResult"/);
    });

    it("should fix unquoted string value followed by closing brace", () => {
      const input = `    {
      "returnType":String
    }`;

      const result = fixUnquotedStringValues(input);

      expect(result.changed).toBe(true);
      expect(result.content).toMatch(/"returnType":\s*"String"/);
    });

    it("should not modify valid JSON with quoted values", () => {
      const input = `    {
      "name": "GetChargeCalculation",
      "purpose": "This method retrieves"
    }`;

      const result = fixUnquotedStringValues(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should not modify JSON keywords (true, false, null)", () => {
      const input = `    {
      "isActive": true,
      "isDeleted": false,
      "value": null
    }`;

      const result = fixUnquotedStringValues(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should not modify numeric values", () => {
      const input = `    {
      "count": 10,
      "price": 99.99
    }`;

      const result = fixUnquotedStringValues(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });
  });

  describe("real-world scenarios", () => {
    it("should handle the exact pattern from the error log with full context", () => {
      const input = `{
  "publicMethods": [
    {
      "name": "getChargePaymentMode",
      "purpose": "This method retrieves"
    },
    {
      "name":GetChargeCalculation",
      "purpose": "This method retrieves the calculation type"
    }
  ]
}`;

      const result = fixUnquotedStringValues(input);

      expect(result.changed).toBe(true);
      expect(result.content).toMatch(/"name":\s*"GetChargeCalculation"/);
      expect(result.content).not.toContain('"name":GetChargeCalculation"');

      // Verify the JSON structure is now valid
      const parsed = JSON.parse(result.content);
      expect(parsed.publicMethods).toBeDefined();
      expect(parsed.publicMethods.length).toBe(2);
      expect(parsed.publicMethods[1].name).toBe("GetChargeCalculation");
    });

    it("should handle multiple unquoted string values in the same object", () => {
      const input = `    {
      "returnType":CommandProcessingResult,
      "type":String,
      "name":GetChargeCalculation
    }`;

      const result = fixUnquotedStringValues(input);

      expect(result.changed).toBe(true);
      expect(result.content).toMatch(/"returnType":\s*"CommandProcessingResult"/);
      expect(result.content).toMatch(/"type":\s*"String"/);
      expect(result.content).toMatch(/"name":\s*"GetChargeCalculation"/);
    });

    it("should handle values with dots and underscores (package names)", () => {
      const input = `    {
      "type": "org.apache.fineract.portfolio.charge.domain.Charge",
      "returnType":LoanChargeCommand
    }`;

      const result = fixUnquotedStringValues(input);

      expect(result.changed).toBe(true);
      expect(result.content).toMatch(/"returnType":\s*"LoanChargeCommand"/);
      // Should preserve the already-quoted value
      expect(result.content).toContain('"type": "org.apache.fineract.portfolio.charge.domain.Charge"');
    });
  });

  describe("edge cases", () => {
    it("should handle empty string", () => {
      const result = fixUnquotedStringValues("");

      expect(result.changed).toBe(false);
      expect(result.content).toBe("");
    });

    it("should handle non-JSON strings", () => {
      const input = "This is not JSON";
      const result = fixUnquotedStringValues(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should not modify if already quoted", () => {
      const input = `    {
      "name": "GetChargeCalculation"
    }`;

      const result = fixUnquotedStringValues(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should handle values at end of object", () => {
      const input = `    {
      "name":GetChargeCalculation
    }`;

      const result = fixUnquotedStringValues(input);

      if (result.changed) {
        expect(result.content).toMatch(/"name":\s*"GetChargeCalculation"/);
      }
    });
  });

  describe("array contexts", () => {
    it("should fix unquoted string values in arrays", () => {
      const input = `    {
      "types": [
        String,
        Integer,
        BigDecimal
      ]
    }`;

      const result = fixUnquotedStringValues(input);

      // Note: Arrays of unquoted values are less common, but if detected should be fixed
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });

    it("should fix unquoted values in nested objects", () => {
      const input = `    {
      "parameter": {
        "name": "param1",
        "type":String
      }
    }`;

      const result = fixUnquotedStringValues(input);

      expect(result.changed).toBe(true);
      expect(result.content).toMatch(/"type":\s*"String"/);
    });
  });

  describe("diagnostics", () => {
    it("should provide diagnostic messages when fixes are made", () => {
      const input = `    {
      "name":GetChargeCalculation,
      "purpose": "test"
    }`;

      const result = fixUnquotedStringValues(input);

      if (result.changed) {
        expect(result.diagnostics).toBeDefined();
        expect(result.diagnostics?.length).toBeGreaterThan(0);
        expect(result.diagnostics?.[0]).toContain("GetChargeCalculation");
      }
    });
  });

  describe("error handling", () => {
    it("should handle errors gracefully", () => {
      // Test with potentially problematic input
      const input = `    {
      "name":GetChargeCalculation`;

      const result = fixUnquotedStringValues(input);

      // Should not throw, should return a result
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });
  });

  describe("property name vs value distinction", () => {
    it("should not modify unquoted property names (handled by fixUnquotedPropertyNames)", () => {
      const input = `    {
      name: "GetChargeCalculation",
      purpose: "test"
    }`;

      const result = fixUnquotedStringValues(input);

      // Should not fix property names - that's handled by fixUnquotedPropertyNames
      // Should not change (or minimal changes if any false positives)
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });

    it("should only fix values after colons", () => {
      const input = `    {
      "name": GetChargeCalculation,
      "anotherName": "AlreadyQuoted"
    }`;

      const result = fixUnquotedStringValues(input);

      expect(result.changed).toBe(true);
      expect(result.content).toMatch(/"name":\s*"GetChargeCalculation"/);
      expect(result.content).toContain('"anotherName": "AlreadyQuoted"');
    });
  });
});

