import {
  fixInvalidEscapeSequences,
  fixInvalidEscapeSequencesSanitizer,
} from "../../../src/llm/json-processing/sanitizers/fix-invalid-escape-sequences";

describe("fixInvalidEscapeSequences", () => {
  describe("backslash-space (\\ ) - the primary issue", () => {
    it("fixes backslash-space inside a string value", () => {
      // This is the actual error case from the log
      const input = `{"implementation": "The backslash escaping (e.g., '\\ ' for spaces) follows XML syntax"}`;
      const result = fixInvalidEscapeSequences(input);
      expect(result).toBe(
        `{"implementation": "The backslash escaping (e.g., ' ' for spaces) follows XML syntax"}`,
      );
      // Should be parseable now
      expect(() => JSON.parse(result)).not.toThrow();
    });

    it("fixes multiple backslash-space sequences", () => {
      const input = `{"text": "example\\  with\\  multiple\\  spaces"}`;
      const result = fixInvalidEscapeSequences(input);
      expect(result).toBe(`{"text": "example  with  multiple  spaces"}`);
      expect(() => JSON.parse(result)).not.toThrow();
    });

    it("only fixes backslash-space inside string literals", () => {
      const input = `{"key": "value\\  here", "other": "normal"}`;
      const result = fixInvalidEscapeSequences(input);
      expect(result).toBe(`{"key": "value  here", "other": "normal"}`);
      expect(() => JSON.parse(result)).not.toThrow();
    });
  });

  describe("other invalid escape sequences", () => {
    it("fixes \\x (not valid in JSON)", () => {
      const input = `{"code": "example\\x41"}`;
      const result = fixInvalidEscapeSequences(input);
      expect(result).toBe(`{"code": "example\\\\x41"}`);
      expect(() => JSON.parse(result)).not.toThrow();
    });

    it("fixes octal escapes \\1 through \\9", () => {
      const input = `{"text": "octal\\1\\2\\3"}`;
      const result = fixInvalidEscapeSequences(input);
      expect(result).toBe(`{"text": "octal\\\\1\\\\2\\\\3"}`);
      expect(() => JSON.parse(result)).not.toThrow();
    });

    it("fixes invalid single-character escapes like \\a, \\c", () => {
      const input = `{"text": "invalid\\a\\c\\d"}`;
      const result = fixInvalidEscapeSequences(input);
      expect(result).toBe(`{"text": "invalid\\\\a\\\\c\\\\d"}`);
      expect(() => JSON.parse(result)).not.toThrow();
    });

    it("does not modify valid escape sequences", () => {
      const input = `{"text": "valid\\"quotes\\nnewline\\ttab\\rreturn\\\\backslash\\/slash"}`;
      const result = fixInvalidEscapeSequences(input);
      expect(result).toBe(input); // No changes
      expect(() => JSON.parse(result)).not.toThrow();
    });
  });

  describe("unicode escape sequences", () => {
    it("keeps valid \\uXXXX sequences unchanged", () => {
      const input = `{"text": "unicode\\u0041\\u0042"}`;
      const result = fixInvalidEscapeSequences(input);
      expect(result).toBe(input); // No changes
      expect(() => JSON.parse(result)).not.toThrow();
    });

    it("fixes incomplete unicode escapes (\\u without 4 hex digits)", () => {
      const input = `{"text": "incomplete\\u41"}`;
      const result = fixInvalidEscapeSequences(input);
      expect(result).toBe(`{"text": "incomplete\\\\u41"}`);
      expect(() => JSON.parse(result)).not.toThrow();
    });

    it("fixes unicode escapes with non-hex characters", () => {
      const input = `{"text": "invalid\\uXYZW"}`;
      const result = fixInvalidEscapeSequences(input);
      expect(result).toBe(`{"text": "invalid\\\\uXYZW"}`);
      expect(() => JSON.parse(result)).not.toThrow();
    });

    it("fixes unicode escapes with partial hex (e.g., \\u00)", () => {
      const input = `{"text": "partial\\u00"}`;
      const result = fixInvalidEscapeSequences(input);
      expect(result).toBe(`{"text": "partial\\\\u00"}`);
      expect(() => JSON.parse(result)).not.toThrow();
    });
  });

  describe("mixed valid and invalid escapes", () => {
    it("handles mixed escape sequences correctly", () => {
      const input = `{"text": "valid\\nnewline invalid\\  space valid\\ttab invalid\\x42"}`;
      const result = fixInvalidEscapeSequences(input);
      expect(result).toBe(`{"text": "valid\\nnewline invalid  space valid\\ttab invalid\\\\x42"}`);
      expect(() => JSON.parse(result)).not.toThrow();
    });
  });

  describe("edge cases", () => {
    it("handles empty strings", () => {
      const input = `{"empty": ""}`;
      const result = fixInvalidEscapeSequences(input);
      expect(result).toBe(input);
      expect(() => JSON.parse(result)).not.toThrow();
    });

    it("handles strings with no escapes", () => {
      const input = `{"text": "plain text without escapes"}`;
      const result = fixInvalidEscapeSequences(input);
      expect(result).toBe(input);
    });

    it("handles escaped quotes correctly (doesn't break string detection)", () => {
      const input = `{"text": "quote\\"inside"}`;
      const result = fixInvalidEscapeSequences(input);
      expect(result).toBe(input); // No changes - valid escape
      expect(() => JSON.parse(result)).not.toThrow();
    });

    it("handles double-escaped backslashes correctly", () => {
      const input = `{"text": "backslash\\\\here"}`;
      const result = fixInvalidEscapeSequences(input);
      expect(result).toBe(input); // No changes - valid escape
      expect(() => JSON.parse(result)).not.toThrow();
    });

    it("does not modify escape sequences outside strings", () => {
      // Escape sequences outside strings are not JSON syntax issues
      const input = `{"key": "value"} // comment with \\x`;
      const result = fixInvalidEscapeSequences(input);
      // Should only fix things inside strings
      expect(result).toBe(input);
    });
  });

  describe("real-world error case from log", () => {
    it("fixes the exact error case from the error log", () => {
      // This is the exact problematic string from the error log
      const problematicString = `"The backslash escaping in the public identifiers (e.g., '\\ ' for spaces) follows XML catalog syntax requirements."`;
      const fullJson = `{"implementation": ${problematicString}}`;
      const result = fixInvalidEscapeSequences(fullJson);

      // Should be parseable
      expect(() => JSON.parse(result)).not.toThrow();

      // Verify the backslash-space was fixed
      expect(result).not.toContain("\\ ");
      // After fixing, the \  becomes just a space, so '(e.g., ' ' becomes '(e.g., ' '
      expect(result).toContain("(e.g., ' ' for spaces)"); // Single quote, space, single quote
    });
  });
});

