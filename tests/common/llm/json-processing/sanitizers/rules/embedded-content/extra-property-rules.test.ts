import { executeRules } from "../../../../../../../src/common/llm/json-processing/sanitizers/rules/rule-executor";
import {
  EXTRA_PROPERTY_RULES,
  isValidEmbeddedContentContext,
} from "../../../../../../../src/common/llm/json-processing/sanitizers/rules/embedded-content/extra-property-rules";

describe("EXTRA_PROPERTY_RULES", () => {
  describe("extraTextAttribute", () => {
    it("should remove extra_text= attribute on a line", () => {
      const input = `{
  "name": "Test"
},
extra_text="some text"
}`;
      const result = executeRules(input, EXTRA_PROPERTY_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("extra_text");
    });

    it("should handle extra_notes= attribute removal", () => {
      const input = `{
  "name": "Test"
}
extra_notes="analysis"
}`;
      const result = executeRules(input, EXTRA_PROPERTY_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("extra_notes");
    });
  });

  describe("extraTextStrayLine", () => {
    it("should remove extra_text= stray line", () => {
      const input = `{
  "name": "Test"
}
extra_text = some value
}`;
      const result = executeRules(input, EXTRA_PROPERTY_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("extra_text");
    });
  });

  describe("invalidExtraPropertyStructure", () => {
    it("should remove invalid extra_* property structure", () => {
      const input = `{
  "name": "Test"
},
extra_analysis="some complex stuff here",
"property": "value"
}`;
      const result = executeRules(input, EXTRA_PROPERTY_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("extra_analysis");
    });
  });

  describe("missingCommaBeforeExtraText", () => {
    it("should add missing comma after array before extra_text:", () => {
      const input = `{
  "items": []
extra_text: some value
  "property": "value"
}`;
      const result = executeRules(input, EXTRA_PROPERTY_RULES);
      expect(result.changed).toBe(true);
      // The rule adds a comma, which helps subsequent rules
      expect(result.content).toContain("],");
    });

    it("should add missing comma before _llm_ properties", () => {
      const input = `{
  "data": []
_llm_thoughts: thinking about this
  "result": "done"
}`;
      const result = executeRules(input, EXTRA_PROPERTY_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).toContain("],");
    });

    it("should add missing comma before _ai_ properties", () => {
      const input = `{
  "list": []
_ai_analysis: analysis here
  "conclusion": "final"
}`;
      const result = executeRules(input, EXTRA_PROPERTY_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).toContain("],");
    });
  });

  describe("extraThoughtsBlock", () => {
    it("should remove extra_thoughts: block", () => {
      const input = `{
  "name": "Test"
},
extra_thoughts: I've identified all the relevant information
  "property": "value"
}`;
      const result = executeRules(input, EXTRA_PROPERTY_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).toContain('"property": "value"');
      expect(result.content).not.toContain("extra_thoughts");
    });

    it("should remove extra_notes: block", () => {
      const input = `{
  "value": 42
}
extra_notes: Additional context about the analysis
  "nextProperty": []
}`;
      const result = executeRules(input, EXTRA_PROPERTY_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("extra_notes");
    });
  });

  describe("extraTextStrayLine", () => {
    it("should remove stray extra_text= line", () => {
      const input = `{
  "name": "Test"
}
extra_text= some random text
}`;
      const result = executeRules(input, EXTRA_PROPERTY_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("extra_text");
    });

    it("should remove stray extra_info line", () => {
      const input = `{
  "data": []
}
extra_info additional metadata
}`;
      const result = executeRules(input, EXTRA_PROPERTY_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("extra_info");
    });
  });

  describe("invalidPropertyBlock", () => {
    it("should remove invalid extra_* property block with object", () => {
      const input = `{
  "name": "Test"
},
extra_metadata: {
  "internal": "data"
}
"property": "value"
}`;
      const result = executeRules(input, EXTRA_PROPERTY_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("extra_metadata");
    });

    it("should remove _llm_ property block", () => {
      const input = `{
  "data": "value"
},
_llm_context: {
  "reasoning": "thought process"
}
"result": "final"
}`;
      const result = executeRules(input, EXTRA_PROPERTY_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("_llm_context");
    });

    it("should remove _ai_ property block", () => {
      const input = `{
  "input": "test"
},
_ai_internal: {
  "step": 1
}
"output": "result"
}`;
      const result = executeRules(input, EXTRA_PROPERTY_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("_ai_internal");
    });
  });

  describe("integration tests", () => {
    it("should handle multiple extra_* patterns in same content", () => {
      const input = `{
  "name": "TestClass"
},
extra_thoughts: This is my analysis
extra_notes= "additional info"
  "publicMethods": []
}`;
      const result = executeRules(input, EXTRA_PROPERTY_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("extra_thoughts");
      expect(result.content).not.toContain("extra_notes");
      expect(result.content).toContain('"publicMethods": []');
    });
  });
});

describe("isValidEmbeddedContentContext", () => {
  it("should return true when context is after JSON delimiter", () => {
    const context = {
      beforeMatch: '{"name": "test"},',
      fullContent: '{"name": "test"},\n"property": "value"',
      offset: 17,
      groups: [] as const,
    };
    expect(isValidEmbeddedContentContext(context)).toBe(true);
  });

  it("should return true when context is empty (start of file)", () => {
    const context = {
      beforeMatch: "",
      fullContent: '"property": "value"',
      offset: 0,
      groups: [] as const,
    };
    expect(isValidEmbeddedContentContext(context)).toBe(true);
  });

  it("should return true when offset is at start of file", () => {
    const context = {
      beforeMatch: "x",
      fullContent: 'x"property": "value"',
      offset: 1,
      groups: [] as const,
    };
    expect(isValidEmbeddedContentContext(context)).toBe(true);
  });

  it("should return true when offset is beyond start limit but has delimiter", () => {
    // The function checks for delimiters in beforeMatch, so this returns true
    // because it matches /[}\],]\s*$/ pattern with beforeMatch ending with }
    const context = {
      beforeMatch: '{"name": "test value"}',
      fullContent: '{"name": "test value"} more text',
      offset: 22,
      groups: [] as const,
    };
    expect(isValidEmbeddedContentContext(context)).toBe(true);
  });
});
