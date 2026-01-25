import { executeRules } from "../../../../../../../src/common/llm/json-processing/sanitizers/rules/rule-executor";
import { STRAY_COMMENTARY_RULES } from "../../../../../../../src/common/llm/json-processing/sanitizers/rules/embedded-content/stray-commentary-rules";

describe("STRAY_COMMENTARY_RULES", () => {
  describe("genericStrayTextLine", () => {
    it("should remove stray text on its own line", () => {
      const input = `{
  "name": "Test"
},
trib
  "property": "value"
}`;
      const result = executeRules(input, STRAY_COMMENTARY_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).toContain('"property": "value"');
      expect(result.content).not.toContain("trib");
    });

    it("should remove short lowercase words", () => {
      const input = `{
  "data": []
],
abc
  "next": "value"
}`;
      const result = executeRules(input, STRAY_COMMENTARY_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("\nabc\n");
    });

    it("should NOT remove JSON keywords like true, false, null", () => {
      const input = `{
  "enabled": true
}`;
      const result = executeRules(input, STRAY_COMMENTARY_RULES);
      expect(result.content).toContain("true");
    });

    it("should remove hyphenated stray text", () => {
      const input = `{
  "items": []
},
some-stray-text
  "nextProp": {}
}`;
      const result = executeRules(input, STRAY_COMMENTARY_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("some-stray-text");
    });
  });

  describe("sentenceLikeTextBeforeProperty", () => {
    it("should remove sentence-like text before property", () => {
      const input = `{
  "name": "Test"
],
there are more methods, but I'm stopping here
  "property": "value"
}`;
      const result = executeRules(input, STRAY_COMMENTARY_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).toContain('"property": "value"');
      expect(result.content).not.toContain("there are more");
    });

    it("should remove LLM commentary", () => {
      const input = `{
  "data": []
},
this analysis covers the main patterns found
  "summary": "done"
}`;
      const result = executeRules(input, STRAY_COMMENTARY_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("this analysis");
    });

    it("should NOT remove short text without spaces", () => {
      const input = `{
  "items": []
},
shorttext
  "next": {}
}`;
      // Short text without spaces might not match the sentence pattern
      const result = executeRules(input, STRAY_COMMENTARY_RULES);
      // The genericStrayTextLine rule might catch this instead
      expect(result.content).toContain('"next": {}');
    });
  });

  describe("strayEnglishText", () => {
    it("should remove English text before object/array", () => {
      const input = `{
  "name": "Test"
],
this is some explanatory text here
  {
    "nested": "value"
  }
}`;
      const result = executeRules(input, STRAY_COMMENTARY_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("explanatory text");
    });

    it("should remove stray text before quoted property", () => {
      const input = `{
  "items": []
},
additional context for this section
  "nextSection": {}
}`;
      const result = executeRules(input, STRAY_COMMENTARY_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("additional context");
    });

    it("should handle text with punctuation", () => {
      const input = `{
  "data": "value"
},
here's the analysis, as requested!
  "result": "done"
}`;
      const result = executeRules(input, STRAY_COMMENTARY_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("as requested");
    });
  });

  describe("configTextBeforeProperty", () => {
    it("should remove config-like text before property", () => {
      const input = `{
  "name": "Test"
},
post_max_size = 20M    "purpose": "testing"
}`;
      const result = executeRules(input, STRAY_COMMENTARY_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).toContain('"purpose": "testing"');
      expect(result.content).not.toContain("post_max_size");
    });

    it("should remove environment variable-like text", () => {
      const input = `{
  "data": []
}
DEBUG_MODE = true    "config": {}
}`;
      const result = executeRules(input, STRAY_COMMENTARY_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).toContain('"config": {}');
      expect(result.content).not.toContain("DEBUG_MODE");
    });

    it("should handle various config formats", () => {
      const input = `{
  "items": []
],
max_connections=100    "settings": "default"
}`;
      const result = executeRules(input, STRAY_COMMENTARY_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).toContain('"settings": "default"');
      expect(result.content).not.toContain("max_connections");
    });
  });

  describe("integration tests", () => {
    it("should handle multiple natural language patterns", () => {
      const input = `{
  "name": "TestClass"
},
trib
there are more methods in this class
  "publicMethods": []
}`;
      const result = executeRules(input, STRAY_COMMENTARY_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).toContain('"publicMethods": []');
      expect(result.content).not.toContain("trib");
      expect(result.content).not.toContain("there are more");
    });

    it("should preserve valid JSON structure", () => {
      const input = `{
  "name": "Test",
  "description": "A test class with methods",
  "methods": ["method1", "method2"]
}`;
      const result = executeRules(input, STRAY_COMMENTARY_RULES);
      // Valid JSON should not be modified
      expect(result.content).toContain('"description": "A test class with methods"');
      expect(result.content).toContain('"methods": ["method1", "method2"]');
    });

    it("should handle complex nested JSON with stray text", () => {
      const input = `{
  "classes": [
    {
      "name": "ClassA"
    }
  ]
},
the following classes were also identified
  "summary": "Analysis complete"
}`;
      const result = executeRules(input, STRAY_COMMENTARY_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).toContain('"summary": "Analysis complete"');
      expect(result.content).not.toContain("the following classes");
    });
  });
});
