import {
  executeRules,
  executeRulesMultiPass,
  isAfterJsonDelimiter,
  isInPropertyContext,
  isInArrayContext,
} from "../../../../../../src/common/llm/json-processing/sanitizers/rules/rule-executor";
import type {
  ReplacementRule,
  ContextInfo,
} from "../../../../../../src/common/llm/json-processing/sanitizers/rules/replacement-rule.types";

/** Helper to create a ContextInfo for tests */
const createTestContext = (overrides: Partial<ContextInfo>): ContextInfo => ({
  beforeMatch: "",
  offset: 0,
  fullContent: "",
  groups: [],
  ...overrides,
});

describe("rule-executor", () => {
  describe("executeRules", () => {
    it("should return unchanged content when input is empty", () => {
      const result = executeRules("", []);
      expect(result.changed).toBe(false);
      expect(result.content).toBe("");
    });

    it("should return unchanged content when no rules provided", () => {
      const result = executeRules('{"key": "value"}', []);
      expect(result.changed).toBe(false);
      expect(result.content).toBe('{"key": "value"}');
    });

    it("should apply a simple replacement rule", () => {
      const rule: ReplacementRule = {
        name: "testRule",
        pattern: /foo/g,
        replacement: () => "bar",
        diagnosticMessage: "Replaced foo with bar",
      };

      const result = executeRules("foo baz foo", [rule]);
      expect(result.changed).toBe(true);
      expect(result.content).toBe("bar baz bar");
      expect(result.diagnostics).toContain("Replaced foo with bar");
    });

    it("should skip matches inside string literals when skipInString is true (default)", () => {
      const rule: ReplacementRule = {
        name: "testRule",
        pattern: /foo/g,
        replacement: () => "bar",
        diagnosticMessage: "Replaced foo with bar",
      };

      // The 'foo' inside the string should be skipped
      const input = '{"key": "foo value"}';
      const result = executeRules(input, [rule]);
      // Since 'foo' is inside a string, it should NOT be replaced
      expect(result.content).toBe(input);
      expect(result.changed).toBe(false);
    });

    it("should not skip matches inside strings when skipInString is false", () => {
      const rule: ReplacementRule = {
        name: "testRule",
        pattern: /foo/g,
        replacement: () => "bar",
        diagnosticMessage: "Replaced foo with bar",
        skipInString: false,
      };

      const input = '{"key": "foo value"}';
      const result = executeRules(input, [rule]);
      expect(result.content).toBe('{"key": "bar value"}');
      expect(result.changed).toBe(true);
    });

    it("should respect contextCheck function", () => {
      const rule: ReplacementRule = {
        name: "testRule",
        pattern: /foo/g,
        replacement: () => "bar",
        diagnosticMessage: "Replaced foo with bar",
        // Only replace 'foo' if NOT followed by ' deny'
        contextCheck: (context) => {
          const afterMatch = context.fullContent.substring(context.offset + 3); // +3 for 'foo'
          return !afterMatch.startsWith(" deny");
        },
        skipInString: false,
      };

      const input = "allow foo deny foo";
      const result = executeRules(input, [rule]);
      // The first 'foo' is followed by ' deny', so skip; second 'foo' is at end, so replace
      expect(result.content).toBe("allow foo deny bar");
    });

    it("should skip replacement when contextCheck returns false", () => {
      const rule: ReplacementRule = {
        name: "testRule",
        pattern: /foo/g,
        replacement: () => "bar",
        diagnosticMessage: "Replaced foo with bar",
        contextCheck: () => false, // Always skip
        skipInString: false,
      };

      const input = "foo baz foo";
      const result = executeRules(input, [rule]);
      // Nothing should be replaced because contextCheck always returns false
      expect(result.content).toBe("foo baz foo");
      expect(result.changed).toBe(false);
    });

    it("should return null from replacement to skip a match", () => {
      const rule: ReplacementRule = {
        name: "testRule",
        pattern: /foo(\d+)/g,
        replacement: (_match, groups) => {
          const numStr = groups[0] ?? "0";
          const num = parseInt(numStr, 10);
          if (num > 5) {
            return null; // Skip numbers > 5
          }
          return `bar${numStr}`;
        },
        diagnosticMessage: "Replaced foo with bar",
        skipInString: false,
      };

      const input = "foo1 foo10 foo3";
      const result = executeRules(input, [rule]);
      expect(result.content).toBe("bar1 foo10 bar3");
    });

    it("should limit diagnostic messages based on maxDiagnostics option", () => {
      const rule: ReplacementRule = {
        name: "testRule",
        pattern: /x/g,
        replacement: () => "y",
        diagnosticMessage: "Replaced x",
        skipInString: false,
      };

      const input = "x x x x x x x x x x"; // 10 x's
      const result = executeRules(input, [rule], { maxDiagnostics: 3 });
      expect(result.changed).toBe(true);
      expect(result.diagnostics).toHaveLength(3);
    });

    it("should execute multiple rules in order", () => {
      const rule1: ReplacementRule = {
        name: "rule1",
        pattern: /a/g,
        replacement: () => "b",
        diagnosticMessage: "Replaced a with b",
        skipInString: false,
      };

      const rule2: ReplacementRule = {
        name: "rule2",
        pattern: /b/g,
        replacement: () => "c",
        diagnosticMessage: "Replaced b with c",
        skipInString: false,
      };

      const input = "aaa";
      const result = executeRules(input, [rule1, rule2]);
      // a -> b -> c
      expect(result.content).toBe("ccc");
    });

    it("should provide context information to replacement function", () => {
      let capturedContext: ContextInfo | null = null;

      const rule: ReplacementRule = {
        name: "testRule",
        pattern: /test/g,
        replacement: (_match, _groups, context) => {
          capturedContext = context;
          return "replaced";
        },
        diagnosticMessage: "Test replacement",
        skipInString: false,
      };

      executeRules("prefix test suffix", [rule]);

      expect(capturedContext).not.toBeNull();
      expect(capturedContext!.beforeMatch).toBe("prefix ");
      expect(capturedContext!.offset).toBe(7);
      expect(capturedContext!.fullContent).toBe("prefix test suffix");
    });

    it("should support dynamic diagnostic messages", () => {
      const rule: ReplacementRule = {
        name: "testRule",
        pattern: /num(\d+)/g,
        replacement: (_match, groups) => `replaced${groups[0] ?? ""}`,
        diagnosticMessage: (_match, groups) => `Replaced number: ${groups[0] ?? ""}`,
        skipInString: false,
      };

      const result = executeRules("num42 num7", [rule]);
      expect(result.diagnostics).toContain("Replaced number: 42");
      expect(result.diagnostics).toContain("Replaced number: 7");
    });
  });

  describe("executeRulesMultiPass", () => {
    it("should run multiple passes until no more changes", () => {
      // Rule that removes 'ab' - needs multiple passes to fully clean 'aaabbb'
      const rule: ReplacementRule = {
        name: "removeAB",
        pattern: /ab/g,
        replacement: () => "",
        diagnosticMessage: "Removed ab",
        skipInString: false,
      };

      const result = executeRulesMultiPass("aaabbb", [rule]);
      // aaabbb -> aabb -> ab -> empty (3 passes)
      expect(result.content).toBe("");
      expect(result.changed).toBe(true);
    });

    it("should respect maxPasses limit", () => {
      // Rule that never stops finding matches
      const rule: ReplacementRule = {
        name: "addX",
        pattern: /y/g,
        replacement: () => "xy",
        diagnosticMessage: "Added x before y",
        skipInString: false,
      };

      // This would loop forever, but maxPasses should stop it
      const result = executeRulesMultiPass("y", [rule], { maxPasses: 3 });
      expect(result.content).toBe("xxxy"); // 3 passes: y -> xy -> xxy -> xxxy
    });
  });


  describe("context check helpers", () => {
    describe("isAfterJsonDelimiter", () => {
      it("should return true when after closing brace", () => {
        const context = createTestContext({
          beforeMatch: '{"key": "value"} ',
          offset: 17,
          fullContent: '{"key": "value"} next',
        });
        expect(isAfterJsonDelimiter(context)).toBe(true);
      });

      it("should return true when after closing bracket", () => {
        const context = createTestContext({
          beforeMatch: '["item1", "item2"] ',
          offset: 19,
          fullContent: '["item1", "item2"] next',
        });
        expect(isAfterJsonDelimiter(context)).toBe(true);
      });

      it("should return true when after comma", () => {
        const context = createTestContext({
          beforeMatch: '"value", ',
          offset: 9,
          fullContent: '"value", next',
        });
        expect(isAfterJsonDelimiter(context)).toBe(true);
      });

      it("should return true near start of content", () => {
        const context = createTestContext({
          beforeMatch: "  ",
          offset: 2,
          fullContent: "  test",
        });
        expect(isAfterJsonDelimiter(context)).toBe(true);
      });
    });

    describe("isInPropertyContext", () => {
      it("should return true after opening brace", () => {
        const context = createTestContext({
          beforeMatch: "{ ",
          offset: 2,
          fullContent: '{ "key": "value"}',
        });
        expect(isInPropertyContext(context)).toBe(true);
      });

      it("should return true after comma in object", () => {
        const context = createTestContext({
          beforeMatch: '"value", ',
          offset: 9,
          fullContent: '"value", "key2"',
        });
        expect(isInPropertyContext(context)).toBe(true);
      });

      it("should return true after newline", () => {
        const context = createTestContext({
          beforeMatch: '"value",\n  ',
          offset: 11,
          fullContent: '"value",\n  "key2"',
        });
        expect(isInPropertyContext(context)).toBe(true);
      });
    });

    describe("isInArrayContext", () => {
      it("should return true after opening bracket", () => {
        const context = createTestContext({
          beforeMatch: "[ ",
          offset: 2,
          fullContent: '[ "item"]',
        });
        expect(isInArrayContext(context)).toBe(true);
      });

      it("should return true after comma with newline", () => {
        const context = createTestContext({
          beforeMatch: '"item1",\n  ',
          offset: 11,
          fullContent: '"item1",\n  "item2"',
        });
        expect(isInArrayContext(context)).toBe(true);
      });

      it("should return true after string comma and newline", () => {
        const context = createTestContext({
          beforeMatch: '"value",\n    ',
          offset: 13,
          fullContent: '"value",\n    "next"',
        });
        expect(isInArrayContext(context)).toBe(true);
      });
    });
  });
});
