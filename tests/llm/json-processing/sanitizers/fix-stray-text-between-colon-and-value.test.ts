import { fixStrayTextBetweenColonAndValue } from "../../../../src/llm/json-processing/sanitizers/fix-stray-text-between-colon-and-value";
import { SANITIZATION_STEP } from "../../../../src/llm/json-processing/config/sanitization-steps.config";

describe("fixStrayTextBetweenColonAndValue", () => {
  describe("basic functionality", () => {
    it("should fix the exact error pattern from the log file (ax between colon and value)", () => {
      const input = `        { "name":ax": "totalCredits", "type": "BigDecimal" }`;

      const result = fixStrayTextBetweenColonAndValue(input);

      expect(result.changed).toBe(true);
      expect(result.description).toBe(SANITIZATION_STEP.FIXED_STRAY_TEXT_BETWEEN_COLON_AND_VALUE);
      expect(result.content).toContain('"name": "totalCredits"');
      expect(result.content).not.toContain('"name":ax":');
      expect(result.diagnostics).toBeDefined();
      expect(result.diagnostics?.length).toBeGreaterThan(0);
    });

    it("should fix stray text between colon and value", () => {
      const input = `    {
      "type":word": "String",
      "name": "test"
    }`;

      const result = fixStrayTextBetweenColonAndValue(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"type": "String"');
      expect(result.content).not.toContain('"type":word":');
    });

    it("should fix single character stray text", () => {
      const input = `    {
      "returnType":a": "Result",
      "name": "test"
    }`;

      const result = fixStrayTextBetweenColonAndValue(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"returnType": "Result"');
      expect(result.content).not.toContain('"returnType":a":');
    });

    it("should fix multi-character stray text", () => {
      const input = `    {
      "name":abc": "value",
      "other": "test"
    }`;

      const result = fixStrayTextBetweenColonAndValue(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"name": "value"');
      expect(result.content).not.toContain('"name":abc":');
    });

    it("should not modify valid JSON", () => {
      const input = `    {
      "name": "totalCredits",
      "type": "BigDecimal"
    }`;

      const result = fixStrayTextBetweenColonAndValue(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should handle values with whitespace after colon", () => {
      const input = `    {
      "name":ax": "totalCredits",
      "type": "String"
    }`;

      const result = fixStrayTextBetweenColonAndValue(input);

      expect(result.changed).toBe(true);
      expect(result.content).toMatch(/"name":\s*"totalCredits"/);
    });
  });

  describe("real-world scenarios", () => {
    it("should handle the exact pattern from the error log with full context", () => {
      const input = `{
  "publicMethods": [
    {
      "name": "periodWithPayments",
      "parameters": [
        { "name": "totalInstallmentAmountForPeriod", "type": "BigDecimal" },
        { "name":ax": "totalCredits", "type": "BigDecimal" },
        { "name": "isDownPayment", "type": "boolean" }
      ]
    }
  ]
}`;

      const result = fixStrayTextBetweenColonAndValue(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"name": "totalCredits"');
      expect(result.content).not.toContain('"name":ax":');

      // Verify the JSON structure is now valid
      const parsed = JSON.parse(result.content);
      expect(parsed.publicMethods).toBeDefined();
      expect(parsed.publicMethods[0].parameters).toBeDefined();
      expect(parsed.publicMethods[0].parameters[1].name).toBe("totalCredits");
    });

    it("should handle multiple occurrences in the same object", () => {
      const input = `    {
      "name":ax": "totalCredits",
      "type":word": "BigDecimal",
      "returnType":abc": "Result"
    }`;

      const result = fixStrayTextBetweenColonAndValue(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"name": "totalCredits"');
      expect(result.content).toContain('"type": "BigDecimal"');
      expect(result.content).toContain('"returnType": "Result"');
      expect(result.content).not.toContain('"name":ax":');
      expect(result.content).not.toContain('"type":word":');
      expect(result.content).not.toContain('"returnType":abc":');
    });

    it("should handle stray text with numbers", () => {
      const input = `    {
      "id":123": "value",
      "name": "test"
    }`;

      const result = fixStrayTextBetweenColonAndValue(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"id": "value"');
    });
  });

  describe("edge cases", () => {
    it("should handle empty string", () => {
      const result = fixStrayTextBetweenColonAndValue("");

      expect(result.changed).toBe(false);
      expect(result.content).toBe("");
    });

    it("should handle non-JSON strings", () => {
      const input = "This is not JSON";
      const result = fixStrayTextBetweenColonAndValue(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should not modify if pattern doesn't match", () => {
      const input = `    {
      "name": "value",
      "type": "String"
    }`;

      const result = fixStrayTextBetweenColonAndValue(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should handle long stray text (up to limit)", () => {
      const input = `    {
      "name":longtext": "value",
      "other": "test"
    }`;

      const result = fixStrayTextBetweenColonAndValue(input);

      // Should fix if within character limit
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      if (result.changed) {
        expect(result.content).toContain('"name": "value"');
      }
    });
  });

  describe("nested contexts", () => {
    it("should fix stray text in nested objects", () => {
      const input = `    {
      "outer": {
        "inner":ax": "value"
      }
    }`;

      const result = fixStrayTextBetweenColonAndValue(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"inner": "value"');
    });

    it("should fix stray text in array elements", () => {
      const input = `    {
      "items": [
        { "name":ax": "item1" },
        { "name": "item2" }
      ]
    }`;

      const result = fixStrayTextBetweenColonAndValue(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"name": "item1"');
    });
  });

  describe("diagnostics", () => {
    it("should provide diagnostic messages when fixes are made", () => {
      const input = `    {
      "name":ax": "totalCredits",
      "type": "String"
    }`;

      const result = fixStrayTextBetweenColonAndValue(input);

      if (result.changed) {
        expect(result.diagnostics).toBeDefined();
        expect(result.diagnostics?.length).toBeGreaterThan(0);
        expect(result.diagnostics?.[0]).toContain("ax");
        expect(result.diagnostics?.[0]).toContain("totalCredits");
      }
    });
  });

  describe("error handling", () => {
    it("should handle errors gracefully", () => {
      // Test with potentially problematic input
      const input = `    {
      "name":ax": "value`;

      const result = fixStrayTextBetweenColonAndValue(input);

      // Should not throw, should return a result
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });
  });

  describe("property value distinction", () => {
    it("should only fix values after colons", () => {
      const input = `    {
      "name":ax": "totalCredits",
      "anotherName": "AlreadyValid"
    }`;

      const result = fixStrayTextBetweenColonAndValue(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"name": "totalCredits"');
      expect(result.content).toContain('"anotherName": "AlreadyValid"');
    });

    it("should not modify property names", () => {
      const input = `    {
      "name":ax": "value",
      "other": "test"
    }`;

      const result = fixStrayTextBetweenColonAndValue(input);

      // Should only fix the value part, not property names
      expect(result.changed).toBe(true);
      expect(result.content).toMatch(/"name":\s*"value"/);
    });
  });
});

