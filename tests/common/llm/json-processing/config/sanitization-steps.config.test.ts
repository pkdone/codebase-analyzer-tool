import {
  SANITIZATION_STEP,
  SANITIZATION_STEP_TEMPLATE,
  INSIGNIFICANT_SANITIZATION_STEPS,
} from "../../../../../src/common/llm/json-processing/constants/sanitization-steps.config";

describe("sanitization-steps.config", () => {
  describe("SANITIZATION_STEP", () => {
    it("should contain all expected step descriptions", () => {
      expect(SANITIZATION_STEP.TRIMMED_WHITESPACE).toBe("Trimmed whitespace");
      expect(SANITIZATION_STEP.REMOVED_CODE_FENCES).toBe("Removed code fences");
      expect(SANITIZATION_STEP.REMOVED_CONTROL_CHARS).toBe(
        "Removed control / zero-width characters",
      );
      expect(SANITIZATION_STEP.EXTRACTED_LARGEST_JSON_SPAN).toBe("Extracted largest JSON span");
      expect(SANITIZATION_STEP.UNWRAPPED_JSON_SCHEMA).toBe(
        "Unwrapped JSON Schema to extract properties",
      );
      expect(SANITIZATION_STEP.COLLAPSED_DUPLICATE_JSON).toBe(
        "Collapsed duplicated identical JSON object",
      );
      expect(SANITIZATION_STEP.REMOVED_TRAILING_COMMAS).toBe("Removed trailing commas");
      expect(SANITIZATION_STEP.FIXED_OVER_ESCAPED_SEQUENCES).toBe("Fixed over-escaped sequences");
      expect(SANITIZATION_STEP.COMPLETED_TRUNCATED_STRUCTURES).toBe(
        "Completed truncated JSON structures",
      );
    });

    it("should be frozen to prevent mutations", () => {
      expect(() => {
        (SANITIZATION_STEP as any).TRIMMED_WHITESPACE = "Modified";
      }).toThrow();
    });
  });

  describe("SANITIZATION_STEP_TEMPLATE", () => {
    describe("fixedConcatenationChains", () => {
      it("should handle singular form", () => {
        expect(SANITIZATION_STEP_TEMPLATE.fixedConcatenationChains(1)).toBe(
          "Fixed 1 concatenation chain",
        );
      });

      it("should handle plural form", () => {
        expect(SANITIZATION_STEP_TEMPLATE.fixedConcatenationChains(2)).toBe(
          "Fixed 2 concatenation chains",
        );
        expect(SANITIZATION_STEP_TEMPLATE.fixedConcatenationChains(0)).toBe(
          "Fixed 0 concatenation chains",
        );
      });
    });

    describe("addedMissingCommas", () => {
      it("should handle singular form", () => {
        expect(SANITIZATION_STEP_TEMPLATE.addedMissingCommas(1)).toBe(
          "Added 1 missing comma between properties",
        );
      });

      it("should handle plural form", () => {
        expect(SANITIZATION_STEP_TEMPLATE.addedMissingCommas(2)).toBe(
          "Added 2 missing commas between properties",
        );
        expect(SANITIZATION_STEP_TEMPLATE.addedMissingCommas(0)).toBe(
          "Added 0 missing commas between properties",
        );
      });
    });

    describe("fixedMismatchedDelimiters", () => {
      it("should handle singular form", () => {
        expect(SANITIZATION_STEP_TEMPLATE.fixedMismatchedDelimiters(1)).toBe(
          "Fixed 1 mismatched delimiter",
        );
      });

      it("should handle plural form", () => {
        expect(SANITIZATION_STEP_TEMPLATE.fixedMismatchedDelimiters(2)).toBe(
          "Fixed 2 mismatched delimiters",
        );
        expect(SANITIZATION_STEP_TEMPLATE.fixedMismatchedDelimiters(0)).toBe(
          "Fixed 0 mismatched delimiters",
        );
      });
    });

    it("should be frozen to prevent mutations", () => {
      expect(() => {
        (SANITIZATION_STEP_TEMPLATE as any).fixedConcatenationChains = () => "Modified";
      }).toThrow();
    });
  });

  describe("INSIGNIFICANT_SANITIZATION_STEPS", () => {
    it("should contain expected insignificant steps", () => {
      expect(INSIGNIFICANT_SANITIZATION_STEPS.has(SANITIZATION_STEP.TRIMMED_WHITESPACE)).toBe(true);
      expect(INSIGNIFICANT_SANITIZATION_STEPS.has(SANITIZATION_STEP.REMOVED_CODE_FENCES)).toBe(
        true,
      );
    });

    it("should not contain significant steps", () => {
      expect(INSIGNIFICANT_SANITIZATION_STEPS.has(SANITIZATION_STEP.REMOVED_CONTROL_CHARS)).toBe(
        false,
      );
      expect(
        INSIGNIFICANT_SANITIZATION_STEPS.has(SANITIZATION_STEP.EXTRACTED_LARGEST_JSON_SPAN),
      ).toBe(false);
    });

    it("should be a ReadonlySet", () => {
      expect(INSIGNIFICANT_SANITIZATION_STEPS).toBeInstanceOf(Set);
      expect(INSIGNIFICANT_SANITIZATION_STEPS.size).toBe(2);
      // ReadonlySet provides compile-time immutability, not runtime protection
      // In a constants file, this is acceptable as the Set is not exported as mutable
    });
  });
});
