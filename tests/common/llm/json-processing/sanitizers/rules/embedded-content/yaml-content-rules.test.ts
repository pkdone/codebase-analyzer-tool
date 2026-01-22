import { executeRules } from "../../../../../../../src/common/llm/json-processing/sanitizers/rules/rule-executor";
import {
  YAML_CONTENT_RULES,
  looksLikeNonJsonKey,
} from "../../../../../../../src/common/llm/json-processing/sanitizers/rules/embedded-content/yaml-content-rules";

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

describe("looksLikeNonJsonKey", () => {
  describe("without knownProperties", () => {
    it("should return true for extra_* keys", () => {
      expect(looksLikeNonJsonKey("extra_text")).toBe(true);
      expect(looksLikeNonJsonKey("extra_thoughts")).toBe(true);
      expect(looksLikeNonJsonKey("extra_info")).toBe(true);
    });

    it("should return true for llm_* keys", () => {
      expect(looksLikeNonJsonKey("llm_reasoning")).toBe(true);
      expect(looksLikeNonJsonKey("llm_notes")).toBe(true);
    });

    it("should return true for ai_* keys", () => {
      expect(looksLikeNonJsonKey("ai_analysis")).toBe(true);
      expect(looksLikeNonJsonKey("ai_summary")).toBe(true);
    });

    it("should return true for _* prefixed keys", () => {
      expect(looksLikeNonJsonKey("_internal")).toBe(true);
      expect(looksLikeNonJsonKey("_metadata")).toBe(true);
    });

    it("should return true for hyphenated keys (YAML-style)", () => {
      expect(looksLikeNonJsonKey("my-yaml-key")).toBe(true);
      expect(looksLikeNonJsonKey("some-other-key")).toBe(true);
    });

    it("should return true for keys ending with _thoughts, _text, etc.", () => {
      expect(looksLikeNonJsonKey("model_thoughts")).toBe(true);
      expect(looksLikeNonJsonKey("output_text")).toBe(true);
      expect(looksLikeNonJsonKey("additional_notes")).toBe(true);
      expect(looksLikeNonJsonKey("debug_info")).toBe(true);
    });

    it("should return false for normal camelCase keys", () => {
      expect(looksLikeNonJsonKey("name")).toBe(false);
      expect(looksLikeNonJsonKey("propertyName")).toBe(false);
      expect(looksLikeNonJsonKey("someValue")).toBe(false);
    });
  });

  describe("with knownProperties", () => {
    it("should return false for known schema properties", () => {
      const knownProperties = ["extra_field", "my_custom_key"];
      expect(looksLikeNonJsonKey("extra_field", knownProperties)).toBe(false);
      expect(looksLikeNonJsonKey("my_custom_key", knownProperties)).toBe(false);
    });

    it("should return true for unknown non-JSON keys even with knownProperties", () => {
      const knownProperties = ["name", "value"];
      expect(looksLikeNonJsonKey("extra_thoughts", knownProperties)).toBe(true);
      expect(looksLikeNonJsonKey("my-yaml-key", knownProperties)).toBe(true);
    });

    it("should be case-insensitive for known properties", () => {
      const knownProperties = ["ExtraField", "MY_KEY"];
      expect(looksLikeNonJsonKey("extrafield", knownProperties)).toBe(false);
      expect(looksLikeNonJsonKey("my_key", knownProperties)).toBe(false);
    });
  });
});
