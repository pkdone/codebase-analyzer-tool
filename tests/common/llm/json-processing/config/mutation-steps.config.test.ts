import {
  MUTATION_STEP,
  MUTATION_STEP_TEMPLATE,
  INSIGNIFICANT_MUTATION_STEPS,
} from "../../../../../src/common/llm/json-processing/constants/mutation-steps.config";

describe("mutation-steps.config", () => {
  describe("MUTATION_STEP", () => {
    it("should contain all expected sanitization step descriptions", () => {
      expect(MUTATION_STEP.TRIMMED_WHITESPACE).toBe("Trimmed whitespace");
      expect(MUTATION_STEP.REMOVED_CODE_FENCES).toBe("Removed code fences");
      expect(MUTATION_STEP.REMOVED_CONTROL_CHARS).toBe("Removed control / zero-width characters");
      expect(MUTATION_STEP.EXTRACTED_LARGEST_JSON_SPAN).toBe("Extracted largest JSON span");
      expect(MUTATION_STEP.COLLAPSED_DUPLICATE_JSON).toBe("Collapsed duplicate JSON object");
      expect(MUTATION_STEP.REMOVED_TRAILING_COMMAS).toBe("Removed trailing commas");
      expect(MUTATION_STEP.FIXED_OVER_ESCAPED_SEQUENCES).toBe("Fixed over-escaped sequences");
      expect(MUTATION_STEP.COMPLETED_TRUNCATED_STRUCTURES).toBe(
        "Completed truncated JSON structures",
      );
    });

    it("should contain all expected transform step descriptions", () => {
      expect(MUTATION_STEP.TRANSFORM_REMOVE_INCOMPLETE_ARRAY_ITEMS).toBe(
        "removeIncompleteArrayItems",
      );
      expect(MUTATION_STEP.TRANSFORM_COERCE_STRING_TO_ARRAY).toBe("coerceStringToArray");
      expect(MUTATION_STEP.TRANSFORM_CONVERT_NULL_TO_UNDEFINED).toBe("convertNullToUndefined");
      expect(MUTATION_STEP.TRANSFORM_FIX_COMMON_PROPERTY_NAME_TYPOS).toBe(
        "fixCommonPropertyNameTypos",
      );
      expect(MUTATION_STEP.TRANSFORM_COERCE_NUMERIC_PROPERTIES).toBe("coerceNumericProperties");
      expect(MUTATION_STEP.TRANSFORM_UNWRAP_JSON_SCHEMA_STRUCTURE).toBe(
        "unwrapJsonSchemaStructure",
      );
    });

    it("should be frozen to prevent mutations", () => {
      expect(() => {
        (MUTATION_STEP as any).TRIMMED_WHITESPACE = "Modified";
      }).toThrow();
    });
  });

  describe("MUTATION_STEP_TEMPLATE", () => {
    describe("fixedConcatenationChains", () => {
      it("should handle singular form", () => {
        expect(MUTATION_STEP_TEMPLATE.fixedConcatenationChains(1)).toBe(
          "Fixed 1 concatenation chain",
        );
      });

      it("should handle plural form", () => {
        expect(MUTATION_STEP_TEMPLATE.fixedConcatenationChains(2)).toBe(
          "Fixed 2 concatenation chains",
        );
        expect(MUTATION_STEP_TEMPLATE.fixedConcatenationChains(0)).toBe(
          "Fixed 0 concatenation chains",
        );
      });
    });

    describe("addedMissingCommas", () => {
      it("should handle singular form", () => {
        expect(MUTATION_STEP_TEMPLATE.addedMissingCommas(1)).toBe(
          "Added 1 missing comma between properties",
        );
      });

      it("should handle plural form", () => {
        expect(MUTATION_STEP_TEMPLATE.addedMissingCommas(2)).toBe(
          "Added 2 missing commas between properties",
        );
        expect(MUTATION_STEP_TEMPLATE.addedMissingCommas(0)).toBe(
          "Added 0 missing commas between properties",
        );
      });
    });

    describe("fixedMismatchedDelimiters", () => {
      it("should handle singular form", () => {
        expect(MUTATION_STEP_TEMPLATE.fixedMismatchedDelimiters(1)).toBe(
          "Fixed 1 mismatched delimiter",
        );
      });

      it("should handle plural form", () => {
        expect(MUTATION_STEP_TEMPLATE.fixedMismatchedDelimiters(2)).toBe(
          "Fixed 2 mismatched delimiters",
        );
        expect(MUTATION_STEP_TEMPLATE.fixedMismatchedDelimiters(0)).toBe(
          "Fixed 0 mismatched delimiters",
        );
      });
    });

    it("should be frozen to prevent mutations", () => {
      expect(() => {
        (MUTATION_STEP_TEMPLATE as any).fixedConcatenationChains = () => "Modified";
      }).toThrow();
    });
  });

  describe("INSIGNIFICANT_MUTATION_STEPS", () => {
    it("should contain expected insignificant steps", () => {
      expect(INSIGNIFICANT_MUTATION_STEPS.has(MUTATION_STEP.TRIMMED_WHITESPACE)).toBe(true);
      expect(INSIGNIFICANT_MUTATION_STEPS.has(MUTATION_STEP.REMOVED_CODE_FENCES)).toBe(true);
    });

    it("should not contain significant sanitization steps", () => {
      expect(INSIGNIFICANT_MUTATION_STEPS.has(MUTATION_STEP.REMOVED_CONTROL_CHARS)).toBe(false);
      expect(INSIGNIFICANT_MUTATION_STEPS.has(MUTATION_STEP.EXTRACTED_LARGEST_JSON_SPAN)).toBe(
        false,
      );
    });

    it("should not contain any transform steps (all transforms are significant)", () => {
      expect(
        INSIGNIFICANT_MUTATION_STEPS.has(MUTATION_STEP.TRANSFORM_REMOVE_INCOMPLETE_ARRAY_ITEMS),
      ).toBe(false);
      expect(INSIGNIFICANT_MUTATION_STEPS.has(MUTATION_STEP.TRANSFORM_COERCE_STRING_TO_ARRAY)).toBe(
        false,
      );
      expect(
        INSIGNIFICANT_MUTATION_STEPS.has(MUTATION_STEP.TRANSFORM_CONVERT_NULL_TO_UNDEFINED),
      ).toBe(false);
    });

    it("should be a ReadonlySet", () => {
      expect(INSIGNIFICANT_MUTATION_STEPS).toBeInstanceOf(Set);
      expect(INSIGNIFICANT_MUTATION_STEPS.size).toBe(2);
      // ReadonlySet provides compile-time immutability, not runtime protection
      // In a constants file, this is acceptable as the Set is not exported as mutable
    });
  });
});
