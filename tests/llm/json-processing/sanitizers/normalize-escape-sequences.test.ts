import { normalizeEscapeSequences } from "../../../../src/llm/json-processing/sanitizers/normalize-escape-sequences";

describe("normalizeEscapeSequences", () => {
  describe("removes control characters outside strings", () => {
    it("should remove zero-width spaces", () => {
      const input = '{\u200B"key"\u200B:\u200B"value"\u200B}';
      const result = normalizeEscapeSequences(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"key":"value"}');
      expect(result.description).toBe("Normalized escape sequences and control characters");
    });

    it("should remove zero-width non-joiner", () => {
      const input = '{\u200C"name"\u200C:\u200C"John"\u200C}';
      const result = normalizeEscapeSequences(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"name":"John"}');
    });

    it("should remove zero-width joiner", () => {
      const input = '{\u200D"key"\u200D:\u200D"value"\u200D}';
      const result = normalizeEscapeSequences(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"key":"value"}');
    });

    it("should remove BOM (zero-width no-break space)", () => {
      const input = '\uFEFF{ "key": "value" }';
      const result = normalizeEscapeSequences(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{ "key": "value" }');
    });

    it("should remove NULL characters", () => {
      const input = '{\u0000"key"\u0000:\u0000"value"\u0000}';
      const result = normalizeEscapeSequences(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"key":"value"}');
    });

    it("should remove vertical tab", () => {
      const input = '{\u000B"key":\u000B"value"}';
      const result = normalizeEscapeSequences(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"key":"value"}');
    });

    it("should remove form feed", () => {
      const input = '{\u000C"key":\u000C"value"}';
      const result = normalizeEscapeSequences(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"key":"value"}');
    });

    it("should remove multiple types of control characters", () => {
      const input = '\uFEFF{\u200B\u0000"key"\u200C:\u000B"value"\u200D}\u000C';
      const result = normalizeEscapeSequences(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"key":"value"}');
    });

    it("should preserve valid whitespace (tabs, newlines, carriage returns)", () => {
      const input = '{\n\t "key": "value"\r\n}';
      const result = normalizeEscapeSequences(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });
  });

  describe("escapes control characters inside strings", () => {
    it("should escape control characters in string values", () => {
      const input = '{"message": "Hello\u0001World\u0002!"}';
      const result = normalizeEscapeSequences(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"message": "Hello\\u0001World\\u0002!"}');
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should preserve valid whitespace control chars (\\t, \\n, \\r) in strings", () => {
      const input = '{"text": "tab\tnewline\nreturn\r"}';
      const result = normalizeEscapeSequences(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should escape null character in string", () => {
      const input = '{"text": "null\u0000char"}';
      const result = normalizeEscapeSequences(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"text": "null\\u0000char"}');
    });

    it("should escape vertical tab in string", () => {
      const input = '{"text": "vertical\u000Btab"}';
      const result = normalizeEscapeSequences(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"text": "vertical\\u000btab"}');
    });

    it("should include diagnostics for escaped control chars", () => {
      const input = '{"text": "Hello\u0001\u0002"}';
      const result = normalizeEscapeSequences(input);

      expect(result.changed).toBe(true);
      expect(result.diagnostics).toBeDefined();
      expect(
        result.diagnostics?.some((d) => d.includes("Escaped") && d.includes("control character")),
      ).toBe(true);
    });
  });

  describe("fixes invalid escape sequences inside strings", () => {
    it("fixes backslash-space (\\ ) inside a string value", () => {
      const input = `{"implementation": "The backslash escaping (e.g., '\\ ' for spaces) follows XML syntax"}`;
      const result = normalizeEscapeSequences(input);
      expect(result.content).toBe(
        `{"implementation": "The backslash escaping (e.g., ' ' for spaces) follows XML syntax"}`,
      );
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("fixes multiple backslash-space sequences", () => {
      const input = `{"text": "example\\  with\\  multiple\\  spaces"}`;
      const result = normalizeEscapeSequences(input);
      expect(result.content).toBe(`{"text": "example  with  multiple  spaces"}`);
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("fixes \\x (not valid in JSON)", () => {
      const input = `{"code": "example\\x41"}`;
      const result = normalizeEscapeSequences(input);
      expect(result.content).toBe(`{"code": "example\\\\x41"}`);
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("fixes octal escapes \\1 through \\9", () => {
      const input = `{"text": "octal\\1\\2\\3"}`;
      const result = normalizeEscapeSequences(input);
      expect(result.content).toBe(`{"text": "octal\\\\1\\\\2\\\\3"}`);
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("fixes invalid single-character escapes like \\a, \\c", () => {
      const input = `{"text": "invalid\\a\\c\\d"}`;
      const result = normalizeEscapeSequences(input);
      expect(result.content).toBe(`{"text": "invalid\\\\a\\\\c\\\\d"}`);
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("does not modify valid escape sequences", () => {
      const input = `{"text": "valid\\"quotes\\nnewline\\ttab\\rreturn\\\\backslash\\/slash"}`;
      const result = normalizeEscapeSequences(input);
      expect(result.content).toBe(input); // No changes
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("keeps valid \\uXXXX sequences unchanged", () => {
      const input = `{"text": "unicode\\u0041\\u0042"}`;
      const result = normalizeEscapeSequences(input);
      expect(result.content).toBe(input); // No changes
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("fixes incomplete unicode escapes (\\u without 4 hex digits)", () => {
      const input = `{"text": "incomplete\\u41"}`;
      const result = normalizeEscapeSequences(input);
      expect(result.content).toBe(`{"text": "incomplete\\\\u41"}`);
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("fixes unicode escapes with non-hex characters", () => {
      const input = `{"text": "invalid\\uXYZW"}`;
      const result = normalizeEscapeSequences(input);
      expect(result.content).toBe(`{"text": "invalid\\\\uXYZW"}`);
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("handles mixed valid and invalid escapes correctly", () => {
      const input = `{"text": "valid\\nnewline invalid\\  space valid\\ttab invalid\\x42"}`;
      const result = normalizeEscapeSequences(input);
      expect(result.content).toBe(
        `{"text": "valid\\nnewline invalid  space valid\\ttab invalid\\\\x42"}`,
      );
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("includes diagnostics for invalid escapes", () => {
      const input = `{"text": "invalid\\  space\\x42"}`;
      const result = normalizeEscapeSequences(input);

      expect(result.changed).toBe(true);
      expect(result.diagnostics).toBeDefined();
      expect(result.diagnostics?.some((d) => d.includes("invalid escape"))).toBe(true);
    });
  });

  describe("fixes over-escaped sequences inside strings", () => {
    it("fixes 5-backslash over-escaped single quotes", () => {
      const input = `{"text": "it\\\\\\'s working"}`;
      const result = normalizeEscapeSequences(input);
      expect(result.content).toBe(`{"text": "it's working"}`);
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("fixes 4-backslash over-escaped single quotes", () => {
      const input = `{"text": "it\\\\'s working"}`;
      const result = normalizeEscapeSequences(input);
      expect(result.content).toBe(`{"text": "it's working"}`);
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("fixes 3-backslash over-escaped single quotes", () => {
      const input = `{"text": "it\\'s working"}`;
      const result = normalizeEscapeSequences(input);
      expect(result.content).toBe(`{"text": "it's working"}`);
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("fixes over-escaped null sequences", () => {
      const input = `{"text": "path\\\\\\0more \\0 end"}`;
      const result = normalizeEscapeSequences(input);
      // \0 is not valid JSON, so it's converted to \u0000
      expect(result.content).toBe(`{"text": "path\\u0000more \\u0000 end"}`);
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("removes stray backslashes before commas", () => {
      const input = `{"text": "value\\, next"}`;
      const result = normalizeEscapeSequences(input);
      expect(result.content).toBe(`{"text": "value, next"}`);
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("removes stray backslashes before parentheses", () => {
      const input = `{"text": "func()\\)"}`;
      const result = normalizeEscapeSequences(input);
      expect(result.content).toBe(`{"text": "func())"}`);
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("handles complex JSON with multiple over-escaping issues", () => {
      const input = `{"message": "it\\\\\\'s working\\, isn\\\\\\'t it\\\\)"}`;
      const result = normalizeEscapeSequences(input);
      expect(result.content).toBe(`{"message": "it's working, isn't it)"}`);
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("includes diagnostics for over-escaped sequences", () => {
      const input = `{"text": "it\\\\\\'s"}`;
      const result = normalizeEscapeSequences(input);

      expect(result.changed).toBe(true);
      expect(result.diagnostics).toBeDefined();
      expect(result.diagnostics?.some((d) => d.includes("over-escaped"))).toBe(true);
    });
  });

  describe("combined fixes", () => {
    it("handles control chars outside strings, invalid escapes inside, and over-escapes", () => {
      const input = '\u200B{"text": "invalid\\  space\\\\\\\'quote"}';
      const result = normalizeEscapeSequences(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"text": "invalid  space\'quote"}');
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("handles all fix types together in complex JSON", () => {
      const input =
        '\uFEFF{\u200B"purpose": "Test",\u0000"implementation": "Has\\  invalid escape\\\\\\\'quote",\u000B"control": "char\u0001here"}';
      const result = normalizeEscapeSequences(input);

      expect(result.changed).toBe(true);
      expect(() => JSON.parse(result.content)).not.toThrow();
      expect(result.diagnostics).toBeDefined();
      expect(result.diagnostics?.length).toBeGreaterThan(0);
    });
  });

  describe("edge cases", () => {
    it("returns unchanged when no issues present", () => {
      const input = '{ "key": "value" }';
      const result = normalizeEscapeSequences(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
      expect(result.description).toBeUndefined();
    });

    it("handles empty string", () => {
      const input = "";
      const result = normalizeEscapeSequences(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe("");
    });

    it("handles strings with no escapes", () => {
      const input = `{"text": "plain text without escapes"}`;
      const result = normalizeEscapeSequences(input);
      expect(result.content).toBe(input);
    });

    it("handles escaped quotes correctly (doesn't break string detection)", () => {
      const input = `{"text": "quote\\"inside"}`;
      const result = normalizeEscapeSequences(input);
      expect(result.content).toBe(input); // No changes - valid escape
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("handles double-escaped backslashes correctly", () => {
      const input = `{"text": "backslash\\\\here"}`;
      const result = normalizeEscapeSequences(input);
      expect(result.content).toBe(input); // No changes - valid escape
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("does not modify escape sequences outside strings", () => {
      // Escape sequences outside strings are not JSON syntax issues
      const input = `{"key": "value"} // comment with \\x`;
      const result = normalizeEscapeSequences(input);
      // Should only fix things inside strings, but control chars outside will be removed
      expect(result.content).not.toContain("\u0000");
    });

    it("handles nested structures", () => {
      const input = '{ "nested": { "array": [1, 2, 3] } }';
      const result = normalizeEscapeSequences(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("handles control chars at boundaries", () => {
      const input = '\u200B{"key":"value"}\uFEFF';
      const result = normalizeEscapeSequences(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"key":"value"}');
    });

    it("preserves printable special characters", () => {
      const input = '{ "special": "©®™€£¥" }';
      const result = normalizeEscapeSequences(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("preserves emojis and unicode", () => {
      const input = '{ "emoji": "😀🎉✨" }';
      const result = normalizeEscapeSequences(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });
  });

  describe("real-world error cases", () => {
    it("fixes the exact error case from error logs", () => {
      const problematicString = `"The backslash escaping in the public identifiers (e.g., '\\ ' for spaces) follows XML catalog syntax requirements."`;
      const fullJson = `{"implementation": ${problematicString}}`;
      const result = normalizeEscapeSequences(fullJson);

      // Should be parseable
      expect(() => JSON.parse(result.content)).not.toThrow();

      // Verify the backslash-space was fixed
      expect(result.content).not.toContain("\\ ");
      expect(result.content).toContain("(e.g., ' ' for spaces)");
    });
  });
});
