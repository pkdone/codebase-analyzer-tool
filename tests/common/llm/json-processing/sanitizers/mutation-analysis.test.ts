import {
  hasSignificantMutationSteps,
  MUTATION_STEP,
  MUTATION_STEP_TEMPLATE,
} from "../../../../../src/common/llm/json-processing/sanitizers";

describe("hasSignificantMutationSteps", () => {
  describe("returns false when no significant steps", () => {
    it("should return false for undefined steps", () => {
      expect(hasSignificantMutationSteps(undefined)).toBe(false);
    });

    it("should return false for empty array", () => {
      expect(hasSignificantMutationSteps([])).toBe(false);
    });

    it("should return false for only insignificant steps - whitespace only", () => {
      const steps = [MUTATION_STEP.TRIMMED_WHITESPACE];
      expect(hasSignificantMutationSteps(steps)).toBe(false);
    });

    it("should return false for only insignificant steps - code fences only", () => {
      const steps = [MUTATION_STEP.REMOVED_CODE_FENCES];
      expect(hasSignificantMutationSteps(steps)).toBe(false);
    });

    it("should return false for multiple insignificant steps", () => {
      const steps = [MUTATION_STEP.TRIMMED_WHITESPACE, MUTATION_STEP.REMOVED_CODE_FENCES];
      expect(hasSignificantMutationSteps(steps)).toBe(false);
    });
  });

  describe("returns true when significant sanitization steps exist", () => {
    it("should return true for single significant step - control chars", () => {
      const steps = [MUTATION_STEP.REMOVED_CONTROL_CHARS];
      expect(hasSignificantMutationSteps(steps)).toBe(true);
    });

    it("should return true for single significant step - JSON span extraction", () => {
      const steps = [MUTATION_STEP.EXTRACTED_LARGEST_JSON_SPAN];
      expect(hasSignificantMutationSteps(steps)).toBe(true);
    });

    it("should return true for single significant step - duplicate collapse", () => {
      const steps = [MUTATION_STEP.COLLAPSED_DUPLICATE_JSON];
      expect(hasSignificantMutationSteps(steps)).toBe(true);
    });

    it("should return true for single significant step - trailing commas", () => {
      const steps = [MUTATION_STEP.REMOVED_TRAILING_COMMAS];
      expect(hasSignificantMutationSteps(steps)).toBe(true);
    });

    it("should return true for single significant step - over-escaped sequences", () => {
      const steps = [MUTATION_STEP.FIXED_OVER_ESCAPED_SEQUENCES];
      expect(hasSignificantMutationSteps(steps)).toBe(true);
    });

    it("should return true for single significant step - truncated structures", () => {
      const steps = [MUTATION_STEP.COMPLETED_TRUNCATED_STRUCTURES];
      expect(hasSignificantMutationSteps(steps)).toBe(true);
    });

    it("should return true for dynamic step - fixed concatenation chains", () => {
      const steps = [MUTATION_STEP_TEMPLATE.fixedConcatenationChains(2)];
      expect(hasSignificantMutationSteps(steps)).toBe(true);
    });

    it("should return true for dynamic step - added missing commas", () => {
      const steps = [MUTATION_STEP_TEMPLATE.addedMissingCommas(3)];
      expect(hasSignificantMutationSteps(steps)).toBe(true);
    });

    it("should return true for dynamic step - fixed mismatched delimiters", () => {
      const steps = [MUTATION_STEP_TEMPLATE.fixedMismatchedDelimiters(1)];
      expect(hasSignificantMutationSteps(steps)).toBe(true);
    });
  });

  describe("returns true when significant transform steps exist", () => {
    it("should return true for transform - remove incomplete array items", () => {
      const steps = [MUTATION_STEP.TRANSFORM_REMOVE_INCOMPLETE_ARRAY_ITEMS];
      expect(hasSignificantMutationSteps(steps)).toBe(true);
    });

    it("should return true for transform - coerce string to array", () => {
      const steps = [MUTATION_STEP.TRANSFORM_COERCE_STRING_TO_ARRAY];
      expect(hasSignificantMutationSteps(steps)).toBe(true);
    });

    it("should return true for transform - convert null to undefined", () => {
      const steps = [MUTATION_STEP.TRANSFORM_CONVERT_NULL_TO_UNDEFINED];
      expect(hasSignificantMutationSteps(steps)).toBe(true);
    });

    it("should return true for transform - fix common property name typos", () => {
      const steps = [MUTATION_STEP.TRANSFORM_FIX_COMMON_PROPERTY_NAME_TYPOS];
      expect(hasSignificantMutationSteps(steps)).toBe(true);
    });

    it("should return true for transform - coerce numeric properties", () => {
      const steps = [MUTATION_STEP.TRANSFORM_COERCE_NUMERIC_PROPERTIES];
      expect(hasSignificantMutationSteps(steps)).toBe(true);
    });

    it("should return true for transform - unwrap JSON schema structure", () => {
      const steps = [MUTATION_STEP.TRANSFORM_UNWRAP_JSON_SCHEMA_STRUCTURE];
      expect(hasSignificantMutationSteps(steps)).toBe(true);
    });
  });

  describe("handles mixed insignificant and significant steps", () => {
    it("should return true when significant step is first", () => {
      const steps = [MUTATION_STEP.REMOVED_CONTROL_CHARS, MUTATION_STEP.TRIMMED_WHITESPACE];
      expect(hasSignificantMutationSteps(steps)).toBe(true);
    });

    it("should return true when significant step is last", () => {
      const steps = [
        MUTATION_STEP.TRIMMED_WHITESPACE,
        MUTATION_STEP.REMOVED_CODE_FENCES,
        MUTATION_STEP.REMOVED_TRAILING_COMMAS,
      ];
      expect(hasSignificantMutationSteps(steps)).toBe(true);
    });

    it("should return true when significant step is in the middle", () => {
      const steps = [
        MUTATION_STEP.TRIMMED_WHITESPACE,
        MUTATION_STEP.COLLAPSED_DUPLICATE_JSON,
        MUTATION_STEP.REMOVED_CODE_FENCES,
      ];
      expect(hasSignificantMutationSteps(steps)).toBe(true);
    });

    it("should return true with multiple significant steps", () => {
      const steps = [
        MUTATION_STEP.TRIMMED_WHITESPACE,
        MUTATION_STEP.REMOVED_CONTROL_CHARS,
        MUTATION_STEP.EXTRACTED_LARGEST_JSON_SPAN,
        MUTATION_STEP_TEMPLATE.addedMissingCommas(2),
        MUTATION_STEP.REMOVED_CODE_FENCES,
      ];
      expect(hasSignificantMutationSteps(steps)).toBe(true);
    });

    it("should return true when mixing sanitization and transform steps", () => {
      const steps = [
        MUTATION_STEP.TRIMMED_WHITESPACE,
        MUTATION_STEP.REMOVED_CODE_FENCES,
        MUTATION_STEP.TRANSFORM_CONVERT_NULL_TO_UNDEFINED,
      ];
      expect(hasSignificantMutationSteps(steps)).toBe(true);
    });
  });

  describe("edge cases and robustness", () => {
    it("should handle array with only empty strings", () => {
      const steps = ["", "", ""];
      expect(hasSignificantMutationSteps(steps)).toBe(true);
    });

    it("should handle unknown step names as significant", () => {
      const steps = ["Unknown custom step"];
      expect(hasSignificantMutationSteps(steps)).toBe(true);
    });

    it("should handle very large arrays efficiently", () => {
      const steps = new Array(1000).fill(MUTATION_STEP.TRIMMED_WHITESPACE);
      expect(hasSignificantMutationSteps(steps)).toBe(false);

      const stepsWithSignificant = [...steps, MUTATION_STEP.REMOVED_CONTROL_CHARS];
      expect(hasSignificantMutationSteps(stepsWithSignificant)).toBe(true);
    });
  });

  describe("preserves short-circuit behavior", () => {
    it("should short-circuit on first significant step found", () => {
      // This test ensures the .some() method stops at the first match
      let callCount = 0;
      const steps = [
        MUTATION_STEP.TRIMMED_WHITESPACE,
        MUTATION_STEP.REMOVED_CONTROL_CHARS, // First significant step
        MUTATION_STEP.COLLAPSED_DUPLICATE_JSON,
      ];

      // Monkey-patch Set.has to count calls
      const originalHas = Set.prototype.has;
      Set.prototype.has = function (this: Set<string>, value: string) {
        callCount++;
        return originalHas.call(this, value);
      };

      hasSignificantMutationSteps(steps);

      // Restore original
      Set.prototype.has = originalHas;

      // Should have checked at most 2 steps before finding the significant one
      expect(callCount).toBeLessThanOrEqual(2);
    });
  });
});
