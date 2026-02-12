import { executeRules } from "../../../../../../../src/common/llm/json-processing/sanitizers/rules/rule-executor";
import {
  LLM_METADATA_PROPERTY_RULES,
  isValidPropertyStartPosition,
} from "../../../../../../../src/common/llm/json-processing/sanitizers/rules/embedded-content/llm-metadata-property-rules";

describe("LLM_METADATA_PROPERTY_RULES", () => {
  describe("extraTextAttribute", () => {
    it("should remove extra_text= attribute on a line", () => {
      const input = `{
  "name": "Test"
},
extra_text="some text"
}`;
      const result = executeRules(input, LLM_METADATA_PROPERTY_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("extra_text");
    });

    it("should handle extra_notes= attribute removal", () => {
      const input = `{
  "name": "Test"
}
extra_notes="analysis"
}`;
      const result = executeRules(input, LLM_METADATA_PROPERTY_RULES);
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
      const result = executeRules(input, LLM_METADATA_PROPERTY_RULES);
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
      const result = executeRules(input, LLM_METADATA_PROPERTY_RULES);
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
      const result = executeRules(input, LLM_METADATA_PROPERTY_RULES);
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
      const result = executeRules(input, LLM_METADATA_PROPERTY_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).toContain("],");
    });

    it("should add missing comma before _ai_ properties", () => {
      const input = `{
  "list": []
_ai_analysis: analysis here
  "conclusion": "final"
}`;
      const result = executeRules(input, LLM_METADATA_PROPERTY_RULES);
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
      const result = executeRules(input, LLM_METADATA_PROPERTY_RULES);
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
      const result = executeRules(input, LLM_METADATA_PROPERTY_RULES);
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
      const result = executeRules(input, LLM_METADATA_PROPERTY_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("extra_text");
    });

    it("should remove stray extra_info line", () => {
      const input = `{
  "data": []
}
extra_info additional metadata
}`;
      const result = executeRules(input, LLM_METADATA_PROPERTY_RULES);
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
      const result = executeRules(input, LLM_METADATA_PROPERTY_RULES);
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
      const result = executeRules(input, LLM_METADATA_PROPERTY_RULES);
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
      const result = executeRules(input, LLM_METADATA_PROPERTY_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("_ai_internal");
    });

    it("should validate nested object structures using findJsonValueEnd utility", () => {
      // This rule only removes the matched prefix (e.g., "extra_analysis: {")
      // The object content remains due to rule-based system limitations
      // The utility is used to validate that braces are balanced before applying the rule
      const input = `{
  "data": "value"
},
extra_analysis: {
  "nested": {
    "deep": {
      "level": "three"
    },
    "sibling": "value"
  },
  "other": "property"
}
"result": "final"
}`;
      const result = executeRules(input, LLM_METADATA_PROPERTY_RULES);
      expect(result.changed).toBe(true);
      // The prefix "extra_analysis:" is removed
      expect(result.content).not.toContain("extra_analysis");
      // Note: Object content remains due to rule-based replacement limitations
      // The findJsonValueEnd utility validates balance, it doesn't extend the replacement
    });

    it("should use findJsonValueEnd utility internally (verified via balanced brace handling)", () => {
      // The findJsonValueEnd utility is used to validate that object braces are balanced
      // before applying the replacement. This test verifies the integration by checking
      // that a valid, balanced object structure is processed correctly.
      const input = `{
  "data": "value"
},
_ai_context: {
  "key": "value"
}
"property": "next"
}`;
      const result = executeRules(input, LLM_METADATA_PROPERTY_RULES);
      expect(result.changed).toBe(true);
      // The rule matches and applies when braces are balanced
      expect(result.content).not.toContain("_ai_context");
    });

    it("should validate strings containing braces using findJsonValueEnd", () => {
      // The utility correctly handles strings with braces inside them
      const input = `{
  "data": "value"
},
_llm_metadata: {
  "pattern": "regex with { and } chars",
  "code": "function() { return {}; }"
}
"result": "final"
}`;
      const result = executeRules(input, LLM_METADATA_PROPERTY_RULES);
      expect(result.changed).toBe(true);
      // The prefix "_llm_metadata:" is removed
      expect(result.content).not.toContain("_llm_metadata");
      // Note: Object content remains due to rule-based replacement limitations
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
      const result = executeRules(input, LLM_METADATA_PROPERTY_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("extra_thoughts");
      expect(result.content).not.toContain("extra_notes");
      expect(result.content).toContain('"publicMethods": []');
    });
  });

  describe("llmArtifactPropertyByPattern", () => {
    it("should detect properties containing 'thought' in name", () => {
      const input = `{
  "name": "Test",
  "my_thought_process": "analyzing this code"
}`;
      const result = executeRules(input, LLM_METADATA_PROPERTY_RULES);
      // The pattern should detect "my_thought_process" as an LLM artifact
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("my_thought_process");
    });

    it("should detect properties containing 'thinking' in name", () => {
      const input = `{
  "data": [],
  "internal_thinking": "step by step"
}`;
      const result = executeRules(input, LLM_METADATA_PROPERTY_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("internal_thinking");
    });

    it("should detect properties containing 'reasoning' in name", () => {
      const input = `{
  "value": 42,
  "llm_reasoning_output": "because of X"
}`;
      const result = executeRules(input, LLM_METADATA_PROPERTY_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("llm_reasoning_output");
    });

    it("should detect properties containing 'scratchpad' in name", () => {
      const input = `{
  "result": "done",
  "model_scratchpad_notes": "working memory"
}`;
      const result = executeRules(input, LLM_METADATA_PROPERTY_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("model_scratchpad_notes");
    });

    it("should detect properties ending with '_analysis' suffix", () => {
      // The pattern catches properties that END with _analysis (LLM artifact suffix)
      // but not properties where "analysis" is in the middle (could be legitimate)
      const input = `{
  "summary": "complete",
  "llm_internal_analysis": "detailed breakdown"
}`;
      const result = executeRules(input, LLM_METADATA_PROPERTY_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("llm_internal_analysis");
    });

    it("should detect properties with 'analysis' anywhere in name", () => {
      // Properties containing "analysis" are now detected as LLM artifacts
      const input = `{
  "summary": "complete",
  "internal_analysis_data": "detailed breakdown"
}`;
      const result = executeRules(input, LLM_METADATA_PROPERTY_RULES);
      // Should be removed since "analysis" is in the pattern list
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("internal_analysis_data");
    });

    it("should preserve properties that are in knownProperties list", () => {
      // When knownProperties is provided, known properties should be preserved
      // This is handled by the executeRules context.config.knownProperties
      // The rule only removes properties that match artifact patterns AND are unknown
      const input = `{
  "name": "Test",
  "type": "class"
}`;
      const result = executeRules(input, LLM_METADATA_PROPERTY_RULES, {
        config: { knownProperties: ["name", "type"] },
      });
      // Valid properties should be preserved
      expect(result.content).toContain('"name": "Test"');
      expect(result.content).toContain('"type": "class"');
    });

    // Extended artifact pattern tests
    // Note: The llmArtifactPropertyByPattern rule requires at least one character BEFORE
    // the keyword in the property name. Properties where the keyword is at the start
    // (like "trace_data") are detected by isLLMArtifactPropertyName but not by the rule regex.
    it("should detect properties containing 'trace' in name with prefix", () => {
      const input = `{
  "name": "Test",
  "my_trace_output": "step1 -> step2"
}`;
      const result = executeRules(input, LLM_METADATA_PROPERTY_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("my_trace_output");
    });

    it("should detect properties containing 'chain' in name with prefix", () => {
      const input = `{
  "result": "done",
  "thought_chain_data": "premise -> conclusion"
}`;
      const result = executeRules(input, LLM_METADATA_PROPERTY_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("thought_chain_data");
    });

    it("should detect properties containing 'scratch' in name with prefix", () => {
      const input = `{
  "output": "final",
  "my_scratch_notes": "calculations here"
}`;
      const result = executeRules(input, LLM_METADATA_PROPERTY_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("my_scratch_notes");
    });

    it("should detect properties containing 'intermediate' in name with prefix", () => {
      // Note: "intermediate" as a substring works when there's a prefix before it
      const input = `{
  "final_result": 42,
  "llm_intermediate_value": "temp data"
}`;
      const result = executeRules(input, LLM_METADATA_PROPERTY_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("llm_intermediate_value");
    });

    it("should detect properties containing 'working_memory' pattern", () => {
      const input = `{
  "answer": "yes",
  "llm_working_memory_data": "context data"
}`;
      const result = executeRules(input, LLM_METADATA_PROPERTY_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("llm_working_memory_data");
    });

    it("should detect properties containing 'step_by_step' pattern", () => {
      const input = `{
  "summary": "complete",
  "my_step_by_step_work": "1. first, 2. second"
}`;
      const result = executeRules(input, LLM_METADATA_PROPERTY_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("my_step_by_step_work");
    });
  });

  describe("extra_* rule patterns - extended artifacts", () => {
    // These tests verify that extra_* style properties with new artifact keywords are detected
    it("should detect extra_trace property blocks", () => {
      const input = `{
  "name": "Test"
},
extra_trace: log output here
  "nextProp": "value"
}`;
      const result = executeRules(input, LLM_METADATA_PROPERTY_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("extra_trace");
    });

    it("should detect extra_working property blocks", () => {
      const input = `{
  "value": 123
},
extra_working: temporary storage
  "result": "final"
}`;
      const result = executeRules(input, LLM_METADATA_PROPERTY_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("extra_working");
    });

    it("should detect extra_draft property blocks", () => {
      const input = `{
  "name": "Test"
},
extra_draft: initial version of response
  "property": "value"
}`;
      const result = executeRules(input, LLM_METADATA_PROPERTY_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("extra_draft");
    });

    it("should detect extra_intermediate property blocks", () => {
      const input = `{
  "name": "Test"
},
extra_intermediate: not final yet
  "output": "result"
}`;
      const result = executeRules(input, LLM_METADATA_PROPERTY_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("extra_intermediate");
    });

    it("should detect extra_steps property blocks", () => {
      const input = `{
  "name": "Test"
},
extra_steps: step by step process
  "result": "done"
}`;
      const result = executeRules(input, LLM_METADATA_PROPERTY_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("extra_steps");
    });
  });
});

describe("isValidPropertyStartPosition", () => {
  it("should return true when context is after JSON delimiter", () => {
    const context = {
      beforeMatch: '{"name": "test"},',
      fullContent: '{"name": "test"},\n"property": "value"',
      offset: 17,
      groups: [] as const,
    };
    expect(isValidPropertyStartPosition(context)).toBe(true);
  });

  it("should return true when context is empty (start of file)", () => {
    const context = {
      beforeMatch: "",
      fullContent: '"property": "value"',
      offset: 0,
      groups: [] as const,
    };
    expect(isValidPropertyStartPosition(context)).toBe(true);
  });

  it("should return true when offset is at start of file", () => {
    const context = {
      beforeMatch: "x",
      fullContent: 'x"property": "value"',
      offset: 1,
      groups: [] as const,
    };
    expect(isValidPropertyStartPosition(context)).toBe(true);
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
    expect(isValidPropertyStartPosition(context)).toBe(true);
  });
});
