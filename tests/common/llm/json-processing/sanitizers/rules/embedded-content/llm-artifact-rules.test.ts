import { executeRules } from "../../../../../../../src/common/llm/json-processing/sanitizers/rules/rule-executor";
import { LLM_ARTIFACT_RULES } from "../../../../../../../src/common/llm/json-processing/sanitizers/rules/embedded-content/llm-artifact-rules";

describe("LLM_ARTIFACT_RULES", () => {
  describe("binaryCorruptionMarker", () => {
    it("should remove binary corruption marker and fix property name", () => {
      const input = `{
  "name": "Test"
},
<x_bin_151>publicConstants": []
}`;
      const result = executeRules(input, LLM_ARTIFACT_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).toContain('"publicConstants": []');
      expect(result.content).not.toContain("<x_bin_");
    });

    it("should handle various binary marker numbers", () => {
      const input = `{
  "data": "value"
}
<x_bin_42>items": ["a", "b"]
}`;
      const result = executeRules(input, LLM_ARTIFACT_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).toContain('"items": ["a", "b"]');
      expect(result.content).not.toContain("<x_bin_42>");
    });

    it("should handle binary marker after newline", () => {
      const input = `{
<x_bin_99>firstProp": "value"
}`;
      const result = executeRules(input, LLM_ARTIFACT_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).toContain('"firstProp": "value"');
    });
  });

  describe("aiContentWarning", () => {
    it("should remove AI-generated content warning", () => {
      const input = `{
  "name": "Test"
}
AI-generated content. Review and use carefully. Content may be inaccurate.`;
      const result = executeRules(input, LLM_ARTIFACT_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("AI-generated content");
      expect(result.content).not.toContain("Review and use carefully");
    });

    it("should handle AI warning with varying whitespace", () => {
      const input = `{
  "data": []
}
AI-generated  content.  Review  and  use  carefully.  Content  may  be  inaccurate.`;
      const result = executeRules(input, LLM_ARTIFACT_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("AI-generated");
    });

    it("should be case-insensitive", () => {
      const input = `{
  "result": "done"
}
ai-generated content. review and use carefully. content may be inaccurate.`;
      const result = executeRules(input, LLM_ARTIFACT_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("ai-generated");
    });
  });

  describe("truncatedExplanatoryTextInArray", () => {
    it("should remove truncated explanatory text after empty array", () => {
      const input = `{
  "items": []
    },
there are more items but I'm truncating here"
}`;
      const result = executeRules(input, LLM_ARTIFACT_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("truncating");
    });

    it("should remove first-person statements after empty array", () => {
      const input = `{
  "methods": []
    },
I have identified several methods but for brevity"
}`;
      const result = executeRules(input, LLM_ARTIFACT_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("I have identified");
    });

    it("should not remove valid JSON content", () => {
      const input = `{
  "items": []
    },
  "nextProperty": "value"
}`;
      const result = executeRules(input, LLM_ARTIFACT_RULES);
      // Should not change valid JSON structure
      expect(result.content).toContain('"nextProperty": "value"');
    });
  });

  describe("integration tests", () => {
    it("should handle multiple artifact types in same content", () => {
      const input = `{
  "name": "Test"
},
<x_bin_100>propertyA": "value"
}
AI-generated content. Review and use carefully. Content may be inaccurate.`;
      const result = executeRules(input, LLM_ARTIFACT_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).toContain('"propertyA": "value"');
      expect(result.content).not.toContain("<x_bin_");
      expect(result.content).not.toContain("AI-generated");
    });

    it("should produce valid JSON after cleaning artifacts", () => {
      const input = `{
  "name": "TestClass",
  "methods": []
},
<x_bin_42>purpose": "Testing artifact removal"
}`;
      const result = executeRules(input, LLM_ARTIFACT_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).toContain('"purpose": "Testing artifact removal"');
    });
  });
});
