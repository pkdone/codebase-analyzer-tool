import { repairOverEscapedStringSequences } from "../../../src/llm/json-processing/sanitizers/fix-over-escaped-sequences";

/**
 * Guards the extracted over-escaped sequence repair logic to ensure no regressions.
 */

describe("repairOverEscapedStringSequences", () => {
  it("reduces excessive backslashes around single quotes", () => {
    const input = "\\\\\\'test\\\\\\'"; // represents \\\'test\\\'
    const result = repairOverEscapedStringSequences(input);
    expect(result).toBe("'test'");
  });

  it("collapses over-escaped null sequences", () => {
    const input = "path\\\\0more \\0 end"; // contains \\\\0 then \\0
    const result = repairOverEscapedStringSequences(input);
    expect(result).toBe("path\\0more \\0 end");
  });

  it("removes stray backslashes before commas and parentheses", () => {
    const input = "value\\, next\\)";
    const result = repairOverEscapedStringSequences(input);
    expect(result).toBe("value, next)");
  });

  it("is idempotent for already clean string", () => {
    const input = "simple clean";
    expect(repairOverEscapedStringSequences(input)).toBe(input);
  });
});

/**
 * Comprehensive tests that verify the documented behavior with specific examples.
 * Each test corresponds to a documented pattern in fix-over-escaped-sequences.ts.
 */
