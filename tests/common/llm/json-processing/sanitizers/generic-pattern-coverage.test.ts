/**
 * Tests for generic pattern coverage in JSON sanitizers.
 * These tests verify that the generalized patterns catch variations
 * of LLM-generated errors without relying on hardcoded strings.
 */

import { fixMalformedJsonPatterns } from "../../../../../src/common/llm/json-processing/sanitizers/index";
import { extraPropertiesRemover } from "../../../../../src/common/llm/json-processing/sanitizers/strategies/extra-properties-remover";
import { textOutsideJsonRemover } from "../../../../../src/common/llm/json-processing/sanitizers/strategies/text-outside-json-remover";
import { arrayElementFixer } from "../../../../../src/common/llm/json-processing/sanitizers/strategies/array-element-fixer";
import { strayContentRemover } from "../../../../../src/common/llm/json-processing/sanitizers/strategies/stray-content-remover";

describe("Generic Pattern Coverage", () => {
  describe("Generic uppercase identifier removal", () => {
    it("should remove _MODULE corrupted reference", () => {
      const input = `{
  "externalReferences": [
    "com.example.Class"
  ],
_MODULE"
  "publicConstants": []
}`;
      const result = fixMalformedJsonPatterns(input);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("_MODULE");
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should remove _CODE corrupted reference (generic pattern)", () => {
      const input = `{
  "externalReferences": [
    "com.example.Class"
  ],
_CODE"
  "publicConstants": []
}`;
      const result = fixMalformedJsonPatterns(input);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("_CODE");
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should remove _CONSTANT_NAME corrupted reference (generic pattern)", () => {
      const input = `{
  "externalReferences": [
    "com.example.Class"
  ],
_CONSTANT_NAME"
  "publicConstants": []
}`;
      const result = fixMalformedJsonPatterns(input);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("_CONSTANT_NAME");
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should remove _ANY_UPPERCASE_ID123 corrupted reference (generic pattern)", () => {
      const input = `{
  "externalReferences": [
    "com.example.Class"
  ],
_ANY_UPPERCASE_ID123"
  "publicConstants": []
}`;
      const result = fixMalformedJsonPatterns(input);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("_ANY_UPPERCASE_ID123");
      expect(() => JSON.parse(result.content)).not.toThrow();
    });
  });

  describe("Generic short prefix removal", () => {
    it("should remove 'ar' prefix before quoted string (original case)", () => {
      const input = `{
  "externalReferences": [
    ar"com.example.ClassName"
  ]
}`;
      const result = fixMalformedJsonPatterns(input);
      expect(result.changed).toBe(true);
      expect(result.content).toContain('"com.example.ClassName"');
      expect(result.content).not.toContain('ar"com.example');
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should remove 'x' prefix before quoted string (generic pattern)", () => {
      const input = `{
  "externalReferences": [
    x"com.example.ClassName"
  ]
}`;
      const result = fixMalformedJsonPatterns(input);
      expect(result.changed).toBe(true);
      expect(result.content).toContain('"com.example.ClassName"');
      expect(result.content).not.toContain('x"com.example');
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should remove 'foo' prefix before quoted string (generic pattern)", () => {
      const input = `{
  "externalReferences": [
    foo"com.example.ClassName"
  ]
}`;
      const result = fixMalformedJsonPatterns(input);
      expect(result.changed).toBe(true);
      expect(result.content).toContain('"com.example.ClassName"');
      expect(result.content).not.toContain('foo"com.example');
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should remove 'y' prefix before quoted string (generic pattern)", () => {
      const input = `{
  "externalReferences": [
    y"com.example.ClassName"
  ]
}`;
      const result = fixMalformedJsonPatterns(input);
      expect(result.changed).toBe(true);
      expect(result.content).toContain('"com.example.ClassName"');
      expect(result.content).not.toContain('y"com.example');
      expect(() => JSON.parse(result.content)).not.toThrow();
    });
  });

  describe("Generic LLM artifact property removal", () => {
    // Note: extraPropertiesRemover is one sanitizer in a pipeline and may leave
    // JSON in an intermediate state. JSON validity is tested at the pipeline level.

    it("should remove extra_thoughts property (original case)", () => {
      const input = '{"name": "test", "extra_thoughts": "some thoughts"}';
      const result = extraPropertiesRemover.apply(input);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("extra_thoughts");
    });

    it("should remove extra_text property (original case)", () => {
      const input = '{"name": "test", "extra_text": "some text"}';
      const result = extraPropertiesRemover.apply(input);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("extra_text");
    });

    it("should remove extra_info property (generic pattern)", () => {
      const input = '{"name": "test", "extra_info": "some info"}';
      const result = extraPropertiesRemover.apply(input);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("extra_info");
    });

    it("should remove extra_notes property (generic pattern)", () => {
      const input = '{"name": "test", "extra_notes": "some notes"}';
      const result = extraPropertiesRemover.apply(input);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("extra_notes");
    });

    it("should remove extra_reasoning property (generic pattern)", () => {
      const input = '{"name": "test", "extra_reasoning": "my reasoning"}';
      const result = extraPropertiesRemover.apply(input);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("extra_reasoning");
    });

    it("should remove llm_thoughts property (generic pattern)", () => {
      const input = '{"name": "test", "llm_thoughts": "thinking..."}';
      const result = extraPropertiesRemover.apply(input);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("llm_thoughts");
    });

    it("should remove ai_notes property (generic pattern)", () => {
      const input = '{"name": "test", "ai_notes": "my notes"}';
      const result = extraPropertiesRemover.apply(input);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("ai_notes");
    });

    it("should remove _internal_metadata property (generic pattern)", () => {
      const input = '{"name": "test", "_internal_metadata": "metadata"}';
      const result = extraPropertiesRemover.apply(input);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("_internal_metadata");
    });

    it("should remove unquoted extra_analysis property (generic pattern)", () => {
      const input = '{"name": "test", extra_analysis: "my analysis"}';
      const result = extraPropertiesRemover.apply(input);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("extra_analysis");
    });
  });

  describe("Generic stray text removal", () => {
    it("should remove 'trib' stray text (original case)", () => {
      const input = `{
  "externalReferences": [],
trib
  "publicConstants": []
}`;
      const result = strayContentRemover.apply(input);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("trib");
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should remove 'cmethod' stray text (original case)", () => {
      const input = `{
  "publicFunctions": [],
cmethod
  "databaseIntegration": {}
}`;
      const result = strayContentRemover.apply(input);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("cmethod");
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should remove generic stray text 'randomword'", () => {
      const input = `{
  "publicFunctions": [],
randomword
  "databaseIntegration": {}
}`;
      const result = strayContentRemover.apply(input);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("randomword");
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should remove generic stray text 'foo-bar-baz'", () => {
      const input = `{
  "publicFunctions": [],
foo-bar-baz
  "databaseIntegration": {}
}`;
      const result = strayContentRemover.apply(input);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("foo-bar-baz");
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should NOT remove JSON keywords", () => {
      const input = `{
  "value": true
}`;
      const result = strayContentRemover.apply(input);
      expect(result.content).toContain("true");
      expect(() => JSON.parse(result.content)).not.toThrow();
    });
  });

  describe("Generic LLM thought marker removal", () => {
    it("should remove _llm_thought after JSON (original case)", () => {
      const input = `{
  "name": "TestClass"
}
_llm_thought: This is my reasoning`;
      const result = textOutsideJsonRemover.apply(input);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("_llm_thought");
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should remove ai_thoughts after JSON (generic pattern)", () => {
      const input = `{
  "name": "TestClass"
}
ai_thoughts: This is my reasoning`;
      const result = textOutsideJsonRemover.apply(input);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("ai_thoughts");
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should remove model_reasoning after JSON (generic pattern)", () => {
      const input = `{
  "name": "TestClass"
}
model_reasoning: This is my reasoning`;
      const result = textOutsideJsonRemover.apply(input);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("model_reasoning");
      expect(() => JSON.parse(result.content)).not.toThrow();
    });
  });

  describe("Generic stray word removal in arrays", () => {
    it("should remove 'from' prefix in arrays (original case)", () => {
      const input = '["item1", from "item2"]';
      const result = arrayElementFixer.apply(input);
      expect(result.changed).toBe(true);
      expect(result.content).toBe('["item1", "item2"]');
    });

    it("should remove 'package' prefix in arrays", () => {
      const input = '["item1", package "item2"]';
      const result = arrayElementFixer.apply(input);
      expect(result.changed).toBe(true);
      expect(result.content).toBe('["item1", "item2"]');
    });

    it("should remove short stray prefix 'e' in arrays", () => {
      const input = '["item1", e "item2"]';
      const result = arrayElementFixer.apply(input);
      expect(result.changed).toBe(true);
      expect(result.content).toBe('["item1", "item2"]');
    });

    it("should remove short stray prefix 'to' in arrays", () => {
      const input = '["item1", to "item2"]';
      const result = arrayElementFixer.apply(input);
      expect(result.changed).toBe(true);
      expect(result.content).toBe('["item1", "item2"]');
    });

    it("should remove short stray prefix 'of' in arrays", () => {
      const input = '["item1", of "item2"]';
      const result = arrayElementFixer.apply(input);
      expect(result.changed).toBe(true);
      expect(result.content).toBe('["item1", "item2"]');
    });

    it("should NOT remove JSON keywords in arrays", () => {
      // This test ensures we don't accidentally remove valid JSON
      const input = '[true, "item"]';
      const result = arrayElementFixer.apply(input);
      // Should not change valid JSON
      expect(result.content).toContain("true");
    });
  });

  describe("Regression tests for original patterns", () => {
    it("should still fix 'tribal-council-leader-thought' stray text", () => {
      const input = `{
  "externalReferences": [],
tribal-council-leader-thought
  "publicConstants": []
}`;
      const result = fixMalformedJsonPatterns(input);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("tribal-council-leader-thought");
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should still fix ar prefix before quoted strings", () => {
      const input = `{
  "externalReferences": [
    ar"com.example.ClassName"
  ]
}`;
      const result = fixMalformedJsonPatterns(input);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain('ar"com.example');
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should still fix _ADDITIONAL_PROPERTIES stray text", () => {
      const input = `{
  "publicFunctions": [],
_ADDITIONAL_PROPERTIES
  "databaseIntegration": {}
}`;
      const result = fixMalformedJsonPatterns(input);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("_ADDITIONAL_PROPERTIES");
      expect(() => JSON.parse(result.content)).not.toThrow();
    });
  });

  describe("Edge cases and safety", () => {
    it("should not modify valid JSON", () => {
      const input = '{"key": "value", "array": ["item1", "item2"]}';
      const result = fixMalformedJsonPatterns(input);
      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should not modify strings inside string values", () => {
      const input = '{"description": "This has trib and ar in it"}';
      const result = fixMalformedJsonPatterns(input);
      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should preserve JSON keywords in valid positions", () => {
      const input = '{"isActive": true, "value": null, "enabled": false}';
      const result = fixMalformedJsonPatterns(input);
      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should handle empty input", () => {
      const result = fixMalformedJsonPatterns("");
      expect(result.changed).toBe(false);
      expect(result.content).toBe("");
    });
  });

  describe("Property name fixing (edge cases)", () => {
    it("should handle property names with missing opening quote", () => {
      const input = `{
  "valid": "value",
  user_id": 1
}`;
      const result = fixMalformedJsonPatterns(input);
      expect(result.changed).toBe(true);
      expect(result.content).toContain('"user_id"');
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should handle property names with missing opening quote (camelCase)", () => {
      const input = `{
  userName": "john",
  "age": 30
}`;
      const result = fixMalformedJsonPatterns(input);
      expect(result.changed).toBe(true);
      expect(result.content).toContain('"userName"');
      expect(() => JSON.parse(result.content)).not.toThrow();
    });
  });

  describe("Stray text between objects (new edge cases)", () => {
    it("should remove commentary text between objects in array", () => {
      const input = `{
  "items": [
    {"id": 1},
moving on to the next item
    {"id": 2}
  ]
}`;
      const result = fixMalformedJsonPatterns(input);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("moving on");
      // May not parse due to complex nested structure, but text should be removed
    });

    it("should handle stray text with punctuation after JSON structure", () => {
      const input = `{
  "name": "test"
}
This is the end of the response.`;
      const result = textOutsideJsonRemover.apply(input);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("This is the end");
      expect(() => JSON.parse(result.content)).not.toThrow();
    });
  });

  describe("Unknown metadata fields (edge cases)", () => {
    it("should remove _meta_info property (underscore prefix)", () => {
      const input = '{"name": "test", "_meta_info": "metadata value"}';
      const result = extraPropertiesRemover.apply(input);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("_meta_info");
    });

    it("should remove _internal_state property (underscore prefix)", () => {
      const input = '{"name": "test", "_internal_state": {"key": "value"}}';
      const result = extraPropertiesRemover.apply(input);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("_internal_state");
    });

    it("should remove properties ending with _analysis (known suffix with extra_ prefix)", () => {
      const input = '{"name": "test", "extra_section_analysis": "This analyzes the section"}';
      const result = extraPropertiesRemover.apply(input);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("extra_section_analysis");
    });
  });

  describe("Consolidated YAML block removal (new edge cases)", () => {
    it("should remove generic hyphenated YAML keys with list items", () => {
      const input = `{
  "name": "test"
},
my-custom-yaml-key:
  - item1
  - item2
  "nextProp": "value"`;
      const result = fixMalformedJsonPatterns(input);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("my-custom-yaml-key");
    });

    it("should remove extra_ prefixed YAML-style blocks", () => {
      const input = `{
  "name": "test"
},
extra_analysis: This is my analysis of the code
  "nextProp": "value"`;
      const result = fixMalformedJsonPatterns(input);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("extra_analysis");
    });
  });

  describe("Structural text detection (new edge cases)", () => {
    it("should remove multi-word descriptive text after values", () => {
      const input = `{
  "items": ["item1"],
this is descriptive text that explains the data
  "other": []
}`;
      const result = textOutsideJsonRemover.apply(input);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("descriptive text");
    });

    it("should remove text ending with punctuation after JSON", () => {
      const input = `{
  "data": "value"
}
I have completed the analysis!`;
      const result = textOutsideJsonRemover.apply(input);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("completed the analysis");
      expect(() => JSON.parse(result.content)).not.toThrow();
    });
  });
});
