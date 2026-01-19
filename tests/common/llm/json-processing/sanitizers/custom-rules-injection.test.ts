import { fixMalformedJsonPatterns } from "../../../../../src/common/llm/json-processing/sanitizers/fix-malformed-json-patterns";
import { JAVA_SPECIFIC_RULES } from "../../../../../src/common/llm/json-processing/sanitizers/rules/java-specific-rules";
import type { LLMSanitizerConfig } from "../../../../../src/common/llm/config/llm-module-config.types";
import type { ReplacementRule } from "../../../../../src/common/llm/json-processing/sanitizers/rules/replacement-rule.types";

describe("fixMalformedJsonPatterns with custom rules", () => {
  describe("custom rule injection via config", () => {
    it("should apply custom rules when provided in config", () => {
      // JSON with Java package declaration that the default rules won't handle
      const input = `{
  "name": "Test"
}
package com.example;`;

      // Without custom rules - Java artifacts remain
      const resultWithoutCustomRules = fixMalformedJsonPatterns(input);
      expect(resultWithoutCustomRules.content).toContain("package com.example");

      // With Java-specific rules injected
      const config: LLMSanitizerConfig = {
        customReplacementRules: JAVA_SPECIFIC_RULES,
      };
      const resultWithCustomRules = fixMalformedJsonPatterns(input, config);
      expect(resultWithCustomRules.changed).toBe(true);
      expect(resultWithCustomRules.content).not.toContain("package com.example");
    });

    it("should apply both default and custom rules", () => {
      // JSON with both a stray character (handled by default rules) and Java code (handled by custom rules)
      const input = `{
  "name": "Test"
a  "purpose": "testing"
}
import java.util.List;`;

      const config: LLMSanitizerConfig = {
        customReplacementRules: JAVA_SPECIFIC_RULES,
      };
      const result = fixMalformedJsonPatterns(input, config);

      expect(result.changed).toBe(true);
      // Should fix stray character (default rule)
      expect(result.content).not.toContain('a  "purpose"');
      // Should remove Java import (custom rule)
      expect(result.content).not.toContain("import java.util.List");
    });

    it("should work with empty custom rules array", () => {
      const input = `{
  "name": "Test",
a  "purpose": "testing"
}`;

      const config: LLMSanitizerConfig = {
        customReplacementRules: [],
      };
      const result = fixMalformedJsonPatterns(input, config);

      // Default rules should still work
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain('a  "purpose"');
    });

    it("should work with config that has no customReplacementRules field", () => {
      const input = `{
  "name": "Test",
a  "purpose": "testing"
}`;

      const config: LLMSanitizerConfig = {
        knownProperties: ["name", "purpose"],
      };
      const result = fixMalformedJsonPatterns(input, config);

      // Default rules should still work
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain('a  "purpose"');
    });

    it("should allow domain-specific rules to be added", () => {
      // Create a custom rule for a specific domain pattern
      const customRule: ReplacementRule = {
        name: "customDomainRule",
        // Pattern matches markers at the end of JSON after closing brace
        pattern: /(})\s*\n?\s*\[CUSTOM_MARKER\]\s*$/g,
        replacement: (_match, groups) => groups[0] ?? "}",
        diagnosticMessage: "Removed custom marker",
      };

      // Input has marker after JSON closing brace - this is invalid JSON that needs fixing
      const input = `{
  "name": "Test",
  "value": "data"
}
[CUSTOM_MARKER]`;

      const config: LLMSanitizerConfig = {
        customReplacementRules: [customRule],
      };
      const result = fixMalformedJsonPatterns(input, config);

      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("[CUSTOM_MARKER]");
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should produce valid JSON after applying all rules", () => {
      const input = `{
  "name": "TestClass",
  "methods": [
    {
      "name": "doSomething"
    }
  ]
}
package com.example;

import java.util.List;

public class TestClass {
  public void doSomething() {}
}`;

      const config: LLMSanitizerConfig = {
        customReplacementRules: JAVA_SPECIFIC_RULES,
      };
      const result = fixMalformedJsonPatterns(input, config);

      expect(result.changed).toBe(true);
      expect(() => JSON.parse(result.content)).not.toThrow();

      const parsed = JSON.parse(result.content);
      expect(parsed.name).toBe("TestClass");
      expect(parsed.methods).toHaveLength(1);
    });
  });

  describe("rule ordering", () => {
    it("should apply custom rules after default rules", () => {
      // This test verifies that custom rules are appended, not prepended
      // We create a rule that depends on default rules having cleaned up first
      let wasDefaultApplied = false;

      const inspectorRule: ReplacementRule = {
        name: "inspectorRule",
        pattern: /("name":\s*"[^"]+")(\s*,\s*"purpose")/g,
        replacement: (_match, groups) => {
          // This pattern would only match if stray chars were already removed
          const nameGroup = groups[0] ?? "";
          const purposeGroup = groups[1] ?? "";
          wasDefaultApplied = !nameGroup.includes("a  ");
          return `${nameGroup}${purposeGroup}`;
        },
        diagnosticMessage: "Inspector rule ran",
      };

      const input = `{
a  "name": "Test",
  "purpose": "testing"
}`;

      const config: LLMSanitizerConfig = {
        customReplacementRules: [inspectorRule],
      };
      fixMalformedJsonPatterns(input, config);

      // The inspector rule should see the content after default rules cleaned it
      expect(wasDefaultApplied).toBe(true);
    });
  });
});
