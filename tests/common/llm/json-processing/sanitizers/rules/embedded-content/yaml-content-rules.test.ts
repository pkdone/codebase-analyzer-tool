import { executeRules } from "../../../../../../../src/common/llm/json-processing/sanitizers/rules/rule-executor";
import { YAML_CONTENT_RULES } from "../../../../../../../src/common/llm/json-processing/sanitizers/rules/embedded-content/yaml-content-rules";

describe("YAML_CONTENT_RULES", () => {
  describe("genericYamlListBlock", () => {
    it("should remove YAML list block with extra_* key", () => {
      const input = `{
  "name": "Test"
},
extra_items:
  - item1
  - item2
  "property": "value"
}`;
      const result = executeRules(input, YAML_CONTENT_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).toContain('"property": "value"');
      expect(result.content).not.toContain("extra_items");
      expect(result.content).not.toContain("- item1");
    });

    it("should remove YAML list block with hyphenated key", () => {
      const input = `{
  "name": "Test"
},
my-yaml-key:
  - first
  - second
  "nextProp": []
}`;
      const result = executeRules(input, YAML_CONTENT_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).toContain('"nextProp": []');
      expect(result.content).not.toContain("my-yaml-key");
    });

    it("should NOT remove valid JSON property that matches schema", () => {
      const input = `{
  "name": "Test",
  "items": ["a", "b"]
}`;
      const result = executeRules(input, YAML_CONTENT_RULES, {
        config: { knownProperties: ["name", "items"] },
      });
      // Should not modify valid JSON
      expect(result.content).toContain('"items": ["a", "b"]');
    });

    it("should remove llm_* prefixed YAML blocks", () => {
      const input = `{
  "data": "value"
},
llm_thoughts:
  - reasoning step 1
  - reasoning step 2
  "result": "final"
}`;
      const result = executeRules(input, YAML_CONTENT_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).toContain('"result": "final"');
      expect(result.content).not.toContain("llm_thoughts");
    });
  });

  describe("genericYamlSimpleValue", () => {
    it("should remove YAML simple value with extra_* key", () => {
      const input = `{
  "name": "Test"
},
extra_thoughts: I've identified all the relevant patterns here
  "property": "value"
}`;
      const result = executeRules(input, YAML_CONTENT_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).toContain('"property": "value"');
      expect(result.content).not.toContain("extra_thoughts");
    });

    it("should remove YAML simple value with hyphenated key", () => {
      const input = `{
  "name": "Test"
},
my-yaml-value: some text that looks like yaml
  "nextProp": []
}`;
      const result = executeRules(input, YAML_CONTENT_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).toContain('"nextProp": []');
      expect(result.content).not.toContain("my-yaml-value");
    });

    it("should remove ai_* prefixed YAML values", () => {
      const input = `{
  "data": "value"
}
ai_analysis: This code appears to handle authentication
  "conclusion": "done"
}`;
      const result = executeRules(input, YAML_CONTENT_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).toContain('"conclusion": "done"');
      expect(result.content).not.toContain("ai_analysis");
    });
  });
});
