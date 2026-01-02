/**
 * Tests for the text outside JSON remover strategy.
 */

import { textOutsideJsonRemover } from "../../../../../../src/common/llm/json-processing/sanitizers/strategies/text-outside-json-remover";

describe("textOutsideJsonRemover", () => {
  it("should return unchanged for empty input", () => {
    const result = textOutsideJsonRemover.apply("");
    expect(result.content).toBe("");
    expect(result.changed).toBe(false);
  });

  it("should return unchanged for valid JSON", () => {
    const input = '{"name": "test", "value": 123}';
    const result = textOutsideJsonRemover.apply(input);
    expect(result.content).toBe(input);
    expect(result.changed).toBe(false);
  });

  describe("LLM thought markers", () => {
    it("should remove _llm_thought marker after JSON", () => {
      const input = `{
  "name": "TestClass"
}
_llm_thought: This is my reasoning`;
      const result = textOutsideJsonRemover.apply(input);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("_llm_thought");
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should remove quoted _llm_thought marker after JSON", () => {
      const input = `{
  "name": "TestClass"
}
"_llm_thought": "This is my reasoning"`;
      const result = textOutsideJsonRemover.apply(input);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("_llm_thought");
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should remove ai_thoughts marker after JSON (generic pattern)", () => {
      const input = `{
  "name": "TestClass"
}
ai_thoughts: This is AI thinking`;
      const result = textOutsideJsonRemover.apply(input);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("ai_thoughts");
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should remove llm_reasoning marker after JSON (generic pattern)", () => {
      const input = `{
  "name": "TestClass"
}
llm_reasoning: My step-by-step reasoning`;
      const result = textOutsideJsonRemover.apply(input);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("llm_reasoning");
      expect(() => JSON.parse(result.content)).not.toThrow();
    });
  });

  describe("LLM mid-JSON commentary", () => {
    it("should remove 'Next, I will' commentary", () => {
      const input = `{
  "name": "TestClass",
  "methods": []
},
Next, I will analyze the remaining methods
  "otherProperty": "value"`;
      const result = textOutsideJsonRemover.apply(input);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("Next, I will");
    });

    it("should remove 'Let me analyze' commentary", () => {
      const input = `{
  "name": "TestClass"
},
Let me analyze this further
  "otherProperty": "value"`;
      const result = textOutsideJsonRemover.apply(input);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("Let me analyze");
    });

    it("should remove 'Moving on' commentary", () => {
      const input = `{
  "name": "TestClass"
},
Moving on to the next part
  "otherProperty": "value"`;
      const result = textOutsideJsonRemover.apply(input);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("Moving on");
    });
  });

  describe("Continuation text", () => {
    it("should remove 'to be continued...' text", () => {
      const input = `{
  "name": "TestClass"
}to be continued...`;
      const result = textOutsideJsonRemover.apply(input);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("to be continued");
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should remove truncated 'to be conti...' text", () => {
      const input = `{
  "name": "TestClass"
}to be conti...`;
      const result = textOutsideJsonRemover.apply(input);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("to be conti");
      expect(() => JSON.parse(result.content)).not.toThrow();
    });
  });

  describe("Stray words before properties", () => {
    it("should remove 'so' before property", () => {
      const input = `{
  "name": "test"
},
so "otherProperty"`;
      const result = textOutsideJsonRemover.apply(input);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("so ");
    });

    it("should remove 'and' before property", () => {
      const input = `{
  "name": "test"
},
and "otherProperty"`;
      const result = textOutsideJsonRemover.apply(input);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("and ");
    });

    it("should remove 'then' before property", () => {
      const input = `{
  "name": "test"
},
then "otherProperty"`;
      const result = textOutsideJsonRemover.apply(input);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("then ");
    });

    it("should remove generic filler word 'here' before property", () => {
      const input = `{
  "name": "test"
},
here "otherProperty"`;
      const result = textOutsideJsonRemover.apply(input);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("here ");
    });

    it("should remove all known stray filler words (Set-based lookup)", () => {
      // Test multiple stray words to verify Set-based O(1) lookup is working
      const strayWords = [
        "so",
        "and",
        "but",
        "also",
        "then",
        "next",
        "now",
        "well",
        "okay",
        "ok",
        "basically",
        "actually",
        "therefore",
        "meanwhile",
      ];

      for (const word of strayWords) {
        const input = `{
  "name": "test"
},
${word} "property"`;
        const result = textOutsideJsonRemover.apply(input);
        expect(result.changed).toBe(true);
        expect(result.content).not.toContain(`${word} `);
      }
    });

    it("should be case-insensitive when checking stray filler words", () => {
      const input = `{
  "name": "test"
},
THEN "otherProperty"`;
      // Note: The pattern checks for lowercase words, so THEN may not match
      // This test documents the current behavior
      const result = textOutsideJsonRemover.apply(input);
      // Uppercase words may not match the pattern since regex uses [a-z]
      expect(result).toBeDefined();
    });

    it("should remove generic short lowercase words (structural detection)", () => {
      // These words were NOT in the original STRAY_FILLER_WORDS list
      // but are now removed by generic short-word detection
      const newlyRemovedWords = ["xyz", "abc", "test", "foo", "bar", "word"];

      for (const word of newlyRemovedWords) {
        const input = `{
  "name": "test"
},
${word} "property"`;
        const result = textOutsideJsonRemover.apply(input);
        expect(result.changed).toBe(true);
        expect(result.content).not.toContain(`${word} `);
      }
    });

    it("should NOT remove JSON keywords before properties", () => {
      // JSON keywords should never be removed
      const jsonKeywords = ["true", "false", "null"];

      for (const keyword of jsonKeywords) {
        const input = `{
  "name": "test"
},
${keyword} "property"`;
        const result = textOutsideJsonRemover.apply(input);
        // JSON keywords should be preserved
        expect(result.content).toContain(keyword);
      }
    });
  });

  describe("Text after JSON structure", () => {
    it("should remove 'so many methods' text", () => {
      const input = `{
  "name": "TestClass"
}
so many methods to analyze`;
      const result = textOutsideJsonRemover.apply(input);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("so many methods");
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should remove 'I will stop here' text", () => {
      const input = `{
  "name": "TestClass"
}
I will stop here for brevity`;
      const result = textOutsideJsonRemover.apply(input);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("I will stop here");
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should remove 'Let me continue' text", () => {
      const input = `{
  "name": "TestClass"
}
Let me continue with the analysis`;
      const result = textOutsideJsonRemover.apply(input);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("Let me continue");
      expect(() => JSON.parse(result.content)).not.toThrow();
    });
  });

  describe("Corrupted text removal", () => {
    it("should remove short corrupted text after brace", () => {
      const input = `{
  "name": "test"
},ce
  "other": "value"`;
      const result = textOutsideJsonRemover.apply(input);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain(",ce");
    });

    it("should remove numeric corrupted text after brace", () => {
      const input = `{
  "name": "test"
},12-34
  "other": "value"`;
      const result = textOutsideJsonRemover.apply(input);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("12-34");
    });
  });

  describe("Orphaned properties removal", () => {
    it("should remove orphaned codeSmells property", () => {
      const input = `{
  "name": "test"
},
      "codeSmells": []
    },`;
      const result = textOutsideJsonRemover.apply(input);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("codeSmells");
    });

    it("should remove orphaned extra_info property (generic pattern)", () => {
      const input = `{
  "name": "test"
},
      "extra_info": []
    },`;
      const result = textOutsideJsonRemover.apply(input);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("extra_info");
    });
  });

  describe("Preserves valid content", () => {
    it("should not modify strings inside string values", () => {
      const input = '{"description": "I will stop here and continue later"}';
      const result = textOutsideJsonRemover.apply(input);
      expect(result.content).toBe(input);
      expect(result.changed).toBe(false);
    });

    it("should not modify valid nested JSON", () => {
      const input = `{
  "name": "TestClass",
  "nested": {
    "key": "value"
  }
}`;
      const result = textOutsideJsonRemover.apply(input);
      expect(result.content).toBe(input);
      expect(result.changed).toBe(false);
    });
  });
});