describe("repairOverEscapedStringSequences - comprehensive documentation examples", () => {
  describe("over-escaped single quotes (5, 4, and 3 backslashes)", () => {
    it("fixes 5-backslash over-escaped single quotes", () => {
      // Pattern: \\\\\' → '
      // Example from documentation: "it\\\\\\'s" → "it's"
      const input = "it\\\\\\'s";
      const result = repairOverEscapedStringSequences(input);
      expect(result).toBe("it's");
    });

    it("fixes 4-backslash over-escaped single quotes", () => {
      // Pattern: \\\\' → '
      // Example from documentation: "it\\\\'s" → "it's"
      const input = "it\\\\'s";
      const result = repairOverEscapedStringSequences(input);
      expect(result).toBe("it's");
    });

    it("fixes 3-backslash over-escaped single quotes", () => {
      // Pattern: \\' → '
      // Example from documentation: "it\\'s" → "it's"
      const input = "it\\'s";
      const result = repairOverEscapedStringSequences(input);
      expect(result).toBe("it's");
    });

    it("handles multiple over-escaped quotes in same string", () => {
      const input = "don\\\\\\'t won\\\\\\'t can\\\\\\'t";
      const result = repairOverEscapedStringSequences(input);
      expect(result).toBe("don't won't can't");
    });
  });

  describe("over-escaped quotes followed by period", () => {
    it("fixes 5-backslash quote followed by dot", () => {
      // Pattern: \\\\\\'\. → '. (partial - leaves backslash before dot)
      // Example from documentation: "user\\\\\\'\.name" → "user'\\.name"
      // eslint-disable-next-line no-useless-escape
      const input = "user\\\\\\'\\\.name";
      const result = repairOverEscapedStringSequences(input);
      // The function fixes the quote but preserves the dot escape pattern
      expect(result).toBe("user'\\.name");
    });

    it("fixes backslash-quote followed by dot", () => {
      // Pattern: \\'\. → '. (partial - leaves backslash before dot)
      // Example from documentation: "user\\'\\.name" → "user'\\\\.name"
      const input = "user\\'\\\\.name";
      const result = repairOverEscapedStringSequences(input);
      // The function fixes the quote but preserves some backslash patterns
      expect(result).toBe("user'\\\\.name");
    });
  });

  describe("consecutive over-escaped quotes", () => {
    it("fixes two 5-backslash quotes in sequence", () => {
      // Pattern: \\\\\\'\\\\\\' → ''
      // Example from documentation: "\\\\\\'\\\\\\'" → "''"
      // eslint-disable-next-line no-useless-escape
      const input = "\\\\\\'\\\\\\\'";
      const result = repairOverEscapedStringSequences(input);
      expect(result).toBe("''");
    });

    it("fixes backslash-quote patterns in sequence", () => {
      // Pattern: \\'\\\\' → ''
      // Example from documentation: "\\'\\\\'" → "''"
      // eslint-disable-next-line no-useless-escape
      const input = "\\'\\\\\'";
      const result = repairOverEscapedStringSequences(input);
      expect(result).toBe("''");
    });
  });

  describe("over-escaped null characters", () => {
    it("reduces 5-backslash null to proper null escape", () => {
      // Pattern: \\\\\0 → \0
      // Example from documentation: "value\\\\\0" → "value\0"
      const input = "value\\\\\\0";
      const result = repairOverEscapedStringSequences(input);
      expect(result).toBe("value\\0");
    });

    it("reduces 4-backslash null to proper null escape", () => {
      // Pattern: \\\\0 → \0
      // Example from documentation: "value\\\\0" → "value\0"
      const input = "value\\\\0";
      const result = repairOverEscapedStringSequences(input);
      expect(result).toBe("value\\0");
    });

    it("handles multiple null characters in same string", () => {
      const input = "first\\\\\\0second\\\\0third";
      const result = repairOverEscapedStringSequences(input);
      expect(result).toBe("first\\0second\\0third");
    });
  });

  describe("over-escaped commas (from code snippets)", () => {
    it("removes double backslashes before comma", () => {
      // Pattern: \\\\ followed by comma → comma
      // Example from documentation: "a\\\\, b" → "a, b"
      const input = "a\\\\, b";
      const result = repairOverEscapedStringSequences(input);
      expect(result).toBe("a, b");
    });

    it("removes single backslash before comma", () => {
      // Pattern: \\ followed by comma → comma
      // Example from documentation: "a\\, b" → "a, b"
      const input = "a\\, b";
      const result = repairOverEscapedStringSequences(input);
      expect(result).toBe("a, b");
    });

    it("handles multiple escaped commas in list", () => {
      const input = "item1\\, item2\\\\, item3\\, item4";
      const result = repairOverEscapedStringSequences(input);
      expect(result).toBe("item1, item2, item3, item4");
    });
  });

  describe("over-escaped parentheses (from code snippets)", () => {
    it("removes double backslashes before closing parenthesis", () => {
      // Pattern: \\\\ followed by ) → )
      // Example from documentation: "func()\\\\)" → "func())"
      const input = "func()\\\\)";
      const result = repairOverEscapedStringSequences(input);
      expect(result).toBe("func())");
    });

    it("removes single backslash before closing parenthesis", () => {
      // Pattern: \\ followed by ) → )
      // Example from documentation: "func()\\)" → "func())"
      const input = "func()\\)";
      const result = repairOverEscapedStringSequences(input);
      expect(result).toBe("func())");
    });

    it("handles function signatures with escaped parentheses", () => {
      const input = "myFunc(a\\, b\\\\)";
      const result = repairOverEscapedStringSequences(input);
      expect(result).toBe("myFunc(a, b)");
    });
  });

  describe("complex real-world scenarios", () => {
    it("handles JSON-like string with multiple over-escaping issues", () => {
      const input = `{"message": "it\\\\\\'s working\\, isn\\\\\\'t it\\\\)"}`;
      const result = repairOverEscapedStringSequences(input);
      expect(result).toBe(`{"message": "it's working, isn't it)"}`);
    });

    it("handles code snippets with various escape issues", () => {
      const input = "function test(a\\, b\\) { return a + b\\\\, }";
      const result = repairOverEscapedStringSequences(input);
      expect(result).toBe("function test(a, b) { return a + b, }");
    });

    it("handles nested over-escaped patterns", () => {
      const input = "path\\\\\\'\\\\0end\\\\,";
      const result = repairOverEscapedStringSequences(input);
      expect(result).toBe("path'\\0end,");
    });

    it("is safe with already properly escaped content", () => {
      const validJson = '{"key": "value", "number": 123}';
      const result = repairOverEscapedStringSequences(validJson);
      expect(result).toBe(validJson);
    });

    it("handles whitespace around escaped characters", () => {
      const input = "a\\\\  , b\\\\  )";
      const result = repairOverEscapedStringSequences(input);
      // The regex \\\\\s*, and \\\\\s*\) consume whitespace after backslashes
      expect(result).toBe("a, b)");
    });

    it("handles SQL REPLACE function with heavily over-escaped quotes (from direct-test.js)", () => {
      // This test case was originally in direct-test.js and validates the specific
      // SQL over-escaping issue that prompted creation of the sanitizer
      // Pattern: REPLACE(field, '.', '') where quotes and dots are 5-backslash escaped
      const input = "REPLACE(field, \\\\\\'.\\\\\\'\\, \\\\\\'\\\\\\'\\)";
      const result = repairOverEscapedStringSequences(input);
      // After fixing: quotes should be normalized, dots and commas should be clean
      // Note: The exact output depends on how the regex patterns cascade
      expect(result).toContain("REPLACE(field");
      expect(result).toContain("'.'");
      expect(result).toContain("''");
      // More lenient check - ensure it's at least parseable and over-escaping is reduced
      expect(result.match(/\\\\\\\\/g) ?? []).toHaveLength(0); // No 4+ backslashes
    });

    it("handles full JSON with SQL over-escaping from direct-test.js", () => {
      // The complete test case from direct-test.js wrapped in JSON structure
      const testJson = `{
  "test": "REPLACE(field, \\\\\\'.\\\\\\'\\, \\\\\\'\\\\\\'\\)"
}`;
      const result = repairOverEscapedStringSequences(testJson);

      // Should reduce over-escaping significantly
      expect(result).toContain("REPLACE(field");
      // Verify it's more parseable (though may still need other sanitizers)
      const backslashCount = (result.match(/\\/g) ?? []).length;
      const originalBackslashCount = (testJson.match(/\\/g) ?? []).length;
      expect(backslashCount).toBeLessThan(originalBackslashCount);
    });
  });

  describe("edge cases", () => {
    it("handles empty string", () => {
      const result = repairOverEscapedStringSequences("");
      expect(result).toBe("");
    });

    it("handles string with no escapes", () => {
      const input = "plain text without any escapes";
      const result = repairOverEscapedStringSequences(input);
      expect(result).toBe(input);
    });

    it("handles string with only backslashes (not over-escaped)", () => {
      const input = "\\\\\\\\";
      const result = repairOverEscapedStringSequences(input);
      expect(result).toBe("\\\\\\\\"); // No change, these aren't over-escaped patterns
    });

    it("applies fixes progressively from most to least escaped", () => {
      // This test verifies the order matters
      const input = "test\\\\\\'end";
      const result = repairOverEscapedStringSequences(input);
      expect(result).toBe("test'end");
    });
  });
});
