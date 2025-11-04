import { fixCurlyQuotes } from "../../../../src/llm/json-processing/sanitizers/fix-curly-quotes";
import { SANITIZATION_STEP } from "../../../../src/llm/json-processing/config/sanitization-steps.config";

describe("fixCurlyQuotes", () => {
  describe("basic functionality", () => {
    it("should convert left double curly quote to regular quote", () => {
      const input = '{\u201Cname\u201D: "value"}'; // Left curly quote (U+201C) and right (U+201D)
      const result = fixCurlyQuotes(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"name": "value"}');
      expect(result.description).toBe(SANITIZATION_STEP.FIXED_CURLY_QUOTES);
      expect(result.diagnostics).toBeDefined();
      expect(result.diagnostics?.length).toBeGreaterThan(0);
    });

    it("should convert right double curly quote to regular quote", () => {
      const input = '\u201DexternalReferences\u201D: ['; // Right curly quote (U+201D)
      const result = fixCurlyQuotes(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('"externalReferences": [');
      expect(result.diagnostics).toBeDefined();
    });

    it("should convert both left and right double curly quotes", () => {
      const input = '{\u201Cname\u201D: \u201Cvalue\u201D, \u201Cproperty\u201D: \u201Ctest\u201D}'; // Both curly quotes
      const result = fixCurlyQuotes(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"name": "value", "property": "test"}');
      expect(result.diagnostics).toBeDefined();
    });

    it("should convert single curly quotes", () => {
      const input = "It\u2019s a \u2018test\u2019 value"; // Single curly quotes (U+2018, U+2019)
      const result = fixCurlyQuotes(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe("It's a 'test' value");
    });

    it("should not modify valid JSON without curly quotes", () => {
      const input = '{"name": "value", "property": "test"}';
      const result = fixCurlyQuotes(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });
  });

  describe("real-world error cases", () => {
    it("should fix the exact error pattern from Calls.java log - right curly quote before property name", () => {
      // This is the exact pattern from the error log: "externalReferences": [
      const input = `  "internalReferences": [
    "org.apache.fineract.client.util.CallFailedRuntimeException"
  ],
\u201DexternalReferences\u201D: [
    "retrofit2.Call",
    "retrofit2.Response"
  ]`;

      const result = fixCurlyQuotes(input);

      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("\u201D"); // Right curly quote
      expect(result.content).toContain('"externalReferences":');
      expect(result.content).toMatch(/\],\s*\n\s*"externalReferences"/);
      expect(result.diagnostics).toBeDefined();
      expect(result.diagnostics?.length).toBeGreaterThan(0);
    });

    it("should handle curly quotes in property names", () => {
      const input = '{\u201Cname\u201D: "value", \u201Cproperty\u201D: "test"}'; // Curly quotes in property names
      const result = fixCurlyQuotes(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"name": "value", "property": "test"}');
    });

    it("should handle curly quotes in string values", () => {
      const input = '{"description": "It\u201Ds a test"}'; // Curly quote in string value
      const result = fixCurlyQuotes(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"description": "It"s a test"}');
    });

    it("should handle mixed curly and regular quotes", () => {
      const input = '{\u201Cname\u201D: "value", "property": \u201Ctest\u201D}'; // Mixed curly and regular
      const result = fixCurlyQuotes(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"name": "value", "property": "test"}');
    });
  });

  describe("edge cases", () => {
    it("should handle empty string", () => {
      const result = fixCurlyQuotes("");

      expect(result.changed).toBe(false);
      expect(result.content).toBe("");
    });

    it("should handle string with only curly quotes", () => {
      const input = '\u201C\u201D'; // Both curly quotes
      const result = fixCurlyQuotes(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('""');
    });

    it("should handle multiple occurrences of curly quotes", () => {
      const input = '{\u201Cprop1\u201D: \u201Cval1\u201D, \u201Cprop2\u201D: \u201Cval2\u201D, \u201Cprop3\u201D: \u201Cval3\u201D}'; // Multiple curly quotes
      const result = fixCurlyQuotes(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"prop1": "val1", "prop2": "val2", "prop3": "val3"}');
      expect(result.diagnostics).toBeDefined();
      const diagnosticsStr = result.diagnostics?.join(" ") ?? "";
      expect(diagnosticsStr).toContain("Converted");
    });
  });

  describe("complex JSON structures", () => {
    it("should handle nested objects with curly quotes", () => {
      const input = '{\u201Couter\u201D: {\u201Cinner\u201D: \u201Cvalue\u201D}}'; // Curly quotes in nested structure
      const result = fixCurlyQuotes(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"outer": {"inner": "value"}}');
    });

    it("should handle arrays with curly quotes", () => {
      const input = '{\u201Citems\u201D: [\u201Citem1\u201D, \u201Citem2\u201D]}'; // Curly quotes in arrays
      const result = fixCurlyQuotes(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"items": ["item1", "item2"]}');
    });

    it("should handle complete JSON object with curly quotes", () => {
      const input = `{
  \u201Cname\u201D: \u201CCalls\u201D,
  \u201Ckind\u201D: \u201CCLASS\u201D,
  \u201DexternalReferences\u201D: [
    "retrofit2.Call"
  ]
}`;

      const result = fixCurlyQuotes(input);

      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("\u201C"); // Left curly quote
      expect(result.content).not.toContain("\u201D"); // Right curly quote
      expect(result.content).toContain('"externalReferences"');
      // Verify the JSON can be parsed
      expect(() => JSON.parse(result.content)).not.toThrow();
    });
  });
});

