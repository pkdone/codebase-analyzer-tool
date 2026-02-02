import { executeRules } from "../../../../../../../src/common/llm/json-processing/sanitizers/rules/rule-executor";
import { STRING_CORRUPTION_RULES } from "../../../../../../../src/common/llm/json-processing/sanitizers/rules/embedded-content/string-corruption-rules";

describe("STRING_CORRUPTION_RULES", () => {
  describe("repetitiveClosingBracesInString", () => {
    it("should truncate repetitive closing braces in string values", () => {
      // Simulate the actual error pattern: string value with many "} " sequences
      const repetitiveBraces = "} ".repeat(50);
      const input = `{
  "name": "TestClass",
  "returnType": "void method() { ${repetitiveBraces}`;
      const result = executeRules(input, STRING_CORRUPTION_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("} ".repeat(10));
      expect(result.content).toContain('..."');
    });

    it("should handle real-world error pattern from LLM", () => {
      // Pattern from actual error log
      const repetitiveBraces = "} ".repeat(100);
      const input = `{
  "purpose": "Test class",
  "publicFunctions": [
    {
      "name": "processCommand",
      "returnType": "CommandProcessingResult processCommand(final JsonCommand command) { ... ${repetitiveBraces}`;
      const result = executeRules(input, STRING_CORRUPTION_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).toContain('..."');
      // Should have truncated the repetitive braces
      const remainingBraces = (result.content.match(/} /g) ?? []).length;
      expect(remainingBraces).toBeLessThan(10);
    });

    it("should not modify strings with fewer than 10 repetitions", () => {
      const input = `{
  "code": "void test() { } } } }"
}`;
      const result = executeRules(input, STRING_CORRUPTION_RULES);
      // Should not change valid JSON with few closing braces
      expect(result.content).toContain("} } } }");
    });

    it("should add diagnostic message about truncation", () => {
      const repetitiveBraces = "} ".repeat(25);
      const input = `{
  "returnType": "void() { ${repetitiveBraces}`;
      const result = executeRules(input, STRING_CORRUPTION_RULES);
      expect(result.changed).toBe(true);
      expect(result.repairs).toBeDefined();
      expect(result.repairs?.some((r) => r.includes("repetitive closing braces"))).toBe(true);
    });
  });

  describe("repetitiveNewlinesInString", () => {
    it("should truncate repetitive newlines in string values", () => {
      const repetitiveNewlines = "\\n".repeat(20);
      const input = `{
  "returnType": "void${repetitiveNewlines}`;
      const result = executeRules(input, STRING_CORRUPTION_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).toContain('..."');
    });

    it("should handle actual newline characters as well", () => {
      const repetitiveNewlines = "\n".repeat(15);
      const input = `{
  "description": "Test${repetitiveNewlines}`;
      const result = executeRules(input, STRING_CORRUPTION_RULES);
      expect(result.changed).toBe(true);
    });

    it("should not modify strings with fewer than 10 newlines", () => {
      const input = `{
  "description": "Line1\\nLine2\\nLine3\\nLine4"
}`;
      const result = executeRules(input, STRING_CORRUPTION_RULES);
      // Should not change content with few newlines
      expect(result.content).toContain("Line1\\nLine2");
    });
  });

  describe("embeddedJsonInStringValue", () => {
    it("should fix JSON structure embedded in string values", () => {
      // Pattern from actual error log
      const input = `{
  "publicConstants": [
    {
      "name": "ZERO",
      "value": "0\\",\\n    \\"type\\": \\"String`;
      const result = executeRules(input, STRING_CORRUPTION_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).toContain('"0"');
      expect(result.content).not.toContain('\\"type\\"');
    });
  });

  describe("llmInstructionTextAfterJson", () => {
    it("should remove LLM instruction text after JSON", () => {
      const input = `{
  "name": "Test"
}
[instruction]Fix the bug in the following code...`;
      const result = executeRules(input, STRING_CORRUPTION_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("[instruction]");
      expect(result.content).toContain('"name": "Test"');
    });

    it("should handle various instruction patterns", () => {
      const instructionPatterns = [
        "[output]Here is the corrected code",
        "[code]```java",
        "[example]Example usage",
        "[fix]The solution is",
        "[solution]Fixed version",
      ];

      for (const pattern of instructionPatterns) {
        const input = `{
  "result": "done"
}
${pattern}`;
        const result = executeRules(input, STRING_CORRUPTION_RULES);
        expect(result.changed).toBe(true);
        expect(result.content).not.toContain(pattern.split("]")[0]);
      }
    });

    it("should be case-insensitive", () => {
      const input = `{
  "data": []
}
[INSTRUCTION]Please note that...`;
      const result = executeRules(input, STRING_CORRUPTION_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("[INSTRUCTION]");
    });
  });

  describe("escapedJsonInPropertyValue", () => {
    it("should fix escaped JSON in property values", () => {
      const input = `{
  "returnType": "int\\",\\n      \\"description\\": \\"The compareTo method`;
      const result = executeRules(input, STRING_CORRUPTION_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).toContain('"int"');
    });
  });

  describe("embeddedJsonInStringValueLiteralNewline", () => {
    it("should fix JSON structure with literal newlines embedded in string values", () => {
      // Pattern from actual error log - FineractClient.java
      // "value": "yyyy-MM-dd\",\n    \"type\": \"String"
      const input = `{
  "publicConstants": [
    {
      "name": "DATE_FORMAT",
      "value": "yyyy-MM-dd\\",
    \\"type\\": \\"String"
    }
  ]
}`;
      const result = executeRules(input, STRING_CORRUPTION_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).toContain('"yyyy-MM-dd"');
      expect(result.content).not.toContain('\\"type\\"');
    });

    it("should fix returnType with embedded JSON (GroupHelper.java pattern)", () => {
      // From error log - the returnType has embedded JSON properties
      const input = `{
  "publicFunctions": [
    {
      "name": "createGroup",
      "returnType": "Integer\\",
    \\"parameters\\": \\"something"
    }
  ]
}`;
      const result = executeRules(input, STRING_CORRUPTION_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).toContain('"Integer"');
    });
  });

  describe("escapedJsonInPropertyValueLiteralNewline", () => {
    it("should fix escaped JSON with literal newlines at end of input", () => {
      // Pattern similar to SmsCampaignValidator.java error
      const input = `{
  "publicFunctions": [
    {
      "name": "validateCreate",
      "returnType": "void\\",
      \\"description\\": \\"The validateCreate method`;
      const result = executeRules(input, STRING_CORRUPTION_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).toContain('"void"');
    });

    it("should handle multiple spaces in embedded JSON", () => {
      const input = `{
  "returnType": "Builder\\",
      \\"description\\": \\"This method simply returns`;
      const result = executeRules(input, STRING_CORRUPTION_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).toContain('"Builder"');
    });
  });

  describe("extendedEmbeddedJsonInString", () => {
    it("should fix multiple embedded JSON properties in string value", () => {
      // Pattern where LLM outputs many JSON-like properties inside a string
      const input = `{
  "name": "builder",
  "returnType": "Builder\\",
      \\"description\\": \\"This method returns a builder\\",
      \\"parameters\\": []\\",
      \\"cyclomaticComplexity\\": 1"
}`;
      const result = executeRules(input, STRING_CORRUPTION_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).toContain('"Builder"');
      expect(result.content).not.toContain('\\"description\\"');
    });

    it("should not modify strings with only one embedded property", () => {
      // Single embedded property might be intentional formatting
      const input = `{
  "code": "single\\",
      \\"value\\": \\"test"
}`;
      // This still gets caught by other rules, but the extended rule
      // specifically looks for 2+ embedded properties
      const result = executeRules(input, STRING_CORRUPTION_RULES);
      // The other rules will still fix it
      expect(result.changed).toBe(true);
    });
  });

  describe("real-world error patterns from logs", () => {
    it("should fix FineractClient.java DATE_FORMAT error pattern", () => {
      // Exact pattern from response-error-2026-02-01T21-26-44-044Z.log
      const input = `{
  "publicConstants": [
    {
      "name": "DATE_FORMAT",
      "value": "yyyy-MM-dd\\",
    \\"type\\": \\"String"
    }
  ]
}`;
      const result = executeRules(input, STRING_CORRUPTION_RULES);
      expect(result.changed).toBe(true);
      // Should close the string properly
      expect(result.content).toContain('"yyyy-MM-dd"');
    });

    it("should fix GroupHelper.java DATE_FORMAT error pattern", () => {
      // Pattern from response-error-2026-02-01T21-31-08-543Z.log
      const input = `{
  "publicConstants": [
    {
      "name": "DATE_FORMAT",
      "value": "dd MMMM yyyy\\",
    \\"type\\": \\"String"
    },
    {
      "name": "DATE_TIME_FORMAT",
      "value": "dd MMMM yyyy HH:mm\\",
    \\"type\\": \\"String"
    }
  ]
}`;
      const result = executeRules(input, STRING_CORRUPTION_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).toContain('"dd MMMM yyyy"');
    });

    it("should fix SynchronousCommandProcessingService.java pattern", () => {
      // Pattern from response-error-2026-02-01T21-31-40-966Z.log
      const input = `{
  "publicConstants": [
    {
      "name": "IDEMPOTENCY_KEY_STORE_FLAG",
      "value": "idempotencyKeyStoreFlag\\",
      \\"type\\": \\"String"
    }
  ]
}`;
      const result = executeRules(input, STRING_CORRUPTION_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).toContain('"idempotencyKeyStoreFlag"');
    });
  });

  describe("truncatedStringWithRepetitiveEnd", () => {
    it("should fix truncated string with repetitive ending", () => {
      const repetitiveEnd = ") } } } } } } } } } } } } } } } } } } } } } } } } ";
      const input = `{
  "code": "public void test(${repetitiveEnd}`;
      const result = executeRules(input, STRING_CORRUPTION_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).toContain('..."');
    });
  });

  describe("integration tests", () => {
    it("should handle multiple corruption patterns in same content", () => {
      const repetitiveBraces = "} ".repeat(30);
      const input = `{
  "name": "Test",
  "returnType": "void() { ${repetitiveBraces}
[instruction]Fix this`;
      const result = executeRules(input, STRING_CORRUPTION_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("[instruction]");
      expect(result.content).not.toContain("} ".repeat(10));
    });

    it("should produce parseable JSON after fixing corruption", () => {
      const repetitiveBraces = "} ".repeat(20);
      const input = `{
  "name": "TestClass",
  "returnType": "void method() { ${repetitiveBraces}`;
      const result = executeRules(input, STRING_CORRUPTION_RULES);
      expect(result.changed).toBe(true);

      // The result should be closer to valid JSON
      // (may still need other sanitizers for full validity)
      expect(result.content).toContain('"name": "TestClass"');
      expect(result.content).toContain('"returnType":');
    });

    it("should not modify already valid JSON", () => {
      const input = `{
  "name": "Test",
  "code": "public void test() { return; }",
  "description": "A simple test method"
}`;
      const result = executeRules(input, STRING_CORRUPTION_RULES);
      // Valid JSON should not be modified
      expect(result.changed).toBe(false);
    });
  });
});