describe("fixInvalidEscapeSequencesSanitizer", () => {
  it("returns unchanged content when no invalid escapes are found", () => {
    const input = `{"text": "valid\\nnewline"}`;
    const result = fixInvalidEscapeSequencesSanitizer(input);
    expect(result.changed).toBe(false);
    expect(result.content).toBe(input);
    expect(result.description).toBeUndefined();
  });

  it("returns changed content when invalid escapes are fixed", () => {
    const input = `{"text": "invalid\\  space"}`;
    const result = fixInvalidEscapeSequencesSanitizer(input);
    expect(result.changed).toBe(true);
    expect(result.content).toBe(`{"text": "invalid  space"}`);
    expect(result.description).toBeDefined();
    expect(result.description).toContain("invalid escape");
    expect(result.diagnostics).toBeDefined();
    expect(result.diagnostics?.length).toBeGreaterThan(0);
  });

  it("includes diagnostics for multiple fixes", () => {
    const input = `{"text": "multiple\\  spaces\\x42invalid"}`;
    const result = fixInvalidEscapeSequencesSanitizer(input);
    expect(result.changed).toBe(true);
    expect(result.diagnostics).toBeDefined();
    expect(result.diagnostics?.length).toBeGreaterThanOrEqual(2);
  });

  it("handles complex JSON structures", () => {
    const input = `{
      "purpose": "Test",
      "implementation": "Has\\  invalid escape",
      "databaseIntegration": {
        "mechanism": "NONE",
        "description": "Another\\x invalid"
      }
    }`;
    const result = fixInvalidEscapeSequencesSanitizer(input);
    expect(result.changed).toBe(true);
    expect(() => JSON.parse(result.content)).not.toThrow();
  });
});
