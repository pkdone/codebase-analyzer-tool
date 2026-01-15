import {
  hasSignificantRepairs,
  REPAIR_STEP,
  REPAIR_STEP_TEMPLATE,
} from "../../../../../src/common/llm/json-processing/sanitizers";

describe("hasSignificantRepairs", () => {
  describe("returns false when no significant steps", () => {
    it("should return false for undefined steps", () => {
      expect(hasSignificantRepairs(undefined)).toBe(false);
    });

    it("should return false for empty array", () => {
      expect(hasSignificantRepairs([])).toBe(false);
    });

    it("should return false for only insignificant steps - whitespace only", () => {
      const steps = [REPAIR_STEP.TRIMMED_WHITESPACE];
      expect(hasSignificantRepairs(steps)).toBe(false);
    });

    it("should return false for only insignificant steps - code fences only", () => {
      const steps = [REPAIR_STEP.REMOVED_CODE_FENCES];
      expect(hasSignificantRepairs(steps)).toBe(false);
    });

    it("should return false for multiple insignificant steps", () => {
      const steps = [REPAIR_STEP.TRIMMED_WHITESPACE, REPAIR_STEP.REMOVED_CODE_FENCES];
      expect(hasSignificantRepairs(steps)).toBe(false);
    });
  });

  describe("returns true when significant sanitization steps exist", () => {
    it("should return true for single significant step - control chars", () => {
      const steps = [REPAIR_STEP.REMOVED_CONTROL_CHARS];
      expect(hasSignificantRepairs(steps)).toBe(true);
    });

    it("should return true for single significant step - JSON span extraction", () => {
      const steps = [REPAIR_STEP.EXTRACTED_LARGEST_JSON_SPAN];
      expect(hasSignificantRepairs(steps)).toBe(true);
    });

    it("should return true for single significant step - duplicate collapse", () => {
      const steps = [REPAIR_STEP.COLLAPSED_DUPLICATE_JSON];
      expect(hasSignificantRepairs(steps)).toBe(true);
    });

    it("should return true for single significant step - trailing commas", () => {
      const steps = [REPAIR_STEP.REMOVED_TRAILING_COMMAS];
      expect(hasSignificantRepairs(steps)).toBe(true);
    });

    it("should return true for single significant step - over-escaped sequences", () => {
      const steps = [REPAIR_STEP.FIXED_OVER_ESCAPED_SEQUENCES];
      expect(hasSignificantRepairs(steps)).toBe(true);
    });

    it("should return true for single significant step - truncated structures", () => {
      const steps = [REPAIR_STEP.COMPLETED_TRUNCATED_STRUCTURES];
      expect(hasSignificantRepairs(steps)).toBe(true);
    });

    it("should return true for dynamic step - fixed concatenation chains", () => {
      const steps = [REPAIR_STEP_TEMPLATE.fixedConcatenationChains(2)];
      expect(hasSignificantRepairs(steps)).toBe(true);
    });

    it("should return true for dynamic step - added missing commas", () => {
      const steps = [REPAIR_STEP_TEMPLATE.addedMissingCommas(3)];
      expect(hasSignificantRepairs(steps)).toBe(true);
    });

    it("should return true for dynamic step - fixed mismatched delimiters", () => {
      const steps = [REPAIR_STEP_TEMPLATE.fixedMismatchedDelimiters(1)];
      expect(hasSignificantRepairs(steps)).toBe(true);
    });
  });

  describe("returns true when significant transform steps exist", () => {
    it("should return true for transform - remove incomplete array items", () => {
      const steps = [REPAIR_STEP.TRANSFORM_REMOVE_INCOMPLETE_ARRAY_ITEMS];
      expect(hasSignificantRepairs(steps)).toBe(true);
    });

    it("should return true for transform - coerce string to array", () => {
      const steps = [REPAIR_STEP.TRANSFORM_COERCE_STRING_TO_ARRAY];
      expect(hasSignificantRepairs(steps)).toBe(true);
    });

    it("should return true for transform - convert null to undefined", () => {
      const steps = [REPAIR_STEP.TRANSFORM_CONVERT_NULL_TO_UNDEFINED];
      expect(hasSignificantRepairs(steps)).toBe(true);
    });

    it("should return true for transform - fix common property name typos", () => {
      const steps = [REPAIR_STEP.TRANSFORM_FIX_COMMON_PROPERTY_NAME_TYPOS];
      expect(hasSignificantRepairs(steps)).toBe(true);
    });

    it("should return true for transform - coerce numeric properties", () => {
      const steps = [REPAIR_STEP.TRANSFORM_COERCE_NUMERIC_PROPERTIES];
      expect(hasSignificantRepairs(steps)).toBe(true);
    });

    it("should return true for transform - unwrap JSON schema structure", () => {
      const steps = [REPAIR_STEP.TRANSFORM_UNWRAP_JSON_SCHEMA_STRUCTURE];
      expect(hasSignificantRepairs(steps)).toBe(true);
    });
  });

  describe("handles mixed insignificant and significant steps", () => {
    it("should return true when significant step is first", () => {
      const steps = [REPAIR_STEP.REMOVED_CONTROL_CHARS, REPAIR_STEP.TRIMMED_WHITESPACE];
      expect(hasSignificantRepairs(steps)).toBe(true);
    });

    it("should return true when significant step is last", () => {
      const steps = [
        REPAIR_STEP.TRIMMED_WHITESPACE,
        REPAIR_STEP.REMOVED_CODE_FENCES,
        REPAIR_STEP.REMOVED_TRAILING_COMMAS,
      ];
      expect(hasSignificantRepairs(steps)).toBe(true);
    });

    it("should return true when significant step is in the middle", () => {
      const steps = [
        REPAIR_STEP.TRIMMED_WHITESPACE,
        REPAIR_STEP.COLLAPSED_DUPLICATE_JSON,
        REPAIR_STEP.REMOVED_CODE_FENCES,
      ];
      expect(hasSignificantRepairs(steps)).toBe(true);
    });

    it("should return true with multiple significant steps", () => {
      const steps = [
        REPAIR_STEP.TRIMMED_WHITESPACE,
        REPAIR_STEP.REMOVED_CONTROL_CHARS,
        REPAIR_STEP.EXTRACTED_LARGEST_JSON_SPAN,
        REPAIR_STEP_TEMPLATE.addedMissingCommas(2),
        REPAIR_STEP.REMOVED_CODE_FENCES,
      ];
      expect(hasSignificantRepairs(steps)).toBe(true);
    });

    it("should return true when mixing sanitization and transform steps", () => {
      const steps = [
        REPAIR_STEP.TRIMMED_WHITESPACE,
        REPAIR_STEP.REMOVED_CODE_FENCES,
        REPAIR_STEP.TRANSFORM_CONVERT_NULL_TO_UNDEFINED,
      ];
      expect(hasSignificantRepairs(steps)).toBe(true);
    });
  });

  describe("edge cases and robustness", () => {
    it("should handle array with only empty strings", () => {
      const steps = ["", "", ""];
      expect(hasSignificantRepairs(steps)).toBe(true);
    });

    it("should handle unknown step names as significant", () => {
      const steps = ["Unknown custom step"];
      expect(hasSignificantRepairs(steps)).toBe(true);
    });

    it("should handle very large arrays efficiently", () => {
      const steps = new Array(1000).fill(REPAIR_STEP.TRIMMED_WHITESPACE);
      expect(hasSignificantRepairs(steps)).toBe(false);

      const stepsWithSignificant = [...steps, REPAIR_STEP.REMOVED_CONTROL_CHARS];
      expect(hasSignificantRepairs(stepsWithSignificant)).toBe(true);
    });
  });

  describe("preserves short-circuit behavior", () => {
    it("should short-circuit on first significant step found", () => {
      // This test ensures the .some() method stops at the first match
      let callCount = 0;
      const steps = [
        REPAIR_STEP.TRIMMED_WHITESPACE,
        REPAIR_STEP.REMOVED_CONTROL_CHARS, // First significant step
        REPAIR_STEP.COLLAPSED_DUPLICATE_JSON,
      ];

      // Monkey-patch Set.has to count calls
      const originalHas = Set.prototype.has;
      Set.prototype.has = function (this: Set<string>, value: string) {
        callCount++;
        return originalHas.call(this, value);
      };

      hasSignificantRepairs(steps);

      // Restore original
      Set.prototype.has = originalHas;

      // Should have checked at most 2 steps before finding the significant one
      expect(callCount).toBeLessThanOrEqual(2);
    });
  });
});
