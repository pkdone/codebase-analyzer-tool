import { PROMPT_FRAGMENTS } from "../../src/prompt-templates/prompt-fragments";

describe("prompt-fragments", () => {
  describe("PROMPT_FRAGMENTS", () => {
    it("should be defined as a const object", () => {
      expect(PROMPT_FRAGMENTS).toBeDefined();
      expect(typeof PROMPT_FRAGMENTS).toBe("object");
    });

    it("should contain all expected fragment categories", () => {
      expect(PROMPT_FRAGMENTS.COMMON).toBeDefined();
      expect(PROMPT_FRAGMENTS.CODE_QUALITY).toBeDefined();
      expect(PROMPT_FRAGMENTS.DB_INTEGRATION).toBeDefined();
      expect(PROMPT_FRAGMENTS.INTEGRATION_POINTS).toBeDefined();
      expect(PROMPT_FRAGMENTS.SCHEDULED_JOBS).toBeDefined();
      expect(PROMPT_FRAGMENTS.JAVA_SPECIFIC).toBeDefined();
      expect(PROMPT_FRAGMENTS.JAVASCRIPT_SPECIFIC).toBeDefined();
      expect(PROMPT_FRAGMENTS.CSHARP_SPECIFIC).toBeDefined();
      expect(PROMPT_FRAGMENTS.PYTHON_SPECIFIC).toBeDefined();
      expect(PROMPT_FRAGMENTS.RUBY_SPECIFIC).toBeDefined();
    });

    it("should have non-empty fragment content", () => {
      Object.values(PROMPT_FRAGMENTS).forEach((category) => {
        Object.values(category).forEach((fragment) => {
          expect(typeof fragment).toBe("string");
          expect(fragment.length).toBeGreaterThan(0);
        });
      });
    });

    it("should have consistent fragment structure", () => {
      // Test that common fragments exist
      expect(PROMPT_FRAGMENTS.COMMON.PURPOSE).toBeDefined();
      expect(PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION).toBeDefined();

      // Test that code quality fragments exist
      expect(PROMPT_FRAGMENTS.CODE_QUALITY.INTRO).toBeDefined();
      expect(PROMPT_FRAGMENTS.CODE_QUALITY.METHOD_METRICS).toBeDefined();
      expect(PROMPT_FRAGMENTS.CODE_QUALITY.METHOD_SMELLS).toBeDefined();
      expect(PROMPT_FRAGMENTS.CODE_QUALITY.FILE_METRICS).toBeDefined();

      // Test that DB integration fragments exist
      expect(PROMPT_FRAGMENTS.DB_INTEGRATION.INTRO).toBeDefined();
      expect(PROMPT_FRAGMENTS.DB_INTEGRATION.REQUIRED_FIELDS).toBeDefined();
    });

    it("should not contain asterisk prefixes in fragments", () => {
      Object.values(PROMPT_FRAGMENTS).forEach((category) => {
        Object.values(category).forEach((fragment) => {
          // Fragments should not start with "* " since that's added during prompt construction
          expect(fragment).not.toMatch(/^\* /);
        });
      });
    });

    it("should have language-specific fragments", () => {
      // Java-specific fragments
      expect(PROMPT_FRAGMENTS.JAVA_SPECIFIC.INTERNAL_REFS).toBeDefined();
      expect(PROMPT_FRAGMENTS.JAVA_SPECIFIC.EXTERNAL_REFS).toBeDefined();
      expect(PROMPT_FRAGMENTS.JAVA_SPECIFIC.PUBLIC_METHODS).toBeDefined();
      expect(PROMPT_FRAGMENTS.JAVA_SPECIFIC.PUBLIC_CONSTANTS).toBeDefined();

      // JavaScript-specific fragments
      expect(PROMPT_FRAGMENTS.JAVASCRIPT_SPECIFIC.INTERNAL_REFS).toBeDefined();
      expect(PROMPT_FRAGMENTS.JAVASCRIPT_SPECIFIC.EXTERNAL_REFS).toBeDefined();

      // C#-specific fragments
      expect(PROMPT_FRAGMENTS.CSHARP_SPECIFIC.INTERNAL_REFS).toBeDefined();
      expect(PROMPT_FRAGMENTS.CSHARP_SPECIFIC.EXTERNAL_REFS).toBeDefined();
      expect(PROMPT_FRAGMENTS.CSHARP_SPECIFIC.PUBLIC_METHODS).toBeDefined();
      expect(PROMPT_FRAGMENTS.CSHARP_SPECIFIC.PUBLIC_CONSTANTS).toBeDefined();

      // Python-specific fragments
      expect(PROMPT_FRAGMENTS.PYTHON_SPECIFIC.INTERNAL_REFS).toBeDefined();
      expect(PROMPT_FRAGMENTS.PYTHON_SPECIFIC.EXTERNAL_REFS).toBeDefined();
      expect(PROMPT_FRAGMENTS.PYTHON_SPECIFIC.PUBLIC_METHODS).toBeDefined();
      expect(PROMPT_FRAGMENTS.PYTHON_SPECIFIC.PUBLIC_CONSTANTS).toBeDefined();

      // Ruby-specific fragments
      expect(PROMPT_FRAGMENTS.RUBY_SPECIFIC.INTERNAL_REFS).toBeDefined();
      expect(PROMPT_FRAGMENTS.RUBY_SPECIFIC.EXTERNAL_REFS).toBeDefined();
      expect(PROMPT_FRAGMENTS.RUBY_SPECIFIC.PUBLIC_METHODS).toBeDefined();
      expect(PROMPT_FRAGMENTS.RUBY_SPECIFIC.PUBLIC_CONSTANTS).toBeDefined();
    });
  });
});
