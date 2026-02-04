/**
 * Tests for the repair-over-escaped-sequences module.
 */

import {
  repairOverEscapedStringSequences,
  OVER_ESCAPE_REPLACEMENT_PATTERNS,
} from "../../../../../src/common/llm/json-processing/sanitizers/repair-over-escaped-sequences";

describe("repair-over-escaped-sequences", () => {
  describe("OVER_ESCAPE_REPLACEMENT_PATTERNS", () => {
    it("should have patterns defined", () => {
      expect(OVER_ESCAPE_REPLACEMENT_PATTERNS.length).toBeGreaterThan(0);
    });

    it("should have each pattern with regex, replacement, and description", () => {
      for (const pattern of OVER_ESCAPE_REPLACEMENT_PATTERNS) {
        expect(pattern).toHaveLength(3);
        expect(pattern[0]).toBeInstanceOf(RegExp);
        expect(typeof pattern[1]).toBe("string");
        expect(typeof pattern[2]).toBe("string");
      }
    });
  });

  describe("repairOverEscapedStringSequences", () => {
    describe("single quote over-escaping", () => {
      it("should fix triple-backslash escaped single quotes", () => {
        const input = "it\\'s a test";
        const result = repairOverEscapedStringSequences(input);
        expect(result).toBe("it's a test");
      });

      it("should fix quadruple-backslash escaped single quotes", () => {
        const input = "value\\\\'s test";
        const result = repairOverEscapedStringSequences(input);
        expect(result).toBe("value's test");
      });

      it("should fix quintuple-backslash escaped single quotes", () => {
        const input = "it\\\\\\'s here";
        const result = repairOverEscapedStringSequences(input);
        expect(result).toBe("it's here");
      });
    });

    describe("quote combinations", () => {
      it("should fix mixed quote escaping patterns", () => {
        // Pattern /\\'\\\\'/g matches \'\\' and replaces with ''
        const input = "empty\\'\\\\'string";
        const result = repairOverEscapedStringSequences(input);
        expect(result).toBe("empty''string");
      });

      it("should fix multiple single quotes independently", () => {
        // Each \' gets converted to '
        const input = "it\\'s your\\'s";
        const result = repairOverEscapedStringSequences(input);
        expect(result).toBe("it's your's");
      });
    });

    describe("null character over-escaping", () => {
      it("should fix quadruple-backslash null", () => {
        const input = "prefix\\\\0suffix";
        const result = repairOverEscapedStringSequences(input);
        expect(result).toBe("prefix\\0suffix");
      });

      it("should fix quintuple-backslash null", () => {
        const input = "prefix\\\\\\0suffix";
        const result = repairOverEscapedStringSequences(input);
        expect(result).toBe("prefix\\0suffix");
      });
    });

    describe("code snippet punctuation", () => {
      it("should fix over-escaped commas", () => {
        const input = "func(a\\, b)";
        const result = repairOverEscapedStringSequences(input);
        expect(result).toBe("func(a, b)");
      });

      it("should fix over-escaped closing parentheses", () => {
        const input = "func(x\\)";
        const result = repairOverEscapedStringSequences(input);
        expect(result).toBe("func(x)");
      });

      it("should fix quadruple-backslash commas", () => {
        const input = "params(x\\\\ , y)";
        const result = repairOverEscapedStringSequences(input);
        expect(result).toBe("params(x, y)");
      });

      it("should fix quadruple-backslash closing parentheses", () => {
        const input = "call(arg\\\\ )";
        const result = repairOverEscapedStringSequences(input);
        expect(result).toBe("call(arg)");
      });
    });

    describe("multiple patterns", () => {
      it("should fix multiple different patterns in one string", () => {
        const input = "value\\'s\\, item\\)";
        const result = repairOverEscapedStringSequences(input);
        expect(result).toBe("value's, item)");
      });

      it("should fix same pattern appearing multiple times", () => {
        const input = "it\\'s good and that\\'s fine";
        const result = repairOverEscapedStringSequences(input);
        expect(result).toBe("it's good and that's fine");
      });
    });

    describe("edge cases", () => {
      it("should return empty string unchanged", () => {
        expect(repairOverEscapedStringSequences("")).toBe("");
      });

      it("should not modify strings without over-escaped sequences", () => {
        const input = "normal string without escaping";
        expect(repairOverEscapedStringSequences(input)).toBe(input);
      });

      it("should not modify properly escaped sequences", () => {
        const input = "valid\\nescapes\\tare\\rfine";
        expect(repairOverEscapedStringSequences(input)).toBe(input);
      });

      it("should handle string with only whitespace", () => {
        const input = "   ";
        expect(repairOverEscapedStringSequences(input)).toBe(input);
      });
    });

    describe("real-world examples", () => {
      it("should fix SQL-like query with over-escaped quotes", () => {
        const input = "SELECT * FROM users WHERE name = \\'John\\'";
        const result = repairOverEscapedStringSequences(input);
        expect(result).toBe("SELECT * FROM users WHERE name = 'John'");
      });

      it("should fix function call with over-escaped characters", () => {
        const input = "myFunction(arg1\\, arg2\\)";
        const result = repairOverEscapedStringSequences(input);
        expect(result).toBe("myFunction(arg1, arg2)");
      });
    });
  });
});
