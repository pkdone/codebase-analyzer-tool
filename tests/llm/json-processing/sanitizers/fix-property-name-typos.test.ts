import { fixPropertyNameTypos } from "../../../../src/llm/json-processing/sanitizers/fix-property-name-typos";

describe("fixPropertyNameTypos", () => {
  describe("basic functionality", () => {
    it("should fix trailing underscore in type property", () => {
      const input = '{"type_": "String"}';
      const result = fixPropertyNameTypos(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"type": "String"}');
      expect(result.description).toBe(
        "Fixed property name typos (trailing underscores, double underscores)",
      );
      expect(result.diagnostics).toBeDefined();
      expect(result.diagnostics?.[0]).toContain("type_");
      expect(result.diagnostics?.[0]).toContain("type");
    });

    it("should not change valid property names", () => {
      const input = '{"type": "String", "name": "value"}';
      const result = fixPropertyNameTypos(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
      expect(result.description).toBeUndefined();
      expect(result.diagnostics).toBeUndefined();
    });

    it("should fix multiple trailing underscore typos", () => {
      const input = '{"type_": "String", "name_": "test", "value": "ok"}';
      const result = fixPropertyNameTypos(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"type": "String", "name": "test", "value": "ok"}');
      expect(result.diagnostics?.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("trailing underscore patterns", () => {
    it("should fix trailing underscore for common properties", () => {
      const testCases = [
        { input: '{"type_": "String"}', expected: '{"type": "String"}' },
        { input: '{"name_": "test"}', expected: '{"name": "test"}' },
        { input: '{"value_": "data"}', expected: '{"value": "data"}' },
        { input: '{"purpose_": "desc"}', expected: '{"purpose": "desc"}' },
        { input: '{"description_": "text"}', expected: '{"description": "text"}' },
        {
          input: '{"cyclomaticComplexity_": 5}',
          expected: '{"cyclomaticComplexity": 5}',
        },
        { input: '{"linesOfCode_": 10}', expected: '{"linesOfCode": 10}' },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = fixPropertyNameTypos(input);
        expect(result.changed).toBe(true);
        expect(result.content).toBe(expected);
      });
    });

    it("should fix trailing underscore in nested objects", () => {
      const input = '{"publicConstants": [{"name": "TEST", "type_": "String"}]}';
      const result = fixPropertyNameTypos(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"publicConstants": [{"name": "TEST", "type": "String"}]}');
    });

    it("should fix trailing underscore in arrays", () => {
      const input =
        '{"constants": [{"name_": "CONST1", "value": "val1"}, {"name": "CONST2", "type_": "String"}]}';
      const result = fixPropertyNameTypos(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe(
        '{"constants": [{"name": "CONST1", "value": "val1"}, {"name": "CONST2", "type": "String"}]}',
      );
    });
  });

  describe("double underscore patterns", () => {
    it("should fix double underscores in property names", () => {
      const input = '{"property__name": "value", "type": "String"}';
      const result = fixPropertyNameTypos(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"property_name": "value", "type": "String"}');
      expect(result.diagnostics?.[0]).toContain("double underscores");
    });

    it("should fix multiple consecutive underscores", () => {
      const input = '{"property___name": "value"}';
      const result = fixPropertyNameTypos(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"property_name": "value"}');
    });

    it("should fix double underscores in nested structures", () => {
      const input = '{"data": {"inner__property": "value"}}';
      const result = fixPropertyNameTypos(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"data": {"inner_property": "value"}}');
    });
  });

  describe("edge cases", () => {
    it("should not modify property names that are string values", () => {
      const input = '{"description": "Property name_ with underscore"}';
      const result = fixPropertyNameTypos(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should handle single character property names with trailing underscore conservatively", () => {
      // Single char + underscore should be handled conservatively
      const input = '{"a_": "value"}';
      const result = fixPropertyNameTypos(input);

      // Should not fix if it would leave a single character
      expect(result.changed).toBe(false);
    });

    it("should preserve legitimate underscores in property names", () => {
      const input = '{"property_name": "value", "snake_case": "test"}';
      const result = fixPropertyNameTypos(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should handle empty objects", () => {
      const input = "{}";
      const result = fixPropertyNameTypos(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should handle complex nested structures", () => {
      const input =
        '{"publicConstants": [{"name": "TEST", "value": "val", "type_": "String"}], "publicMethods": [{"name": "method", "returnType_": "void"}]}';
      const result = fixPropertyNameTypos(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe(
        '{"publicConstants": [{"name": "TEST", "value": "val", "type": "String"}], "publicMethods": [{"name": "method", "returnType": "void"}]}',
      );
    });
  });

  describe("real-world scenario from error log", () => {
    it("should fix the type_ typo from the actual error", () => {
      // This is the exact pattern from the error log
      const input = JSON.stringify({
        name: "APPROVED_ON_DATE",
        value: "approvedOnDate",
        type_: "String", // This is the typo
      });

      const result = fixPropertyNameTypos(input);

      expect(result.changed).toBe(true);
      const parsed = JSON.parse(result.content);
      expect(parsed.type).toBe("String");
      expect(parsed.type_).toBeUndefined();
    });

    it("should fix type_ in a full publicConstants array", () => {
      const input = JSON.stringify({
        publicConstants: [
          { name: "RECALCULATE_LOAN_SCHEDULE", value: "recalculateLoanSchedule", type: "String" },
          { name: "ACCOUNT_NO", value: "accountNo", type: "String" },
          { name: "APPROVED_ON_DATE", value: "approvedOnDate", type_: "String" }, // Typo here
          { name: "ACTUAL_DISBURSEMENT_DATE", value: "actualDisbursementDate", type: "String" },
        ],
      });

      const result = fixPropertyNameTypos(input);

      expect(result.changed).toBe(true);
      const parsed = JSON.parse(result.content);
      expect(parsed.publicConstants[2].type).toBe("String");
      expect(parsed.publicConstants[2].type_).toBeUndefined();
    });
  });

  describe("error handling", () => {
    it("should handle invalid input gracefully", () => {
      const input = '{"unclosed": "string';
      const result = fixPropertyNameTypos(input);

      // Should not throw, but may not fix if parsing fails internally
      expect(result).toBeDefined();
      expect(typeof result.changed).toBe("boolean");
    });
  });
});
