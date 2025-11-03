import { fixAssignmentSyntax } from "../../../../src/llm/json-processing/sanitizers/fix-assignment-syntax";

describe("fixAssignmentSyntax", () => {
  describe("basic functionality", () => {
    it("should fix := to : in property assignments", () => {
      const input = '{"name":= "value"}';

      const result = fixAssignmentSyntax(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"name": "value"}');
      expect(result.description).toBe("Fixed assignment syntax (:= to :)");
      expect(result.diagnostics).toContain('Fixed assignment syntax: "name":= -> "name":');
    });

    it("should handle the exact error case from response-error-2025-11-02T22-32-42-557Z.log", () => {
      // This reproduces the exact error where := is used instead of :
      const input = `        {
          "name":="smsCampaignDropdownReadPlatformService",
          "type": "SmsCampaignDropdownReadPlatformService"
        }`;

      const result = fixAssignmentSyntax(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"name": "smsCampaignDropdownReadPlatformService"');
      expect(result.content).not.toContain('"name":=');
      expect(result.content).toContain('"type": "SmsCampaignDropdownReadPlatformService"');
    });

    it("should fix multiple := occurrences", () => {
      const input = '{"name":= "value1", "type":= "String"}';

      const result = fixAssignmentSyntax(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"name": "value1", "type": "String"}');
      expect(result.diagnostics?.length).toBeGreaterThanOrEqual(2);
    });

    it("should handle := with various whitespace patterns", () => {
      const testCases = [
        { input: '{"name":= "value"}' },
        { input: '{"name":="value"}' },
        { input: '{"name":=  "value"}' },
        { input: '{"name":=\t"value"}' },
      ];

      testCases.forEach(({ input }) => {
        const result = fixAssignmentSyntax(input);
        expect(result.changed).toBe(true);
        // Verify := is fixed to : (whitespace normalization is acceptable)
        expect(result.content).not.toContain(":=");
        expect(result.content).toContain('"name":');
        expect(result.content).toContain('"value"');
        // Should be valid JSON
        expect(() => JSON.parse(result.content)).not.toThrow();
      });
    });

    it("should handle := with numeric values", () => {
      const input = '{"count":= 10, "price":= 99.99}';

      const result = fixAssignmentSyntax(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"count": 10');
      expect(result.content).toContain('"price": 99.99');
    });

    it("should handle := with boolean and null values", () => {
      const input = '{"enabled":= true, "disabled":= false, "value":= null}';

      const result = fixAssignmentSyntax(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"enabled": true');
      expect(result.content).toContain('"disabled": false');
      expect(result.content).toContain('"value": null');
    });

    it("should handle := in nested objects", () => {
      const input = '{"outer": {"inner":= "value"}}';

      const result = fixAssignmentSyntax(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"outer": {"inner": "value"}}');
    });

    it("should handle := in arrays of objects", () => {
      const input = '[{"name":= "item1"}, {"name":= "item2"}]';

      const result = fixAssignmentSyntax(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"name": "item1"');
      expect(result.content).toContain('"name": "item2"');
    });

    it("should not modify valid JSON with :", () => {
      const input = '{"name": "value", "type": "String"}';

      const result = fixAssignmentSyntax(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });
  });

  describe("edge cases", () => {
    it("should not modify := inside string values", () => {
      const input = '{"description": "Use := for assignment"}';

      const result = fixAssignmentSyntax(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should handle empty input", () => {
      const result = fixAssignmentSyntax("");

      expect(result.changed).toBe(false);
      expect(result.content).toBe("");
    });

    it("should handle := with complex nested structures", () => {
      const input = `{
        "method": {
          "parameters": [
            {
              "name":="param1",
              "type": "String"
            }
          ]
        }
      }`;

      const result = fixAssignmentSyntax(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"name": "param1"');
      expect(result.content).not.toContain('"name":=');
    });
  });

  describe("error handling", () => {
    it("should handle regex errors gracefully", () => {
      // Mock a replace that throws an error
      const originalReplace = String.prototype.replace;
      String.prototype.replace = jest.fn().mockImplementation(() => {
        throw new Error("Regex error");
      });

      const input = '{"name":= "value"}';
      const result = fixAssignmentSyntax(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
      expect(result.diagnostics).toContain("Sanitizer failed: Error: Regex error");

      // Restore original method
      String.prototype.replace = originalReplace;
    });
  });
});
