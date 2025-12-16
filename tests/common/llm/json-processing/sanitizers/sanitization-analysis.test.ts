import {
  hasSignificantSanitizationSteps,
  SANITIZATION_STEP,
  SANITIZATION_STEP_TEMPLATE,
} from "../../../../../src/common/llm/json-processing/sanitizers";

describe("hasSignificantSanitizationSteps", () => {
  describe("returns false when no significant steps", () => {
    it("should return false for undefined steps", () => {
      expect(hasSignificantSanitizationSteps(undefined)).toBe(false);
    });

    it("should return false for empty array", () => {
      expect(hasSignificantSanitizationSteps([])).toBe(false);
    });

    it("should return false for only insignificant steps - whitespace only", () => {
      const steps = [SANITIZATION_STEP.TRIMMED_WHITESPACE];
      expect(hasSignificantSanitizationSteps(steps)).toBe(false);
    });

    it("should return false for only insignificant steps - code fences only", () => {
      const steps = [SANITIZATION_STEP.REMOVED_CODE_FENCES];
      expect(hasSignificantSanitizationSteps(steps)).toBe(false);
    });

    it("should return false for multiple insignificant steps", () => {
      const steps = [SANITIZATION_STEP.TRIMMED_WHITESPACE, SANITIZATION_STEP.REMOVED_CODE_FENCES];
      expect(hasSignificantSanitizationSteps(steps)).toBe(false);
    });
  });

  describe("returns true when significant steps exist", () => {
    it("should return true for single significant step - control chars", () => {
      const steps = [SANITIZATION_STEP.REMOVED_CONTROL_CHARS];
      expect(hasSignificantSanitizationSteps(steps)).toBe(true);
    });

    it("should return true for single significant step - JSON span extraction", () => {
      const steps = [SANITIZATION_STEP.EXTRACTED_LARGEST_JSON_SPAN];
      expect(hasSignificantSanitizationSteps(steps)).toBe(true);
    });

    it("should return true for single significant step - schema unwrapping", () => {
      const steps = [SANITIZATION_STEP.UNWRAPPED_JSON_SCHEMA];
      expect(hasSignificantSanitizationSteps(steps)).toBe(true);
    });

    it("should return true for single significant step - duplicate collapse", () => {
      const steps = [SANITIZATION_STEP.COLLAPSED_DUPLICATE_JSON];
      expect(hasSignificantSanitizationSteps(steps)).toBe(true);
    });

    it("should return true for single significant step - trailing commas", () => {
      const steps = [SANITIZATION_STEP.REMOVED_TRAILING_COMMAS];
      expect(hasSignificantSanitizationSteps(steps)).toBe(true);
    });

    it("should return true for single significant step - over-escaped sequences", () => {
      const steps = [SANITIZATION_STEP.FIXED_OVER_ESCAPED_SEQUENCES];
      expect(hasSignificantSanitizationSteps(steps)).toBe(true);
    });

    it("should return true for single significant step - truncated structures", () => {
      const steps = [SANITIZATION_STEP.COMPLETED_TRUNCATED_STRUCTURES];
      expect(hasSignificantSanitizationSteps(steps)).toBe(true);
    });

    it("should return true for dynamic step - fixed concatenation chains", () => {
      const steps = [SANITIZATION_STEP_TEMPLATE.fixedConcatenationChains(2)];
      expect(hasSignificantSanitizationSteps(steps)).toBe(true);
    });

    it("should return true for dynamic step - added missing commas", () => {
      const steps = [SANITIZATION_STEP_TEMPLATE.addedMissingCommas(3)];
      expect(hasSignificantSanitizationSteps(steps)).toBe(true);
    });

    it("should return true for dynamic step - fixed mismatched delimiters", () => {
      const steps = [SANITIZATION_STEP_TEMPLATE.fixedMismatchedDelimiters(1)];
      expect(hasSignificantSanitizationSteps(steps)).toBe(true);
    });
  });

  describe("handles mixed insignificant and significant steps", () => {
    it("should return true when significant step is first", () => {
      const steps = [SANITIZATION_STEP.REMOVED_CONTROL_CHARS, SANITIZATION_STEP.TRIMMED_WHITESPACE];
      expect(hasSignificantSanitizationSteps(steps)).toBe(true);
    });

    it("should return true when significant step is last", () => {
      const steps = [
        SANITIZATION_STEP.TRIMMED_WHITESPACE,
        SANITIZATION_STEP.REMOVED_CODE_FENCES,
        SANITIZATION_STEP.REMOVED_TRAILING_COMMAS,
      ];
      expect(hasSignificantSanitizationSteps(steps)).toBe(true);
    });

    it("should return true when significant step is in the middle", () => {
      const steps = [
        SANITIZATION_STEP.TRIMMED_WHITESPACE,
        SANITIZATION_STEP.COLLAPSED_DUPLICATE_JSON,
        SANITIZATION_STEP.REMOVED_CODE_FENCES,
      ];
      expect(hasSignificantSanitizationSteps(steps)).toBe(true);
    });

    it("should return true with multiple significant steps", () => {
      const steps = [
        SANITIZATION_STEP.TRIMMED_WHITESPACE,
        SANITIZATION_STEP.REMOVED_CONTROL_CHARS,
        SANITIZATION_STEP.EXTRACTED_LARGEST_JSON_SPAN,
        SANITIZATION_STEP_TEMPLATE.addedMissingCommas(2),
        SANITIZATION_STEP.REMOVED_CODE_FENCES,
      ];
      expect(hasSignificantSanitizationSteps(steps)).toBe(true);
    });
  });

  describe("edge cases and robustness", () => {
    it("should handle array with only empty strings", () => {
      const steps = ["", "", ""];
      expect(hasSignificantSanitizationSteps(steps)).toBe(true);
    });

    it("should handle unknown step names as significant", () => {
      const steps = ["Unknown custom step"];
      expect(hasSignificantSanitizationSteps(steps)).toBe(true);
    });

    it("should handle very large arrays efficiently", () => {
      const steps = new Array(1000).fill(SANITIZATION_STEP.TRIMMED_WHITESPACE);
      expect(hasSignificantSanitizationSteps(steps)).toBe(false);

      const stepsWithSignificant = [...steps, SANITIZATION_STEP.REMOVED_CONTROL_CHARS];
      expect(hasSignificantSanitizationSteps(stepsWithSignificant)).toBe(true);
    });
  });

  describe("preserves short-circuit behavior", () => {
    it("should short-circuit on first significant step found", () => {
      // This test ensures the .some() method stops at the first match
      let callCount = 0;
      const steps = [
        SANITIZATION_STEP.TRIMMED_WHITESPACE,
        SANITIZATION_STEP.REMOVED_CONTROL_CHARS, // First significant step
        SANITIZATION_STEP.COLLAPSED_DUPLICATE_JSON,
      ];

      // Monkey-patch Set.has to count calls
      const originalHas = Set.prototype.has;
      Set.prototype.has = function (this: Set<string>, value: string) {
        callCount++;
        return originalHas.call(this, value);
      };

      hasSignificantSanitizationSteps(steps);

      // Restore original
      Set.prototype.has = originalHas;

      // Should have checked at most 2 steps before finding the significant one
      expect(callCount).toBeLessThanOrEqual(2);
    });
  });
});
