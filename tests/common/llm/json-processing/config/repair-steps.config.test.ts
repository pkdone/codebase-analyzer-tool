import {
  REPAIR_STEP,
  REPAIR_STEP_TEMPLATE,
  INSIGNIFICANT_REPAIR_STEPS,
} from "../../../../../src/common/llm/json-processing/constants/repair-steps.config";

describe("repair-steps.config", () => {
  describe("REPAIR_STEP", () => {
    it("should contain all expected sanitization step descriptions", () => {
      expect(REPAIR_STEP.TRIMMED_WHITESPACE).toBe("Trimmed whitespace");
      expect(REPAIR_STEP.REMOVED_CODE_FENCES).toBe("Removed code fences");
      expect(REPAIR_STEP.REMOVED_CONTROL_CHARS).toBe("Removed control / zero-width characters");
      expect(REPAIR_STEP.EXTRACTED_LARGEST_JSON_SPAN).toBe("Extracted largest JSON span");
      expect(REPAIR_STEP.COLLAPSED_DUPLICATE_JSON).toBe("Collapsed duplicate JSON object");
      expect(REPAIR_STEP.REMOVED_TRAILING_COMMAS).toBe("Removed trailing commas");
      expect(REPAIR_STEP.FIXED_OVER_ESCAPED_SEQUENCES).toBe("Fixed over-escaped sequences");
      expect(REPAIR_STEP.COMPLETED_TRUNCATED_STRUCTURES).toBe(
        "Completed truncated JSON structures",
      );
    });

    it("should contain all expected transform step descriptions", () => {
      expect(REPAIR_STEP.TRANSFORM_REMOVE_INCOMPLETE_ARRAY_ITEMS).toBe(
        "removeIncompleteArrayItems",
      );
      expect(REPAIR_STEP.TRANSFORM_COERCE_STRING_TO_ARRAY).toBe("coerceStringToArray");
      expect(REPAIR_STEP.TRANSFORM_CONVERT_NULL_TO_UNDEFINED).toBe("convertNullToUndefined");
      expect(REPAIR_STEP.TRANSFORM_FIX_COMMON_PROPERTY_NAME_TYPOS).toBe(
        "fixCommonPropertyNameTypos",
      );
      expect(REPAIR_STEP.TRANSFORM_COERCE_NUMERIC_PROPERTIES).toBe("coerceNumericProperties");
      expect(REPAIR_STEP.TRANSFORM_UNWRAP_JSON_SCHEMA_STRUCTURE).toBe("unwrapJsonSchemaStructure");
    });

    it("should be frozen to prevent mutations", () => {
      expect(() => {
        (REPAIR_STEP as any).TRIMMED_WHITESPACE = "Modified";
      }).toThrow();
    });
  });

  describe("REPAIR_STEP_TEMPLATE", () => {
    describe("fixedConcatenationChains", () => {
      it("should handle singular form", () => {
        expect(REPAIR_STEP_TEMPLATE.fixedConcatenationChains(1)).toBe(
          "Fixed 1 concatenation chain",
        );
      });

      it("should handle plural form", () => {
        expect(REPAIR_STEP_TEMPLATE.fixedConcatenationChains(2)).toBe(
          "Fixed 2 concatenation chains",
        );
        expect(REPAIR_STEP_TEMPLATE.fixedConcatenationChains(0)).toBe(
          "Fixed 0 concatenation chains",
        );
      });
    });

    describe("addedMissingCommas", () => {
      it("should handle singular form", () => {
        expect(REPAIR_STEP_TEMPLATE.addedMissingCommas(1)).toBe(
          "Added 1 missing comma between properties",
        );
      });

      it("should handle plural form", () => {
        expect(REPAIR_STEP_TEMPLATE.addedMissingCommas(2)).toBe(
          "Added 2 missing commas between properties",
        );
        expect(REPAIR_STEP_TEMPLATE.addedMissingCommas(0)).toBe(
          "Added 0 missing commas between properties",
        );
      });
    });

    describe("fixedMismatchedDelimiters", () => {
      it("should handle singular form", () => {
        expect(REPAIR_STEP_TEMPLATE.fixedMismatchedDelimiters(1)).toBe(
          "Fixed 1 mismatched delimiter",
        );
      });

      it("should handle plural form", () => {
        expect(REPAIR_STEP_TEMPLATE.fixedMismatchedDelimiters(2)).toBe(
          "Fixed 2 mismatched delimiters",
        );
        expect(REPAIR_STEP_TEMPLATE.fixedMismatchedDelimiters(0)).toBe(
          "Fixed 0 mismatched delimiters",
        );
      });
    });

    it("should be frozen to prevent mutations", () => {
      expect(() => {
        (REPAIR_STEP_TEMPLATE as any).fixedConcatenationChains = () => "Modified";
      }).toThrow();
    });
  });

  describe("INSIGNIFICANT_REPAIR_STEPS", () => {
    it("should contain expected insignificant steps", () => {
      expect(INSIGNIFICANT_REPAIR_STEPS.has(REPAIR_STEP.TRIMMED_WHITESPACE)).toBe(true);
      expect(INSIGNIFICANT_REPAIR_STEPS.has(REPAIR_STEP.REMOVED_CODE_FENCES)).toBe(true);
    });

    it("should not contain significant sanitization steps", () => {
      expect(INSIGNIFICANT_REPAIR_STEPS.has(REPAIR_STEP.REMOVED_CONTROL_CHARS)).toBe(false);
      expect(INSIGNIFICANT_REPAIR_STEPS.has(REPAIR_STEP.EXTRACTED_LARGEST_JSON_SPAN)).toBe(false);
    });

    it("should not contain any transform steps (all transforms are significant)", () => {
      expect(
        INSIGNIFICANT_REPAIR_STEPS.has(REPAIR_STEP.TRANSFORM_REMOVE_INCOMPLETE_ARRAY_ITEMS),
      ).toBe(false);
      expect(INSIGNIFICANT_REPAIR_STEPS.has(REPAIR_STEP.TRANSFORM_COERCE_STRING_TO_ARRAY)).toBe(
        false,
      );
      expect(INSIGNIFICANT_REPAIR_STEPS.has(REPAIR_STEP.TRANSFORM_CONVERT_NULL_TO_UNDEFINED)).toBe(
        false,
      );
    });

    it("should be a ReadonlySet", () => {
      expect(INSIGNIFICANT_REPAIR_STEPS).toBeInstanceOf(Set);
      expect(INSIGNIFICANT_REPAIR_STEPS.size).toBe(2);
      // ReadonlySet provides compile-time immutability, not runtime protection
      // In a constants file, this is acceptable as the Set is not exported as mutable
    });
  });
});
