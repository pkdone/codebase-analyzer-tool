import { normalizeCharacters } from "../../../../../src/common/llm/json-processing/sanitizers/index";
import { MUTATION_STEP } from "../../../../../src/common/llm/json-processing/constants/mutation-steps.config";

describe("normalizeCharacters", () => {
  describe("converts curly quotes to ASCII quotes", () => {
    it("should convert left double curly quote to regular quote", () => {
      const input = '{\u201Cname\u201D: "value"}'; // Left curly quote (U+201C) and right (U+201D)
      const result = normalizeCharacters(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"name": "value"}');
      expect(result.description).toBe(MUTATION_STEP.NORMALIZED_ESCAPE_SEQUENCES);
      expect(result.diagnostics).toBeDefined();
      expect(result.diagnostics?.length).toBeGreaterThan(0);
    });

    it("should convert right double curly quote to regular quote", () => {
      const input = "\u201DexternalReferences\u201D: ["; // Right curly quote (U+201D)
      const result = normalizeCharacters(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('"externalReferences": [');
      expect(result.diagnostics).toBeDefined();
    });

    it("should convert both left and right double curly quotes", () => {
      const input = "{\u201Cname\u201D: \u201Cvalue\u201D, \u201Cproperty\u201D: \u201Ctest\u201D}"; // Both curly quotes
      const result = normalizeCharacters(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"name": "value", "property": "test"}');
      expect(result.diagnostics).toBeDefined();
    });

    it("should convert single curly quotes", () => {
      const input = "It\u2019s a \u2018test\u2019 value"; // Single curly quotes (U+2018, U+2019)
      const result = normalizeCharacters(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe("It's a 'test' value");
    });

    it("should handle curly quotes in property names", () => {
      const input = '{\u201Cname\u201D: "value", \u201Cproperty\u201D: "test"}'; // Curly quotes in property names
      const result = normalizeCharacters(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"name": "value", "property": "test"}');
    });

    it("should handle curly quotes in string values", () => {
      const input = '{"description": "It\u201Ds a test"}'; // Curly quote in string value
      const result = normalizeCharacters(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"description": "It"s a test"}');
    });

    it("should handle mixed curly and regular quotes", () => {
      const input = '{\u201Cname\u201D: "value", "property": \u201Ctest\u201D}'; // Mixed curly and regular
      const result = normalizeCharacters(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"name": "value", "property": "test"}');
    });

    it("should handle string with only curly quotes", () => {
      const input = "\u201C\u201D"; // Both curly quotes
      const result = normalizeCharacters(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('""');
    });

    it("should handle multiple occurrences of curly quotes", () => {
      const input =
        "{\u201Cprop1\u201D: \u201Cval1\u201D, \u201Cprop2\u201D: \u201Cval2\u201D, \u201Cprop3\u201D: \u201Cval3\u201D}"; // Multiple curly quotes
      const result = normalizeCharacters(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"prop1": "val1", "prop2": "val2", "prop3": "val3"}');
      expect(result.diagnostics).toBeDefined();
      const diagnosticsStr = result.diagnostics?.join(" ") ?? "";
      expect(diagnosticsStr).toContain("Converted");
    });

    it("should handle nested objects with curly quotes", () => {
      const input = "{\u201Couter\u201D: {\u201Cinner\u201D: \u201Cvalue\u201D}}"; // Curly quotes in nested structure
      const result = normalizeCharacters(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"outer": {"inner": "value"}}');
    });

    it("should handle arrays with curly quotes", () => {
      const input = "{\u201Citems\u201D: [\u201Citem1\u201D, \u201Citem2\u201D]}"; // Curly quotes in arrays
      const result = normalizeCharacters(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"items": ["item1", "item2"]}');
    });

    it("should fix the exact error pattern from Calls.java log - right curly quote before property name", () => {
      // This is the exact pattern from the error log: "externalReferences": [
      const input = `  "internalReferences": [
    "org.apache.fineract.client.util.CallFailedRuntimeException"
  ],
\u201DexternalReferences\u201D: [
    "retrofit2.Call",
    "retrofit2.Response"
  ]`;

      const result = normalizeCharacters(input);

      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("\u201D"); // Right curly quote
      expect(result.content).toContain('"externalReferences":');
      expect(result.content).toMatch(/\],\s*\n\s*"externalReferences"/);
      expect(result.diagnostics).toBeDefined();
      expect(result.diagnostics?.length).toBeGreaterThan(0);
    });
  });

  describe("removes control characters outside strings", () => {
    it("should remove zero-width spaces", () => {
      const input = '{\u200B"key"\u200B:\u200B"value"\u200B}';
      const result = normalizeCharacters(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"key":"value"}');
      expect(result.description).toBe(
        "Normalized escape sequences, control characters, and curly quotes",
      );
    });

    it("should remove zero-width non-joiner", () => {
      const input = '{\u200C"name"\u200C:\u200C"John"\u200C}';
      const result = normalizeCharacters(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"name":"John"}');
    });

    it("should remove zero-width joiner", () => {
      const input = '{\u200D"key"\u200D:\u200D"value"\u200D}';
      const result = normalizeCharacters(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"key":"value"}');
    });

    it("should remove BOM (zero-width no-break space)", () => {
      const input = '\uFEFF{ "key": "value" }';
      const result = normalizeCharacters(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{ "key": "value" }');
    });

    it("should remove NULL characters", () => {
      const input = '{\u0000"key"\u0000:\u0000"value"\u0000}';
      const result = normalizeCharacters(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"key":"value"}');
    });

    it("should remove vertical tab", () => {
      const input = '{\u000B"key":\u000B"value"}';
      const result = normalizeCharacters(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"key":"value"}');
    });

    it("should remove form feed", () => {
      const input = '{\u000C"key":\u000C"value"}';
      const result = normalizeCharacters(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"key":"value"}');
    });

    it("should remove multiple types of control characters", () => {
      const input = '\uFEFF{\u200B\u0000"key"\u200C:\u000B"value"\u200D}\u000C';
      const result = normalizeCharacters(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"key":"value"}');
    });

    it("should preserve valid whitespace (tabs, newlines, carriage returns)", () => {
      const input = '{\n\t "key": "value"\r\n}';
      const result = normalizeCharacters(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });
  });

  describe("escapes control characters inside strings", () => {
    it("should escape control characters in string values", () => {
      const input = '{"message": "Hello\u0001World\u0002!"}';
      const result = normalizeCharacters(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"message": "Hello\\u0001World\\u0002!"}');
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should preserve valid whitespace control chars (\\t, \\n, \\r) in strings", () => {
      const input = '{"text": "tab\tnewline\nreturn\r"}';
      const result = normalizeCharacters(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should escape null character in string", () => {
      const input = '{"text": "null\u0000char"}';
      const result = normalizeCharacters(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"text": "null\\u0000char"}');
    });

    it("should escape vertical tab in string", () => {
      const input = '{"text": "vertical\u000Btab"}';
      const result = normalizeCharacters(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"text": "vertical\\u000btab"}');
    });

    it("should include diagnostics for escaped control chars", () => {
      const input = '{"text": "Hello\u0001\u0002"}';
      const result = normalizeCharacters(input);

      expect(result.changed).toBe(true);
      expect(result.diagnostics).toBeDefined();
      expect(
        result.diagnostics?.some(
          (d: string) => d.includes("Escaped") && d.includes("control character"),
        ),
      ).toBe(true);
    });
  });

  describe("fixes invalid escape sequences inside strings", () => {
    it("fixes backslash-space (\\ ) inside a string value", () => {
      const input = `{"implementation": "The backslash escaping (e.g., '\\ ' for spaces) follows XML syntax"}`;
      const result = normalizeCharacters(input);
      expect(result.content).toBe(
        `{"implementation": "The backslash escaping (e.g., ' ' for spaces) follows XML syntax"}`,
      );
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("fixes multiple backslash-space sequences", () => {
      const input = `{"text": "example\\  with\\  multiple\\  spaces"}`;
      const result = normalizeCharacters(input);
      expect(result.content).toBe(`{"text": "example  with  multiple  spaces"}`);
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("fixes \\x (not valid in JSON)", () => {
      const input = `{"code": "example\\x41"}`;
      const result = normalizeCharacters(input);
      expect(result.content).toBe(`{"code": "example\\\\x41"}`);
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("fixes octal escapes \\1 through \\9", () => {
      const input = `{"text": "octal\\1\\2\\3"}`;
      const result = normalizeCharacters(input);
      expect(result.content).toBe(`{"text": "octal\\\\1\\\\2\\\\3"}`);
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("fixes invalid single-character escapes like \\a, \\c", () => {
      const input = `{"text": "invalid\\a\\c\\d"}`;
      const result = normalizeCharacters(input);
      expect(result.content).toBe(`{"text": "invalid\\\\a\\\\c\\\\d"}`);
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("does not modify valid escape sequences", () => {
      const input = `{"text": "valid\\"quotes\\nnewline\\ttab\\rreturn\\\\backslash\\/slash"}`;
      const result = normalizeCharacters(input);
      expect(result.content).toBe(input); // No changes
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("keeps valid \\uXXXX sequences unchanged", () => {
      const input = `{"text": "unicode\\u0041\\u0042"}`;
      const result = normalizeCharacters(input);
      expect(result.content).toBe(input); // No changes
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("fixes incomplete unicode escapes (\\u without 4 hex digits)", () => {
      const input = `{"text": "incomplete\\u41"}`;
      const result = normalizeCharacters(input);
      expect(result.content).toBe(`{"text": "incomplete\\\\u41"}`);
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("fixes unicode escapes with non-hex characters", () => {
      const input = `{"text": "invalid\\uXYZW"}`;
      const result = normalizeCharacters(input);
      expect(result.content).toBe(`{"text": "invalid\\\\uXYZW"}`);
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("handles mixed valid and invalid escapes correctly", () => {
      const input = `{"text": "valid\\nnewline invalid\\  space valid\\ttab invalid\\x42"}`;
      const result = normalizeCharacters(input);
      expect(result.content).toBe(
        `{"text": "valid\\nnewline invalid  space valid\\ttab invalid\\\\x42"}`,
      );
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("includes diagnostics for invalid escapes", () => {
      const input = `{"text": "invalid\\  space\\x42"}`;
      const result = normalizeCharacters(input);

      expect(result.changed).toBe(true);
      expect(result.diagnostics).toBeDefined();
      expect(result.diagnostics?.some((d: string) => d.includes("invalid escape"))).toBe(true);
    });
  });

  describe("fixes over-escaped sequences inside strings", () => {
    it("fixes 5-backslash over-escaped single quotes", () => {
      const input = `{"text": "it\\\\\\'s working"}`;
      const result = normalizeCharacters(input);
      expect(result.content).toBe(`{"text": "it's working"}`);
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("fixes 4-backslash over-escaped single quotes", () => {
      const input = `{"text": "it\\\\'s working"}`;
      const result = normalizeCharacters(input);
      expect(result.content).toBe(`{"text": "it's working"}`);
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("fixes 3-backslash over-escaped single quotes", () => {
      const input = `{"text": "it\\'s working"}`;
      const result = normalizeCharacters(input);
      expect(result.content).toBe(`{"text": "it's working"}`);
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("fixes over-escaped null sequences", () => {
      const input = `{"text": "path\\\\\\0more \\0 end"}`;
      const result = normalizeCharacters(input);
      // \0 is not valid JSON, so it's converted to \u0000
      expect(result.content).toBe(`{"text": "path\\u0000more \\u0000 end"}`);
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("removes stray backslashes before commas", () => {
      const input = `{"text": "value\\, next"}`;
      const result = normalizeCharacters(input);
      expect(result.content).toBe(`{"text": "value, next"}`);
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("removes stray backslashes before parentheses", () => {
      const input = `{"text": "func()\\)"}`;
      const result = normalizeCharacters(input);
      expect(result.content).toBe(`{"text": "func())"}`);
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("handles complex JSON with multiple over-escaping issues", () => {
      const input = `{"message": "it\\\\\\'s working\\, isn\\\\\\'t it\\\\)"}`;
      const result = normalizeCharacters(input);
      expect(result.content).toBe(`{"message": "it's working, isn't it)"}`);
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("includes diagnostics for over-escaped sequences", () => {
      const input = `{"text": "it\\\\\\'s"}`;
      const result = normalizeCharacters(input);

      expect(result.changed).toBe(true);
      expect(result.diagnostics).toBeDefined();
      expect(result.diagnostics?.some((d: string) => d.includes("over-escaped"))).toBe(true);
    });
  });

  describe("combined fixes", () => {
    it("handles control chars outside strings, invalid escapes inside, and over-escapes", () => {
      const input = '\u200B{"text": "invalid\\  space\\\\\\\'quote"}';
      const result = normalizeCharacters(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"text": "invalid  space\'quote"}');
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("handles curly quotes with control chars and escape sequences", () => {
      const input = '\uFEFF{\u201Cname\u201D: "value",\u0000"text": "invalid\\  escape"}';
      const result = normalizeCharacters(input);

      expect(result.changed).toBe(true);
      expect(() => JSON.parse(result.content)).not.toThrow();
      expect(result.diagnostics).toBeDefined();
      expect(result.diagnostics?.length).toBeGreaterThan(0);
    });

    it("handles all fix types together in complex JSON", () => {
      const input =
        '\uFEFF{\u200B"purpose": "Test",\u0000"implementation": "Has\\  invalid escape\\\\\\\'quote",\u000B"control": "char\u0001here"}';
      const result = normalizeCharacters(input);

      expect(result.changed).toBe(true);
      expect(() => JSON.parse(result.content)).not.toThrow();
      expect(result.diagnostics).toBeDefined();
      expect(result.diagnostics?.length).toBeGreaterThan(0);
    });
  });

  describe("edge cases", () => {
    it("returns unchanged when no issues present", () => {
      const input = '{ "key": "value" }';
      const result = normalizeCharacters(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
      expect(result.description).toBeUndefined();
    });

    it("should not modify valid JSON without curly quotes", () => {
      const input = '{"name": "value", "property": "test"}';
      const result = normalizeCharacters(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("handles empty string", () => {
      const input = "";
      const result = normalizeCharacters(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe("");
    });

    it("handles strings with no escapes", () => {
      const input = `{"text": "plain text without escapes"}`;
      const result = normalizeCharacters(input);
      expect(result.content).toBe(input);
    });

    it("handles escaped quotes correctly (doesn't break string detection)", () => {
      const input = `{"text": "quote\\"inside"}`;
      const result = normalizeCharacters(input);
      expect(result.content).toBe(input); // No changes - valid escape
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("handles double-escaped backslashes correctly", () => {
      const input = `{"text": "backslash\\\\here"}`;
      const result = normalizeCharacters(input);
      expect(result.content).toBe(input); // No changes - valid escape
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("does not modify escape sequences outside strings", () => {
      // Escape sequences outside strings are not JSON syntax issues
      const input = `{"key": "value"} // comment with \\x`;
      const result = normalizeCharacters(input);
      // Should only fix things inside strings, but control chars outside will be removed
      expect(result.content).not.toContain("\u0000");
    });

    it("handles nested structures", () => {
      const input = '{ "nested": { "array": [1, 2, 3] } }';
      const result = normalizeCharacters(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("handles control chars at boundaries", () => {
      const input = '\u200B{"key":"value"}\uFEFF';
      const result = normalizeCharacters(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"key":"value"}');
    });

    it("preserves printable special characters", () => {
      const input = '{ "special": "©®™€£¥" }';
      const result = normalizeCharacters(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("preserves emojis and unicode", () => {
      const input = '{ "emoji": "😀🎉✨" }';
      const result = normalizeCharacters(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should handle complete JSON object with curly quotes", () => {
      const input = `{
  \u201Cname\u201D: \u201CCalls\u201D,
  \u201Ckind\u201D: \u201CCLASS\u201D,
  \u201DexternalReferences\u201D: [
    "retrofit2.Call"
  ]
}`;

      const result = normalizeCharacters(input);

      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("\u201C"); // Left curly quote
      expect(result.content).not.toContain("\u201D"); // Right curly quote
      expect(result.content).toContain('"externalReferences"');
      // Verify the JSON can be parsed
      expect(() => JSON.parse(result.content)).not.toThrow();
    });
  });

  describe("real-world error cases", () => {
    it("fixes the exact error case from error logs", () => {
      const problematicString = `"The backslash escaping in the public identifiers (e.g., '\\ ' for spaces) follows XML catalog syntax requirements."`;
      const fullJson = `{"implementation": ${problematicString}}`;
      const result = normalizeCharacters(fullJson);

      // Should be parseable
      expect(() => JSON.parse(result.content)).not.toThrow();

      // Verify the backslash-space was fixed
      expect(result.content).not.toContain("\\ ");
      expect(result.content).toContain("(e.g., ' ' for spaces)");
    });
  });
});
